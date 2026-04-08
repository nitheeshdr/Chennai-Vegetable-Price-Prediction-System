from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from api.schemas.responses import CurrentPriceResponse, MarketComparisonResponse
from api.services.price_service import get_current_price, get_market_comparison

router = APIRouter(prefix="/get-current-price", tags=["prices"])


@router.get("", response_model=CurrentPriceResponse)
async def current_price(
    vegetable: str = Query(..., description="Vegetable name"),
    market: str | None = Query(None, description="Market name filter"),
):
    result = await get_current_price(vegetable.lower().replace(" ", "_"), market)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No price data found for '{vegetable}'")
    return result


@router.get("/market-comparison", response_model=MarketComparisonResponse)
async def market_comparison(vegetable: str = Query(...)):
    return await get_market_comparison(vegetable.lower().replace(" ", "_"))
