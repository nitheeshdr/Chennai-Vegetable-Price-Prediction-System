from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


class PredictionResponse(BaseModel):
    vegetable: str = Field(..., description="Vegetable name (snake_case)", examples=["tomato"])
    prediction_date: str = Field(..., description="Date for which the price is predicted (YYYY-MM-DD)", examples=["2026-04-19"])
    current_price: Optional[float] = Field(None, description="Latest known market price (Rs/kg)", examples=[45.0])
    predicted_price: float = Field(..., description="Model-predicted price for prediction_date (Rs/kg)", examples=[48.5])
    confidence_lower: float = Field(..., description="Lower bound of the 95 % confidence interval (Rs/kg)", examples=[43.0])
    confidence_upper: float = Field(..., description="Upper bound of the 95 % confidence interval (Rs/kg)", examples=[54.0])
    trend: str = Field(..., description="Price trend relative to current price: 'up', 'down', or 'stable'", examples=["up"])
    trend_emoji: str = Field(..., description="Unicode arrow indicating trend direction", examples=["↑"])
    model_name: str = Field(..., description="Name of the ML model that produced this prediction", examples=["xgboost"])

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "vegetable": "tomato",
                    "prediction_date": "2026-04-19",
                    "current_price": 45.0,
                    "predicted_price": 48.5,
                    "confidence_lower": 43.0,
                    "confidence_upper": 54.0,
                    "trend": "up",
                    "trend_emoji": "↑",
                    "model_name": "xgboost",
                }
            ]
        }
    }

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
    vegetable: str = Field(..., description="Vegetable name (snake_case)", examples=["tomato"])
    date: str = Field(..., description="Date of the price record (YYYY-MM-DD)", examples=["2026-04-18"])
    market_name: Optional[str] = Field(None, description="Market where the price was recorded", examples=["koyambedu"])
    min_price: Optional[float] = Field(None, description="Minimum wholesale price on that date (Rs/kg)", examples=[40.0])
    max_price: Optional[float] = Field(None, description="Maximum wholesale price on that date (Rs/kg)", examples=[55.0])
    modal_price: float = Field(..., description="Most common (modal) transaction price (Rs/kg)", examples=[45.0])
    unit: str = Field("Rs/kg", description="Unit of price measurement")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "vegetable": "tomato",
                    "date": "2026-04-18",
                    "market_name": "koyambedu",
                    "min_price": 40.0,
                    "max_price": 55.0,
                    "modal_price": 45.0,
                    "unit": "Rs/kg",
                }
            ]
        }
    }


class ScanResponse(BaseModel):
    vegetable_detected: str = Field(..., description="Top-1 vegetable identified by the vision model", examples=["tomato"])
    confidence: float = Field(..., description="Confidence score of the top-1 prediction (0–1)", examples=[0.93])
    top_k: list[dict] = Field(..., description="Top-K predictions with label and score")
    prediction: Optional[PredictionResponse] = Field(None, description="Next-day price prediction for the detected vegetable")
    current_price: Optional[CurrentPriceResponse] = Field(None, description="Latest market price for the detected vegetable")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "vegetable_detected": "tomato",
                    "confidence": 0.93,
                    "top_k": [
                        {"label": "tomato", "score": 0.93},
                        {"label": "cherry_tomato", "score": 0.05},
                    ],
                    "prediction": None,
                    "current_price": None,
                }
            ]
        }
    }


class WeeklyForecastResponse(BaseModel):
    vegetable: str = Field(..., description="Vegetable name (snake_case)", examples=["tomato"])
    market: Optional[str] = Field(None, description="Market filter applied, or null for city-wide average", examples=["koyambedu"])
    forecast: list[PredictionResponse] = Field(..., description="7-day list of daily price predictions")


class MarketComparisonResponse(BaseModel):
    vegetable: str = Field(..., description="Vegetable name (snake_case)", examples=["tomato"])
    markets: list[dict] = Field(..., description="List of markets with their current modal prices")
    cheapest_market: str = Field(..., description="Market with the lowest modal price today", examples=["parrys"])
    cheapest_price: float = Field(..., description="Lowest modal price across all markets (Rs/kg)", examples=[38.0])

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "vegetable": "tomato",
                    "markets": [
                        {"market": "koyambedu", "modal_price": 45.0},
                        {"market": "parrys", "modal_price": 38.0},
                    ],
                    "cheapest_market": "parrys",
                    "cheapest_price": 38.0,
                }
            ]
        }
    }


class AlertResponse(BaseModel):
    id: str = Field(..., description="Unique alert identifier (UUID)", examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"])
    vegetable_name: str = Field(..., description="Vegetable being monitored", examples=["tomato"])
    threshold_price: float = Field(..., description="Price threshold that triggers the alert (Rs/kg)", examples=[50.0])
    direction: str = Field(..., description="Alert fires when price goes 'above' or 'below' the threshold", examples=["above"])
    market_name: Optional[str] = Field(None, description="Market to monitor, or null for any market", examples=["koyambedu"])
    is_active: bool = Field(..., description="Whether the alert is currently active")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "vegetable_name": "tomato",
                    "threshold_price": 50.0,
                    "direction": "above",
                    "market_name": "koyambedu",
                    "is_active": True,
                }
            ]
        }
    }


