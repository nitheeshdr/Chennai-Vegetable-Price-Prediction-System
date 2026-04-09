from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from api.schemas.responses import PredictionResponse
from api.services.prediction_service import get_prediction_sync

router = APIRouter(prefix="/predict", tags=["predictions"])


@router.get("", response_model=PredictionResponse)
def predict_price(
    vegetable: str = Query(..., description="Vegetable name e.g. tomato"),
    market: str | None = Query(None, description="Market name e.g. koyambedu"),
):
    result = get_prediction_sync(vegetable.lower().replace(" ", "_"), market)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No prediction available for '{vegetable}'. "
                   "Ensure models are trained: python scripts/train_models.py",
        )
    return result
