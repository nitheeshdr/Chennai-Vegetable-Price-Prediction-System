from __future__ import annotations

from fastapi import APIRouter, Query
from api.schemas.responses import WeeklyForecastResponse
from api.services.prediction_service import get_weekly_forecast
import asyncio

router = APIRouter(prefix="/weekly-forecast", tags=["forecast"])


@router.get(
    "",
    response_model=WeeklyForecastResponse,
    summary="Get 7-day price forecast",
    description=(
        "Returns a 7-day rolling price forecast for a vegetable using the same ML ensemble "
        "(XGBoost · LightGBM · Prophet) as the single-day prediction endpoint. "
        "Each day's entry includes a confidence interval and trend indicator.\n\n"
        "**Example:** `GET /weekly-forecast?vegetable=tomato&market=koyambedu`"
    ),
    response_description="List of 7 daily price predictions with confidence intervals",
)
async def weekly_forecast(
    vegetable: str = Query(..., description="Vegetable name (e.g. `tomato`)", examples=["tomato"]),
    market: str | None = Query(None, description="Market name filter. Omit for city-wide average.", examples=["koyambedu"]),
):
    return await get_weekly_forecast(vegetable.lower().replace(" ", "_"), market)