class DashboardResponse(BaseModel):
    total_vegetables: int = Field(..., description="Total number of vegetables with active predictions", examples=[12])
    markets_tracked: int = Field(..., description="Number of distinct markets with price data", examples=[5])
    last_updated: str = Field(..., description="ISO-8601 timestamp of the last data refresh", examples=["2026-04-18T06:00:00Z"])
    top_rising: list[dict] = Field(..., description="Top vegetables with the highest predicted price increase today")
    top_falling: list[dict] = Field(..., description="Top vegetables with the highest predicted price decrease today")
    all_predictions: list[PredictionResponse] = Field(..., description="Next-day predictions for all tracked vegetables")


# ── Weather ───────────────────────────────────────────────────────────────────
class WeatherResponse(BaseModel):
    city: str = Field(..., description="City name", examples=["Chennai"])
    temperature_c: float = Field(..., description="Current temperature in Celsius", examples=[34.2])
    humidity_pct: int = Field(..., description="Relative humidity (%)", examples=[72])
    wind_speed_kmh: float = Field(..., description="Wind speed in km/h", examples=[18.5])
    precipitation_mm: float = Field(..., description="Precipitation in the last hour (mm)", examples=[0.0])
    condition: str = Field(..., description="Human-readable weather condition", examples=["Partly Cloudy"])
    weather_impact: str = Field(
        ...,
        description="Estimated impact of current weather on vegetable prices",
        examples=["High humidity may increase perishable prices slightly"],
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "city": "Chennai",
                    "temperature_c": 34.2,
                    "humidity_pct": 72,
                    "wind_speed_kmh": 18.5,
                    "precipitation_mm": 0.0,
                    "condition": "Partly Cloudy",
                    "weather_impact": "High humidity may increase perishable prices slightly",
                }
            ]
        }
    }


# ── Vegetables list ───────────────────────────────────────────────────────────
class VegetableInfo(BaseModel):
    name: str = Field(..., description="Canonical vegetable name (snake_case)", examples=["tomato"])
    aliases: list[str] = Field(..., description="Alternative names used in datasets", examples=[["Tomato", "TOMATO"]])
    unit: str = Field(..., description="Unit of measurement", examples=["kg"])
    typical_price_min: float = Field(..., description="Typical minimum price (Rs/unit)", examples=[10.0])
    typical_price_max: float = Field(..., description="Typical maximum price (Rs/unit)", examples=[120.0])


class VegetablesListResponse(BaseModel):
    total: int = Field(..., description="Total number of supported vegetables", examples=[20])
    vegetables: list[VegetableInfo] = Field(..., description="List of all supported vegetables with metadata")


# ── AI prediction ─────────────────────────────────────────────────────────────
class AIPredictionResponse(BaseModel):
    vegetable: str = Field(..., description="Vegetable name", examples=["tomato"])
    prediction_date: str = Field(..., description="Date for which the price is predicted (YYYY-MM-DD)", examples=["2026-04-19"])
    predicted_price: float = Field(..., description="AI-predicted price (Rs/kg)", examples=[52.0])
    reasoning: str = Field(..., description="Natural-language explanation from the AI model", examples=["Based on seasonal trends and recent rainfall, tomato prices are expected to rise."])
    model: str = Field(..., description="AI model used for this prediction", examples=["meta/llama-3.1-8b-instruct"])
    factors_considered: list[str] = Field(..., description="Key factors the AI considered", examples=[["seasonality", "rainfall", "supply-demand"]])

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "vegetable": "tomato",
                    "prediction_date": "2026-04-19",
                    "predicted_price": 52.0,
                    "reasoning": "Based on seasonal patterns and current weather conditions, tomato supply may tighten.",
                    "model": "meta/llama-3.1-8b-instruct",
                    "factors_considered": ["seasonality", "weather", "historical_trends"],
                }
            ]
        }
    }


# ── Price history ─────────────────────────────────────────────────────────────
class PriceHistoryEntry(BaseModel):
    date: str = Field(..., description="Date of the price record (YYYY-MM-DD)", examples=["2026-04-18"])
    market_name: Optional[str] = Field(None, description="Market name", examples=["koyambedu"])
    min_price: Optional[float] = Field(None, description="Minimum price on that date (Rs/kg)", examples=[38.0])
    max_price: Optional[float] = Field(None, description="Maximum price on that date (Rs/kg)", examples=[55.0])
    modal_price: float = Field(..., description="Modal (most common) price (Rs/kg)", examples=[45.0])


class PriceHistoryResponse(BaseModel):
    vegetable: str = Field(..., description="Vegetable name (snake_case)", examples=["tomato"])
    market: Optional[str] = Field(None, description="Market filter applied, or null for all markets", examples=["koyambedu"])
    days: int = Field(..., description="Number of days of history returned", examples=[30])
    records: list[PriceHistoryEntry] = Field(..., description="Historical price records ordered newest first")
    avg_modal_price: float = Field(..., description="Average modal price over the period (Rs/kg)", examples=[43.5])
    min_modal_price: float = Field(..., description="Lowest modal price in the period (Rs/kg)", examples=[30.0])
    max_modal_price: float = Field(..., description="Highest modal price in the period (Rs/kg)", examples=[65.0])
