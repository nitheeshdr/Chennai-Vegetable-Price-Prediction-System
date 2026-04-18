from __future__ import annotations

from datetime import date
from pathlib import Path

import yaml
from fastapi import APIRouter
from loguru import logger

from api.config import settings
from api.schemas.responses import DashboardResponse, PredictionResponse
from api.services.prediction_service import get_prediction

router = APIRouter(prefix="/dashboard", tags=["analytics"])
VEGETABLES_CONFIG = Path("config/vegetables.yaml")


def _load_vegetable_names() -> list[str]:
    with open(VEGETABLES_CONFIG) as f:
        cfg = yaml.safe_load(f)
    return [v["name"] for v in cfg["vegetables"]]


@router.get(
    "",
    response_model=DashboardResponse,
    summary="Get analytics dashboard",
    description=(
        "Returns an aggregated snapshot of the current market:\n\n"
        "- Total vegetables and markets tracked\n"
        "- Top 5 vegetables with the highest predicted price **increase** today\n"
        "- Top 5 vegetables with the highest predicted price **decrease** today\n"
        "- Next-day predictions for all tracked vegetables\n\n"
        "Data is computed on-the-fly from the latest ML predictions."
    ),
    response_description="Dashboard summary with rising/falling vegetables and all predictions",
)
async def dashboard():
    vegetables = _load_vegetable_names()
    predictions: list[PredictionResponse] = []
    rising, falling = [], []

    for veg in vegetables:
        try:
            pred = await get_prediction(veg)
            if pred:
                predictions.append(pred)
                if pred.current_price:
                    pct = (pred.predicted_price - pred.current_price) / pred.current_price * 100
                    entry = {
                        "vegetable": veg,
                        "current_price": pred.current_price,
                        "predicted_price": pred.predicted_price,
                        "change_pct": round(pct, 1),
                    }
                    if pred.trend == "up":
                        rising.append(entry)
                    elif pred.trend == "down":
                        falling.append(entry)
        except Exception as exc:
            logger.debug(f"Dashboard skip {veg}: {exc}")

    rising_sorted = sorted(rising, key=lambda x: x["change_pct"], reverse=True)[:5]
    falling_sorted = sorted(falling, key=lambda x: x["change_pct"])[:5]

    return DashboardResponse(
        total_vegetables=len(predictions),
        markets_tracked=5,
        last_updated=date.today().isoformat(),
        top_rising=rising_sorted,
        top_falling=falling_sorted,
        all_predictions=predictions,
    )
