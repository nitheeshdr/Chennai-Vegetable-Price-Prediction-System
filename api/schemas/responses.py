from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class PredictionResponse(BaseModel):
    vegetable: str
    prediction_date: str
    current_price: Optional[float] = None
    predicted_price: float
    confidence_lower: float
    confidence_upper: float
    trend: str  # "up" | "down" | "stable"
    trend_emoji: str
    model_name: str

    @classmethod
    def from_result(cls, result, current_price: float | None = None):
        emoji = {"up": "↑", "down": "↓", "stable": "→"}.get(result.trend, "→")
        return cls(
            vegetable=result.vegetable,
            prediction_date=result.prediction_date,
            current_price=current_price,
            predicted_price=result.predicted_price,
            confidence_lower=result.confidence_lower,
            confidence_upper=result.confidence_upper,
            trend=result.trend,
            trend_emoji=emoji,
            model_name=result.model_name,
        )


class CurrentPriceResponse(BaseModel):
    vegetable: str
    date: str
    market_name: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    modal_price: float
    unit: str = "Rs/kg"


class ScanResponse(BaseModel):
    vegetable_detected: str
    confidence: float
    top_k: list[dict]
    prediction: Optional[PredictionResponse] = None
    current_price: Optional[CurrentPriceResponse] = None


class WeeklyForecastResponse(BaseModel):
    vegetable: str
    market: Optional[str] = None
    forecast: list[PredictionResponse]


class MarketComparisonResponse(BaseModel):
    vegetable: str
    markets: list[dict]
    cheapest_market: str
    cheapest_price: float


class AlertResponse(BaseModel):
    id: str
    vegetable_name: str
    threshold_price: float
    direction: str  # "above" | "below"
    market_name: Optional[str] = None
    is_active: bool


class DashboardResponse(BaseModel):
    total_vegetables: int
    markets_tracked: int
    last_updated: str
    top_rising: list[dict]
    top_falling: list[dict]
    all_predictions: list[PredictionResponse]
