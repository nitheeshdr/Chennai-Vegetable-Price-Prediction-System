from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from api.schemas.responses import CurrentPriceResponse, MarketComparisonResponse
from api.services.price_service import get_current_price, get_market_comparison

router = APIRouter(prefix="/get-current-price", tags=["prices"])


@router.get(
    "",
    response_model=CurrentPriceResponse,
    summary="Get current market price",
    description=(
        "Returns the most recent wholesale price for a vegetable recorded in the APMC database. "
        "Pass an optional `market` parameter to filter by a specific market; "
        "otherwise the city-wide modal price is returned.\n\n"
        "**Example:** `GET /get-current-price?vegetable=tomato&market=koyambedu`"
    ),
    response_description="Latest price record including min, max, and modal price",
)
async def current_price(
    vegetable: str = Query(..., description="Vegetable name (e.g. `tomato`)", examples=["tomato"]),
    market: str | None = Query(None, description="Market name filter (e.g. `koyambedu`)", examples=["koyambedu"]),
):
    result = await get_current_price(vegetable.lower().replace(" ", "_"), market)
    if result is None:
        raise HTTPException(status_code=404, detail=f"No price data found for '{vegetable}'")
    return result


@router.get(
    "/market-comparison",
    response_model=MarketComparisonResponse,
    summary="Compare prices across all markets",
    description=(
        "Compares the current modal price for a vegetable across every tracked Chennai market "
        "and identifies the cheapest option.\n\n"
        "**Example:** `GET /get-current-price/market-comparison?vegetable=tomato`"
    ),
    response_description="Per-market prices plus the cheapest market and its price",
)
async def market_comparison(
    vegetable: str = Query(..., description="Vegetable name (e.g. `tomato`)", examples=["tomato"]),
):
    return await get_market_comparison(vegetable.lower().replace(" ", "_"))
