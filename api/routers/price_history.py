from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.db.database import get_supabase
from api.schemas.responses import PriceHistoryEntry, PriceHistoryResponse

router = APIRouter(prefix="/price-history", tags=["prices"])


@router.get(
    "",
    response_model=PriceHistoryResponse,
    summary="Get historical price records",
    description=(
        "Returns wholesale price records for a vegetable over the last **N days** "
        "(default 30, max 365), sorted newest-first. Also returns summary statistics: "
        "average, minimum, and maximum modal price over the period.\n\n"
        "Optionally filter by market name.\n\n"
        "**Example:** `GET /price-history?vegetable=tomato&days=30&market=koyambedu`"
    ),
    response_description="Historical price records with period statistics",
)
async def price_history(
    vegetable: str = Query(..., description="Vegetable name (e.g. `tomato`)", examples=["tomato"]),
    days: int = Query(30, ge=1, le=365, description="Number of past days to fetch (1–365)", examples=[30]),
    market: str | None = Query(None, description="Filter by market name", examples=["koyambedu"]),
):
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    veg = vegetable.lower().replace(" ", "_")

    try:
        supabase = get_supabase()
        query = (
            supabase.table("price_records")
            .select("date,market_name,min_price,max_price,modal_price")
            .eq("vegetable_name", veg)
            .gte("date", cutoff)
            .order("date", desc=True)
            .limit(days * 10)  # allow multiple markets per day
        )
        if market:
            query = query.ilike("market_name", f"%{market}%")

        result = query.execute()
        rows = result.data or []
    except Exception as exc:
        logger.error(f"Price history fetch failed: {exc}")
        raise HTTPException(status_code=502, detail="Failed to fetch price history from database")

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No price records found for '{vegetable}' in the last {days} days",
        )

    records = [
        PriceHistoryEntry(
            date=r["date"],
            market_name=r.get("market_name"),
            min_price=r.get("min_price"),
            max_price=r.get("max_price"),
            modal_price=r["modal_price"],
        )
        for r in rows
    ]

    modal_prices = [r.modal_price for r in records]
    avg_price = round(sum(modal_prices) / len(modal_prices), 2)
    min_price = round(min(modal_prices), 2)
    max_price = round(max(modal_prices), 2)

    return PriceHistoryResponse(
        vegetable=veg,
        market=market,
        days=days,
        records=records,
        avg_modal_price=avg_price,
        min_modal_price=min_price,
        max_modal_price=max_price,
    )
