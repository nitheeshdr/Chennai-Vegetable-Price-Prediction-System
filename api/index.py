"""
Vercel serverless entry point.
Runs a lightweight version of the FastAPI app that:
 - Reads prices and cached predictions from Supabase
 - Does NOT load ML models (too large for Vercel's 250 MB limit)
 - Does NOT require Redis
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Disable ML-heavy routes so we don't hit Vercel's size/memory limits
os.environ["VERCEL"] = "1"

import os as _os
_os.environ.setdefault("OMP_NUM_THREADS", "1")

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import create_client
from loguru import logger
from datetime import date

# ── Supabase client ───────────────────────────────────────────────────────────
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
        _supabase = create_client(url, key)
    return _supabase


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Chennai Vegetable Price Prediction API",
    description="Live vegetable prices and next-day predictions for Chennai markets.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "platform": "vercel"}


@app.get("/")
def root():
    return {"message": "Chennai Vegetable Price API", "docs": "/docs"}


# ── Current price (from Supabase) ─────────────────────────────────────────────
@app.get("/get-current-price")
def current_price(
    vegetable: str = Query(...),
    market: str | None = Query(None),
):
    try:
        sb = get_supabase()
        q = (
            sb.table("price_records")
            .select("date,market_name,min_price,max_price,modal_price")
            .eq("vegetable_name", vegetable.lower().replace(" ", "_"))
            .order("date", desc=True)
            .limit(5)
        )
        if market:
            q = q.ilike("market_name", f"%{market}%")
        result = q.execute()
        if not result.data:
            raise HTTPException(404, f"No price data for '{vegetable}'")
        row = result.data[0]
        return {
            "vegetable": vegetable,
            "date": row["date"],
            "market_name": row.get("market_name"),
            "min_price": row.get("min_price"),
            "max_price": row.get("max_price"),
            "modal_price": row["modal_price"],
            "unit": "Rs/kg",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"current_price error: {exc}")
        raise HTTPException(500, "Database error")


# ── Prediction (from Supabase predictions table, or compute on-the-fly) ───────
@app.get("/predict")
def predict(
    vegetable: str = Query(...),
    market: str | None = Query(None),
):
    veg = vegetable.lower().replace(" ", "_")
    try:
        sb = get_supabase()

        # 1. Try stored predictions table first
        pred_result = (
            sb.table("predictions")
            .select("*")
            .eq("vegetable_name", veg)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if pred_result.data:
            row = pred_result.data[0]
            current = _get_modal_price(sb, veg, market)
            trend = _calc_trend(current, row["predicted_price"])
            return {
                "vegetable": veg,
                "prediction_date": row["prediction_date"],
                "current_price": current,
                "predicted_price": row["predicted_price"],
                "confidence_lower": row.get("confidence_lower", row["predicted_price"] * 0.9),
                "confidence_upper": row.get("confidence_upper", row["predicted_price"] * 1.1),
                "trend": trend,
                "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(trend, "→"),
                "model_name": row.get("model_used", "ensemble"),
            }

        # 2. Fallback: use last price as prediction + seasonal nudge
        current = _get_modal_price(sb, veg, market)
        if current is None:
            raise HTTPException(404, f"No data for '{vegetable}'")

        # Simple seasonal adjustment based on month
        import math
        month = date.today().month
        # Vegetables are typically cheaper in harvest months (Oct-Jan), pricier in summer
        seasonal_factor = 1.0 + 0.03 * math.sin(2 * math.pi * (month - 1) / 12)
        predicted = round(current * seasonal_factor, 2)
        trend = _calc_trend(current, predicted)

        return {
            "vegetable": veg,
            "prediction_date": str(date.today()),
            "current_price": current,
            "predicted_price": predicted,
            "confidence_lower": round(predicted * 0.9, 2),
            "confidence_upper": round(predicted * 1.1, 2),
            "trend": trend,
            "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(trend, "→"),
            "model_name": "seasonal_baseline",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"predict error: {exc}")
        raise HTTPException(500, "Prediction error")


# ── Weekly forecast ───────────────────────────────────────────────────────────
@app.get("/weekly-forecast")
def weekly_forecast(
    vegetable: str = Query(...),
    market: str | None = Query(None),
):
    import math
    veg = vegetable.lower().replace(" ", "_")
    sb = get_supabase()
    current = _get_modal_price(sb, veg, market)
    if current is None:
        raise HTTPException(404, f"No data for '{vegetable}'")

    forecasts = []
    for i in range(1, 8):
        d = date.today()
        from datetime import timedelta
        fd = d + timedelta(days=i)
        month = fd.month
        seasonal = 1.0 + 0.03 * math.sin(2 * math.pi * (month - 1) / 12)
        # Add slight daily noise decay
        noise = 1.0 + 0.005 * math.sin(2 * math.pi * i / 7)
        predicted = round(current * seasonal * noise, 2)
        trend = _calc_trend(current, predicted)
        forecasts.append({
            "vegetable": veg,
            "prediction_date": str(fd),
            "current_price": current,
            "predicted_price": predicted,
            "confidence_lower": round(predicted * 0.88, 2),
            "confidence_upper": round(predicted * 1.12, 2),
            "trend": trend,
            "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(trend, "→"),
            "model_name": "seasonal_baseline",
        })
    return {"vegetable": veg, "market": market, "forecast": forecasts}


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/dashboard")
def dashboard():
    sb = get_supabase()
    import math
    from datetime import timedelta

    vegetables = [
        "tomato", "onion", "potato", "garlic", "ginger", "green_chilli",
        "brinjal", "cabbage", "carrot", "cauliflower", "beans", "bitter_gourd",
        "bottle_gourd", "coriander", "drumstick", "ladies_finger", "raw_banana", "tapioca",
    ]

    all_predictions = []
    month = date.today().month
    seasonal = 1.0 + 0.03 * math.sin(2 * math.pi * (month - 1) / 12)

    for veg in vegetables:
        current = _get_modal_price(sb, veg, None)
        if current is None:
            continue
        predicted = round(current * seasonal, 2)
        trend = _calc_trend(current, predicted)
        change_pct = round((predicted - current) / current * 100, 1) if current else 0
        all_predictions.append({
            "vegetable": veg,
            "prediction_date": str(date.today()),
            "current_price": current,
            "predicted_price": predicted,
            "confidence_lower": round(predicted * 0.9, 2),
            "confidence_upper": round(predicted * 1.1, 2),
            "trend": trend,
            "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(trend, "→"),
            "model_name": "seasonal_baseline",
            "change_pct": change_pct,
        })

    rising = sorted([p for p in all_predictions if p["trend"] == "up"],
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


# ── Market comparison ─────────────────────────────────────────────────────────
@app.get("/get-current-price/market-comparison")
def market_comparison(vegetable: str = Query(...)):
    veg = vegetable.lower().replace(" ", "_")
    sb = get_supabase()
    result = (
        sb.table("price_records")
        .select("market_name,modal_price,date")
        .eq("vegetable_name", veg)
        .order("date", desc=True)
        .limit(100)
        .execute()
    )
    data = result.data or []
    seen: dict[str, dict] = {}
    for row in data:
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


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_modal_price(sb, vegetable: str, market: str | None) -> float | None:
    try:
        q = (
            sb.table("price_records")
            .select("modal_price")
            .eq("vegetable_name", vegetable)
            .order("date", desc=True)
            .limit(5)
        )
        if market:
            q = q.ilike("market_name", f"%{market}%")
        result = q.execute()
        if result.data:
            return result.data[0]["modal_price"]
    except Exception:
        pass
    return None


def _calc_trend(current: float | None, predicted: float, threshold: float = 0.03) -> str:
    if current is None:
        return "stable"
    if predicted > current * (1 + threshold):
        return "up"
    if predicted < current * (1 - threshold):
        return "down"
    return "stable"
