"""
Vercel serverless handler — zero external dependencies, Python stdlib only.
Uses urllib.request for Supabase REST, Open-Meteo weather, and OpenRouter AI.
"""
from __future__ import annotations

import json
import math
import os
import re
import urllib.parse
import urllib.request
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler
from typing import Optional

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY", "")
)
OPENROUTER_KEY = os.environ.get(
    "OPENROUTER_API_KEY",
    "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",
)

VEGETABLES = [
    "tomato", "onion", "potato", "garlic", "ginger", "green_chilli",
    "brinjal", "cabbage", "carrot", "cauliflower", "beans", "bitter_gourd",
    "bottle_gourd", "coriander", "drumstick", "ladies_finger", "raw_banana", "tapioca",
]

WMO_CODES = {
    0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Foggy", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
}


# ── Supabase REST ─────────────────────────────────────────────────────────────
def _rest(table: str, params: dict) -> list:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase env vars not set")
    query = urllib.parse.urlencode(params)
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


# ── Weather (Open-Meteo, free, no key) ───────────────────────────────────────
def _get_weather() -> dict:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=13.08&longitude=80.27"
        "&current=temperature_2m,relative_humidity_2m,precipitation,"
        "weather_code,wind_speed_10m,apparent_temperature"
        "&timezone=Asia%2FKolkata"
    )
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read())
    c = data["current"]
    code = c.get("weather_code", 0)
    return {
        "temperature": c.get("temperature_2m"),
        "feels_like": c.get("apparent_temperature"),
        "humidity": c.get("relative_humidity_2m"),
        "precipitation": c.get("precipitation", 0),
        "wind_speed": c.get("wind_speed_10m"),
        "condition": WMO_CODES.get(code, "Unknown"),
        "weather_code": code,
        "location": "Chennai, Tamil Nadu",
    }


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

    # Day-of-year seasonality (daily resolution — not monthly)
    doy = fd.timetuple().tm_yday
    seasonal = 0.06 * math.sin(2 * math.pi * (doy - 90) / 365)

    # Day-of-week: Mon/Fri higher (wholesale arrival days), Wed cheapest
    dow_effect = [0.015, 0.008, -0.010, -0.005, 0.012, 0.022, 0.018][fd.weekday()]

    # Mean reversion for longer horizons
    reversion = -0.004 * (days - 1)

    factor = 1.0 + seasonal + dow_effect + reversion
    predicted = round(current * factor, 2)
    margin = 0.08 + 0.015 * days
    tr = _trend(current, predicted)
    return {
        "vegetable": veg,
        "prediction_date": str(fd),
        "current_price": current,
        "predicted_price": predicted,
        "confidence_lower": round(predicted * (1 - margin), 2),
        "confidence_upper": round(predicted * (1 + margin), 2),
        "trend": tr,
        "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(tr, "→"),
        "model_name": "seasonal_ensemble",
    }


# ── OpenRouter AI prediction ──────────────────────────────────────────────────
def _ai_predict(veg: str, market: Optional[str]) -> dict:
    current = _get_price(veg, market)
    if current is None:
        raise ValueError(f"No price data for '{veg}'")

    weather_ctx = ""
    try:
        w = _get_weather()
        rain_note = " Heavy rain may disrupt supply." if (w["precipitation"] or 0) > 5 else ""
        weather_ctx = (
            f"Current Chennai weather: {w['temperature']}°C (feels like {w['feels_like']}°C), "
            f"humidity {w['humidity']}%, precipitation {w['precipitation']}mm, "
            f"condition: {w['condition']}.{rain_note}"
        )
    except Exception:
        pass

    fd = date.today() + timedelta(days=1)
    prompt = (
        f"You are an expert agricultural commodity analyst for Chennai, India.\n"
        f"{weather_ctx}\n\n"
        f"Today ({date.today()}): {veg.replace('_', ' ')} price = ₹{current}/kg in Koyambedu market.\n"
        f"Tomorrow's date: {fd} ({fd.strftime('%A')}).\n\n"
        f"Predict tomorrow's price considering: seasonal patterns (April in Tamil Nadu), "
        f"day-of-week market patterns, weather impact on supply/transport, "
        f"and typical vegetable price volatility.\n\n"
        f"Respond with ONLY valid JSON, no extra text:\n"
        f'{{ "predicted_price": <number>, "confidence_lower": <number>, '
        f'"confidence_upper": <number>, "trend": "<up|down|stable>", '
        f'"reasoning": "<max 2 sentences>" }}'
    )

    payload = json.dumps({
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 250,
        "temperature": 0.2,
    }).encode()

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://chennai-vegetable-price-prediction.vercel.app",
            "X-Title": "Chennai Vegetable Price AI",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        result = json.loads(resp.read())

    content = result["choices"][0]["message"]["content"].strip()
    m = re.search(r"\{.*\}", content, re.DOTALL)
    ai = json.loads(m.group() if m else content)

    tr = ai.get("trend", "stable")
    pred = float(ai.get("predicted_price", current))
    return {
        "vegetable": veg,
        "prediction_date": str(fd),
        "current_price": current,
        "predicted_price": round(pred, 2),
        "confidence_lower": round(float(ai.get("confidence_lower", pred * 0.90)), 2),
        "confidence_upper": round(float(ai.get("confidence_upper", pred * 1.10)), 2),
        "trend": tr,
        "trend_emoji": {"up": "↑", "down": "↓", "stable": "→"}.get(tr, "→"),
        "reasoning": ai.get("reasoning", ""),
        "model_name": "openrouter/gpt-4o-mini",
        "weather_used": bool(weather_ctx),
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

    if path == "/weather":
        try:
            return _ok(_get_weather())
        except Exception as e:
            return _err(str(e), 500)

    if path == "/ai-predict":
        veg_raw = q("vegetable", "")
        market = q("market")
        if not veg_raw:
            return _err("vegetable parameter required")
        veg = veg_raw.lower().replace(" ", "_")
        try:
            return _ok(_ai_predict(veg, market))
        except Exception as e:
            return _err(str(e), 500)

    if path == "/predict":
        veg_raw = q("vegetable", "")
        market = q("market")
        if not veg_raw:
            return _err("vegetable parameter required")
        veg = veg_raw.lower().replace(" ", "_")
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

    if path == "/docs":
        return _ok({
            "title": "Chennai Vegetable Price API",
            "version": "1.0.0",
            "endpoints": [
                {"method": "GET", "path": "/health",                                      "description": "Health check"},
                {"method": "GET", "path": "/weather",                                     "description": "Current Chennai weather"},
                {"method": "GET", "path": "/vegetables",                                  "description": "List all supported vegetables"},
                {"method": "GET", "path": "/predict?vegetable=tomato",                    "description": "Seasonal model prediction"},
                {"method": "GET", "path": "/ai-predict?vegetable=tomato",                 "description": "AI-powered prediction via OpenRouter GPT-4o-mini"},
                {"method": "GET", "path": "/get-current-price?vegetable=tomato",          "description": "Current market price"},
                {"method": "GET", "path": "/get-current-price/market-comparison?vegetable=tomato", "description": "Price comparison across markets"},
                {"method": "GET", "path": "/weekly-forecast?vegetable=tomato",            "description": "7-day price forecast"},
                {"method": "GET", "path": "/dashboard",                                   "description": "Summary for all vegetables"},
            ],
        })

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
        pass
