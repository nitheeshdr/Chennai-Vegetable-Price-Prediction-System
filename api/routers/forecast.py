from __future__ import annotations

from fastapi import APIRouter, Query
from api.schemas.responses import WeeklyForecastResponse
from api.services.prediction_service import get_weekly_forecast
import asyncio

router = APIRouter(prefix="/weekly-forecast", tags=["forecast"])


@router.get("", response_model=WeeklyForecastResponse)
async def weekly_forecast(
    vegetable: str = Query(...),
    market: str | None = Query(None),
):
    return await get_weekly_forecast(vegetable.lower().replace(" ", "_"), market)



