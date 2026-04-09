"""
Vercel serverless entry point for Chennai Vegetable Price API.
Reads live prices from Supabase. No ML models loaded (size limit).
"""
from __future__ import annotations

import math
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Chennai Vegetable Price API",
    version="1.0.0",
    description="Live vegetable prices and predictions for Chennai markets.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Supabase (lazy init) ──────────────────────────────────────────────────────
_sb = None

def supabase():
    global _sb
    if _sb is None:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
        if not url or not key:
            raise HTTPException(500, "Supabase credentials not configured")
        _sb = create_client(url, key)
    return _sb


# ── Helpers ───────────────────────────────────────────────────────────────────
VEGETABLES = [
    "tomato", "onion", "potato", "garlic", "ginger", "green_chilli",
    "brinjal", "cabbage", "carrot", "cauliflower", "beans", "bitter_gourd",
    "bottle_gourd", "coriander", "drumstick", "ladies_finger", "raw_banana", "tapioca",
]

def _modal_price(vegetable: str, market: Optional[str] = None) -> Optional[float]:
    try:
        q = (
            supabase().table("price_records")
            .select("modal_price")
            .eq("vegetable_name", vegetable)
            .order("date", desc=True)
            .limit(5)
        )
        if market:
            q = q.ilike("market_name", f"%{market}%")
        rows = q.execute().data
        return rows[0]["modal_price"] if rows else None
    except HTTPException:
        raise
    except Exception:
        return None


def _trend(current: Optional[float], predicted: float, threshold: float = 0.03) -> str:
    if current is None:
        return "stable"
    if predicted > current * (1 + threshold):
        return "up"
    if predicted < current * (1 - threshold):
        return "down"
    return "stable"


def _seasonal(month: int, days_ahead: int = 0) -> float:
    """Simple seasonal price multiplier based on Indian harvest cycles."""
    return 1.0 + 0.04 * math.sin(2 * math.pi * (month + days_ahead / 30 - 3) / 12)


def _make_prediction(veg: str, market: Optional[str], days_ahead: int = 1) -> dict:
    current = _modal_price(veg, market)
    target_date = date.today() + timedelta(days=days_ahead)
    factor = _seasonal(target_date.month, days_ahead)
    predicted = round((current or 0) * factor, 2) if current else None
    if predicted is None:
        raise HTTPException(404, f"No price data for '{veg}'")
    trend = _trend(current, predicted)
    return {
        "vegetable": veg,
        "prediction_date": str(target_date),
        "current_price": current,
        "predicted_price": predicted,
        "confidence_lower": round(predicted * 0.88, 2),
        "confidence_upper": round(predicted * 1.12, 2),
        "trend": trend,
        "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(trend, "→"),
        "model_name": "seasonal_ensemble",
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "platform": "vercel"}


@app.get("/")
def root():
    return {"message": "Chennai Vegetable Price API", "docs": "/docs"}


@app.get("/get-current-price")
def current_price(
    vegetable: str = Query(...),
    market: Optional[str] = Query(None),
):
    veg = vegetable.lower().replace(" ", "_")
    try:
        q = (
            supabase().table("price_records")
            .select("date,market_name,min_price,max_price,modal_price")
            .eq("vegetable_name", veg)
            .order("date", desc=True)
            .limit(5)
        )
        if market:
            q = q.ilike("market_name", f"%{market}%")
        rows = q.execute().data
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Database error: {exc}")

    if not rows:
        raise HTTPException(404, f"No price data for '{vegetable}'")
    row = rows[0]
    return {
        "vegetable": veg,
        "date": row["date"],
        "market_name": row.get("market_name"),
        "min_price": row.get("min_price"),
        "max_price": row.get("max_price"),
        "modal_price": row["modal_price"],
        "unit": "Rs/kg",
    }


@app.get("/get-current-price/market-comparison")
def market_comparison(vegetable: str = Query(...)):
    veg = vegetable.lower().replace(" ", "_")
    try:
        rows = (
            supabase().table("price_records")
            .select("market_name,modal_price,date")
            .eq("vegetable_name", veg)
            .order("date", desc=True)
            .limit(100)
            .execute()
            .data or []
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Database error: {exc}")

    seen: dict = {}
    for row in rows:
        m = row.get("market_name", "Unknown")
        if m not in seen:
            seen[m] = row
    markets = sorted(seen.values(), key=lambda x: x["modal_price"])
    cheapest = markets[0] if markets else {}
    return {
        "vegetable": veg,
        "markets": [{"market": m["market_name"], "price": m["modal_price"]} for m in markets],
        "cheapest_market": cheapest.get("market_name", "N/A"),
        "cheapest_price": cheapest.get("modal_price", 0.0),
    }


@app.get("/predict")
def predict(
    vegetable: str = Query(...),
    market: Optional[str] = Query(None),
):
    veg = vegetable.lower().replace(" ", "_")
    # Check stored predictions first
    try:
        rows = (
            supabase().table("predictions")
            .select("*")
            .eq("vegetable_name", veg)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
        )
        if rows:
            row = rows[0]
            current = _modal_price(veg, market)
            trend = _trend(current, row["predicted_price"])
            return {
                "vegetable": veg,
                "prediction_date": row["prediction_date"],
                "current_price": current,
                "predicted_price": row["predicted_price"],
                "confidence_lower": row.get("confidence_lower") or round(row["predicted_price"] * 0.9, 2),
                "confidence_upper": row.get("confidence_upper") or round(row["predicted_price"] * 1.1, 2),
                "trend": trend,
                "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(trend, "→"),
                "model_name": row.get("model_used", "ensemble"),
            }
    except HTTPException:
        raise
    except Exception:
        pass  # fall through to seasonal baseline

    return _make_prediction(veg, market, days_ahead=1)


@app.get("/weekly-forecast")
def weekly_forecast(
    vegetable: str = Query(...),
    market: Optional[str] = Query(None),
):
    veg = vegetable.lower().replace(" ", "_")
    forecasts = [_make_prediction(veg, market, days_ahead=i) for i in range(1, 8)]
    return {"vegetable": veg, "market": market, "forecast": forecasts}


@app.get("/dashboard")
def dashboard():
    all_predictions = []
    for veg in VEGETABLES:
        try:
            pred = _make_prediction(veg, None, days_ahead=1)
            pred["change_pct"] = round(
                (pred["predicted_price"] - (pred["current_price"] or pred["predicted_price"]))
                / (pred["current_price"] or pred["predicted_price"]) * 100, 1
            )
            all_predictions.append(pred)
        except HTTPException:
            continue

    rising  = sorted([p for p in all_predictions if p["trend"] == "up"],
                     key=lambda x: x["change_pct"], reverse=True)[:5]
    falling = sorted([p for p in all_predictions if p["trend"] == "down"],
                     key=lambda x: x["change_pct"])[:5]

    return {
        "total_vegetables": len(all_predictions),
        "markets_tracked": 5,
        "last_updated": str(date.today()),
        "top_rising": rising,
        "top_falling": falling,
        "all_predictions": all_predictions,
    }
