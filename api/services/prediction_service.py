from __future__ import annotations

import json
import os
from datetime import date
from pathlib import Path

import redis.asyncio as aioredis
from loguru import logger

from api.config import settings
from api.schemas.responses import PredictionResponse, WeeklyForecastResponse
from src.pipeline.inference_pipeline import InferencePipeline

_pipeline: InferencePipeline | None = None
_redis: aioredis.Redis | None = None


def _get_pipeline() -> InferencePipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = InferencePipeline(Path(settings.model_artifacts_path))
    return _pipeline


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def get_prediction(
    vegetable: str,
    market: str | None = None,
    prediction_date: date | None = None,
) -> PredictionResponse | None:
    cache_key = f"pred:{vegetable}:{market}:{prediction_date or 'tomorrow'}"
    redis = await _get_redis()

    cached = await redis.get(cache_key)
    if cached:
        return PredictionResponse(**json.loads(cached))

    pipeline = _get_pipeline()
    result = pipeline.predict(vegetable, market, prediction_date)
    if result is None:
        return None

    current_price = pipeline._get_current_price(vegetable, market)
    response = PredictionResponse.from_result(result, current_price)

    await redis.setex(cache_key, 3600, response.model_dump_json())
    return response


async def get_weekly_forecast(
    vegetable: str, market: str | None = None
) -> WeeklyForecastResponse:
    pipeline = _get_pipeline()
    results = pipeline.predict_weekly(vegetable, market)
    current = pipeline._get_current_price(vegetable, market)
    forecasts = [PredictionResponse.from_result(r, current) for r in results]
    return WeeklyForecastResponse(vegetable=vegetable, market=market, forecast=forecasts)
