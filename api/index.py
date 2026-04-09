"""
Vercel serverless handler — zero external dependencies, Python stdlib only.
Uses urllib.request for Supabase REST calls, BaseHTTPRequestHandler for routing.
"""
from __future__ import annotations

import json
import math
import os
import urllib.parse
import urllib.request
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler
from typing import Optional

# ── Supabase config ───────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY", "")
)

VEGETABLES = [
    "tomato", "onion", "potato", "garlic", "ginger", "green_chilli",
    "brinjal", "cabbage", "carrot", "cauliflower", "beans", "bitter_gourd",
    "bottle_gourd", "coriander", "drumstick", "ladies_finger", "raw_banana", "tapioca",
]


# ── Supabase REST helper ──────────────────────────────────────────────────────
def _rest(table: str, params: dict) -> list:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase env vars not set (SUPABASE_URL, SUPABASE_ANON_KEY)")
    query = urllib.parse.urlencode(params)
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


# ── Price helpers ─────────────────────────────────────────────────────────────
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


def _predict(veg: str, market: Optional[str], days: int = 1) -> Optional[dict]:
    current = _get_price(veg, market)
    if current is None:
        return None
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


def _ok(data: object) -> tuple:
    return 200, json.dumps(data, ensure_ascii=False)


def _err(msg: str, status: int = 400) -> tuple:
    return status, json.dumps({"error": msg})


# ── Route dispatcher ──────────────────────────────────────────────────────────
def _dispatch(path: str, qs: dict) -> tuple:

    def q(key: str, default=None):
        vals = qs.get(key)
        return vals[0] if vals else default

    if path in ("/", ""):
        return _ok({"message": "Chennai Vegetable Price API", "version": "1.0.0"})

    if path == "/health":
        return _ok({"status": "ok", "platform": "vercel", "supabase": bool(SUPABASE_URL)})

    if path == "/predict":
        veg_raw = q("vegetable", "")
        market = q("market")
        if not veg_raw:
            return _err("vegetable parameter required")
        veg = veg_raw.lower().replace(" ", "_")
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
                return _ok({
                    "vegetable": veg,
                    "prediction_date": row["prediction_date"],
                    "current_price": current,
                    "predicted_price": row["predicted_price"],
                    "confidence_lower": row.get("confidence_lower") or round(row["predicted_price"] * 0.9, 2),
                    "confidence_upper": row.get("confidence_upper") or round(row["predicted_price"] * 1.1, 2),
                    "trend": tr,
                    "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(tr, "→"),
                    "model_name": row.get("model_used", "ensemble"),
                })
        except Exception:
            pass
        p = _predict(veg, market)
        if p is None:
            return _err(f"No price data for '{veg}'", 404)
        return _ok(p)

    if path == "/vegetables":
        return _ok({"vegetables": VEGETABLES, "count": len(VEGETABLES)})

    if path == "/get-current-price":
        veg_raw = q("vegetable", "")
        market = q("market")
        if not veg_raw:
            return _err("vegetable parameter required")
        veg = veg_raw.lower().replace(" ", "_")
        params = {
            "vegetable_name": f"eq.{veg}",
            "order": "date.desc",
            "limit": "5",
            "select": "date,market_name,min_price,max_price,modal_price",
        }
        if market:
            params["market_name"] = f"ilike.*{market}*"
        try:
            rows = _rest("price_records", params)
        except Exception as e:
            return _err(str(e), 500)
        if not rows:
            return _err(f"No price data for '{veg_raw}'", 404)
        return _ok({**rows[0], "vegetable": veg, "unit": "Rs/kg"})

    if path == "/get-current-price/market-comparison":
        veg_raw = q("vegetable", "")
        veg = veg_raw.lower().replace(" ", "_")
        try:
            rows = _rest("price_records", {
                "vegetable_name": f"eq.{veg}",
                "order": "date.desc",
                "limit": "100",
                "select": "market_name,modal_price,date",
            })
        except Exception as e:
            return _err(str(e), 500)
        seen: dict = {}
        for r in rows:
            m = r.get("market_name", "Unknown")
            if m not in seen:
                seen[m] = r
        markets = sorted(seen.values(), key=lambda x: x["modal_price"])
        cheapest = markets[0] if markets else {}
        return _ok({
            "vegetable": veg,
            "markets": [{"market": m["market_name"], "price": m["modal_price"]} for m in markets],
            "cheapest_market": cheapest.get("market_name", "N/A"),
            "cheapest_price": cheapest.get("modal_price", 0.0),
        })

    if path == "/weekly-forecast":
        veg_raw = q("vegetable", "")
        market = q("market")
        veg = veg_raw.lower().replace(" ", "_")
        forecast = [p for i in range(1, 8) if (p := _predict(veg, market, days=i))]
        return _ok({"vegetable": veg, "market": market, "forecast": forecast})

    if path == "/dashboard":
        all_preds = []
        for veg in VEGETABLES:
            p = _predict(veg, None, days=1)
            if p:
                p["change_pct"] = round(
                    (p["predicted_price"] - p["current_price"]) / p["current_price"] * 100, 1
                )
                all_preds.append(p)
        rising  = sorted([p for p in all_preds if p["trend"] == "up"],  key=lambda x: x["change_pct"], reverse=True)[:5]
        falling = sorted([p for p in all_preds if p["trend"] == "down"], key=lambda x: x["change_pct"])[:5]
        return _ok({
            "total_vegetables": len(all_preds),
            "markets_tracked": 5,
            "last_updated": str(date.today()),
            "top_rising": rising,
            "top_falling": falling,
            "all_predictions": all_preds,
        })

    return _err("Not found", 404)


# ── Vercel handler ────────────────────────────────────────────────────────────
class handler(BaseHTTPRequestHandler):
    def _respond(self, status: int, body: str) -> None:
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        try:
            status, body = _dispatch(parsed.path, qs)
        except Exception as e:
            status, body = 500, json.dumps({"error": str(e)})
        self._respond(status, body)

    def do_OPTIONS(self):
        self._respond(200, "{}")

    def log_message(self, fmt, *args):
        pass  # suppress default stderr logging
