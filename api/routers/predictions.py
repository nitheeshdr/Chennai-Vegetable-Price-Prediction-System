from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from api.schemas.responses import PredictionResponse
from api.services.prediction_service import get_prediction_sync

router = APIRouter(prefix="/predict", tags=["predictions"])


@router.get(
    "",
    response_model=PredictionResponse,
    summary="Get next-day price prediction",
    description=(
        "Returns the ML-predicted price for a vegetable on the next market day, "
        "along with a 95 % confidence interval and trend direction.\n\n"
        "The prediction is produced by an ensemble of **XGBoost**, **LightGBM**, and **Prophet** "
        "models trained on historical APMC (Chennai) wholesale price data.\n\n"
        "**Example:** `GET /predict?vegetable=tomato&market=koyambedu`"
    ),
    response_description="Next-day price prediction with confidence interval and trend",
)
def predict_price(
    vegetable: str = Query(..., description="Vegetable name (e.g. `tomato`, `onion`, `potato`)", examples=["tomato"]),
    market: str | None = Query(None, description="Market name filter (e.g. `koyambedu`). Omit for city-wide average.", examples=["koyambedu"]),
):
    result = get_prediction_sync(vegetable.lower().replace(" ", "_"), market)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No prediction available for '{vegetable}'. "
                   "Ensure models are trained: python scripts/train_models.py",
        )
    return result
