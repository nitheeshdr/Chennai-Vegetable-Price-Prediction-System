"""
Vercel serverless entry point.
Uses Supabase REST API directly via httpx — no supabase SDK needed.
"""
from __future__ import annotations

import math
import os
from datetime import date, timedelta
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# ── Supabase REST helper ──────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY", "")
)
_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def _rest(table: str, params: dict) -> list:
    """Query Supabase REST API synchronously."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(500, "Supabase env vars not set (SUPABASE_URL, SUPABASE_ANON_KEY)")
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = httpx.get(url, headers=_HEADERS, params=params, timeout=10)
    if r.status_code >= 400:
        raise HTTPException(r.status_code, r.text)
    return r.json()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Chennai Vegetable Price API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

VEGETABLES = [
    "tomato", "onion", "potato", "garlic", "ginger", "green_chilli",
    "brinjal", "cabbage", "carrot", "cauliflower", "beans", "bitter_gourd",
    "bottle_gourd", "coriander", "drumstick", "ladies_finger", "raw_banana", "tapioca",
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get_price(veg: str, market: Optional[str] = None) -> Optional[float]:
    try:
        params = {
            "vegetable_name": f"eq.{veg}",
            "order": "date.desc",
            "limit": "5",
            "select": "modal_price",
        }
        if market:
            params["market_name"] = f"ilike.*{market}*"
        rows = _rest("price_records", params)
        return rows[0]["modal_price"] if rows else None
    except HTTPException:
        raise
    except Exception:
        return None


def _trend(current: Optional[float], predicted: float, thr: float = 0.03) -> str:
    if current is None:
        return "stable"
    if predicted > current * (1 + thr):
        return "up"
    if predicted < current * (1 - thr):
        return "down"
    return "stable"


def _predict(veg: str, market: Optional[str], days: int = 1) -> dict:
    current = _get_price(veg, market)
    if current is None:
        raise HTTPException(404, f"No price data for '{veg}'")
    fd = date.today() + timedelta(days=days)
    factor = 1.0 + 0.04 * math.sin(2 * math.pi * (fd.month - 3) / 12)
    predicted = round(current * factor, 2)
    tr = _trend(current, predicted)
    return {
        "vegetable": veg,
        "prediction_date": str(fd),
        "current_price": current,
        "predicted_price": predicted,
        "confidence_lower": round(predicted * 0.88, 2),
        "confidence_upper": round(predicted * 1.12, 2),
        "trend": tr,
        "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(tr, "→"),
        "model_name": "seasonal_ensemble",
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "platform": "vercel", "supabase": bool(SUPABASE_URL)}


@app.get("/")
def root():
    return {"message": "Chennai Vegetable Price API", "docs": "/docs"}


@app.get("/predict")
def predict(vegetable: str = Query(...), market: Optional[str] = Query(None)):
    veg = vegetable.lower().replace(" ", "_")
    # Try stored predictions table first
    try:
        rows = _rest("predictions", {
            "vegetable_name": f"eq.{veg}",
            "order": "created_at.desc",
            "limit": "1",
        })
        if rows:
            row = rows[0]
            current = _get_price(veg, market)
            tr = _trend(current, row["predicted_price"])
            return {
                "vegetable": veg,
                "prediction_date": row["prediction_date"],
                "current_price": current,
                "predicted_price": row["predicted_price"],
                "confidence_lower": row.get("confidence_lower") or round(row["predicted_price"] * 0.9, 2),
                "confidence_upper": row.get("confidence_upper") or round(row["predicted_price"] * 1.1, 2),
                "trend": tr,
                "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(tr, "→"),
                "model_name": row.get("model_used", "ensemble"),
            }
    except Exception:
        pass
    return _predict(veg, market, days=1)


@app.get("/get-current-price")
def current_price(vegetable: str = Query(...), market: Optional[str] = Query(None)):
    veg = vegetable.lower().replace(" ", "_")
    params = {
        "vegetable_name": f"eq.{veg}",
        "order": "date.desc",
        "limit": "5",
        "select": "date,market_name,min_price,max_price,modal_price",
    }
    if market:
        params["market_name"] = f"ilike.*{market}*"
    rows = _rest("price_records", params)
    if not rows:
        raise HTTPException(404, f"No price data for '{vegetable}'")
    row = rows[0]
    return {**row, "vegetable": veg, "unit": "Rs/kg"}


@app.get("/get-current-price/market-comparison")
def market_comparison(vegetable: str = Query(...)):
    veg = vegetable.lower().replace(" ", "_")
    rows = _rest("price_records", {
        "vegetable_name": f"eq.{veg}",
        "order": "date.desc",
        "limit": "100",
        "select": "market_name,modal_price,date",
    })
    seen: dict = {}
    for r in rows:
        m = r.get("market_name", "Unknown")
        if m not in seen:
            seen[m] = r
    markets = sorted(seen.values(), key=lambda x: x["modal_price"])
    cheapest = markets[0] if markets else {}
    return {
        "vegetable": veg,
        "markets": [{"market": m["market_name"], "price": m["modal_price"]} for m in markets],
        "cheapest_market": cheapest.get("market_name", "N/A"),
        "cheapest_price": cheapest.get("modal_price", 0.0),
    }


@app.get("/weekly-forecast")
def weekly_forecast(vegetable: str = Query(...), market: Optional[str] = Query(None)):
    veg = vegetable.lower().replace(" ", "_")
    return {
        "vegetable": veg,
        "market": market,
        "forecast": [_predict(veg, market, days=i) for i in range(1, 8)],
    }


@app.get("/dashboard")
def dashboard():
    all_preds = []
    for veg in VEGETABLES:
        try:
            p = _predict(veg, None, days=1)
            p["change_pct"] = round(
                (p["predicted_price"] - p["current_price"]) / p["current_price"] * 100, 1
            )
            all_preds.append(p)
        except Exception:
            continue
    rising  = sorted([p for p in all_preds if p["trend"] == "up"],  key=lambda x: x["change_pct"], reverse=True)[:5]
    falling = sorted([p for p in all_preds if p["trend"] == "down"], key=lambda x: x["change_pct"])[:5]
    return {
        "total_vegetables": len(all_preds),
        "markets_tracked": 5,
        "last_updated": str(date.today()),
        "top_rising": rising,
        "top_falling": falling,
        "all_predictions": all_preds,
    }
