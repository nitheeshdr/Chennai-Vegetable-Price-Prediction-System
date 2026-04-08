from __future__ import annotations

import json
from datetime import date

import redis.asyncio as aioredis
from loguru import logger

from api.config import settings
from api.db.database import get_supabase
from api.schemas.responses import CurrentPriceResponse, MarketComparisonResponse

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def get_current_price(
    vegetable: str, market: str | None = None
) -> CurrentPriceResponse | None:
    cache_key = f"price:{vegetable}:{market}"
    redis = await _get_redis()
    cached = await redis.get(cache_key)
    if cached:
        return CurrentPriceResponse(**json.loads(cached))

    try:
        supabase = get_supabase()
        query = (
            supabase.table("price_records")
            .select("date,market_name,min_price,max_price,modal_price")
            .eq("vegetable_name", vegetable)
            .order("date", desc=True)
            .limit(10)
        )
        if market:
            query = query.ilike("market_name", f"%{market}%")
        result = query.execute()

        if not result.data:
            return None

        row = result.data[0]
        response = CurrentPriceResponse(
            vegetable=vegetable,
            date=row["date"],
            market_name=row.get("market_name"),
            min_price=row.get("min_price"),
            max_price=row.get("max_price"),
            modal_price=row["modal_price"],
        )
        await redis.setex(cache_key, 1800, response.model_dump_json())
        return response
    except Exception as exc:
        logger.error(f"Price fetch failed: {exc}")
        return None


async def get_market_comparison(vegetable: str) -> MarketComparisonResponse:
    try:
        supabase = get_supabase()
        result = (
            supabase.table("price_records")
            .select("market_name,modal_price,date")
            .eq("vegetable_name", vegetable)
            .order("date", desc=True)
            .limit(50)
            .execute()
        )
        data = result.data or []
        # Group by market, take latest price
        market_map: dict[str, dict] = {}
        for row in data:
            m = row.get("market_name", "Unknown")
            if m not in market_map:
                market_map[m] = row
        markets = sorted(market_map.values(), key=lambda x: x["modal_price"])
        cheapest = markets[0] if markets else {}
        return MarketComparisonResponse(
            vegetable=vegetable,
            markets=[{"market": m["market_name"], "price": m["modal_price"]} for m in markets],
            cheapest_market=cheapest.get("market_name", "N/A"),
            cheapest_price=cheapest.get("modal_price", 0.0),
        )
    except Exception as exc:
        logger.error(f"Market comparison failed: {exc}")
        return MarketComparisonResponse(
            vegetable=vegetable, markets=[], cheapest_market="N/A", cheapest_price=0.0
        )
