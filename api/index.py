"""
Vercel serverless handler — zero external dependencies, Python stdlib only.
Uses urllib.request for Supabase REST, Open-Meteo weather, and NVIDIA NIM AI.
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
NVIDIA_KEY = os.environ.get("NVIDIA_API_KEY", "")

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


def _rest_insert(table: str, data: dict) -> None:
    """Insert a row into Supabase. Silently ignores errors."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        payload = json.dumps(data).encode()
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}",
            data=payload,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            resp.read()
    except Exception:
        pass


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


# ── NVIDIA NIM AI prediction ──────────────────────────────────────────────────
_NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

_NIM_MODELS = [
    "meta/llama-3.1-8b-instruct",            # fast, small
    "meta/llama-3.3-70b-instruct",            # large, capable
    "nvidia/llama-3.1-nemotron-70b-instruct", # NVIDIA optimized
    "mistralai/mistral-7b-instruct-v0.3",     # Mistral 7B
    "microsoft/phi-3-mini-128k-instruct",     # Phi-3 mini
]

def _call_nvidia(payload_dict: dict, timeout: int = 25) -> dict:
    """Try NVIDIA NIM models in order until one succeeds."""
    import urllib.error as _ue
    import time as _time
    last_err = None
    models_to_try = [payload_dict["model"]] + [m for m in _NIM_MODELS if m != payload_dict["model"]]
    for model in models_to_try:
        payload_dict["model"] = model
        payload = json.dumps(payload_dict).encode()
        req = urllib.request.Request(
            _NVIDIA_URL,
            data=payload,
            headers={
                "Authorization": f"Bearer {NVIDIA_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                result = json.loads(resp.read())
            result["_model_used"] = model
            return result
        except _ue.HTTPError as e:
            if e.code == 401:
                raise ValueError("NVIDIA API key is invalid. Please update NVIDIA_API_KEY.")
            if e.code == 429:
                _time.sleep(1)
            last_err = e
        except Exception as e:
            last_err = e
    raise last_err or ValueError("All NVIDIA NIM models failed")


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

    result = _call_nvidia({
        "model": _NIM_MODELS[0],
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 250,
        "temperature": 0.2,
    })

    content = result["choices"][0]["message"]["content"].strip()
    m = re.search(r"\{.*\}", content, re.DOTALL)
    ai = json.loads(m.group() if m else content)

    tr   = ai.get("trend", "stable")
    pred = float(ai.get("predicted_price", current))
    cl   = round(float(ai.get("confidence_lower", pred * 0.90)), 2)
    cu   = round(float(ai.get("confidence_upper", pred * 1.10)), 2)
    model_used = result.get("_model_used", "nvidia/nim")

    # Persist so /dashboard and /predict pick up the AI price
    _rest_insert("predictions", {
        "vegetable_name":    veg,
        "prediction_date":   str(fd),
        "predicted_price":   round(pred, 2),
        "confidence_lower":  cl,
        "confidence_upper":  cu,
        "trend":             tr,
        "model_used":        model_used,
    })

    return {
        "vegetable":         veg,
        "prediction_date":   str(fd),
        "current_price":     current,
        "predicted_price":   round(pred, 2),
        "confidence_lower":  cl,
        "confidence_upper":  cu,
        "trend":             tr,
        "trend_emoji":       {"up": "↑", "down": "↓", "stable": "→"}.get(tr, "→"),
        "reasoning":         ai.get("reasoning", ""),
        "model_name":        model_used,
        "weather_used":      bool(weather_ctx),
    }


def _scan_image(image_b64: str) -> dict:
    """Identify vegetable from base64 image using NVIDIA NIM vision model."""
    if not NVIDIA_KEY:
        raise ValueError("NVIDIA_API_KEY not set")

    prompt = (
        "You are a vegetable recognition expert. Look at this image and identify the vegetable.\n"
        "Respond with ONLY valid JSON, no extra text:\n"
        '{"vegetable": "<name_in_english_lowercase_underscored>", '
        '"confidence": <0.0-1.0>, '
        '"top_k": [{"vegetable": "<name>", "confidence": <0.0-1.0>}, ...]}\n'
        "Use names like: tomato, onion, potato, garlic, ginger, green_chilli, brinjal, "
        "cabbage, carrot, cauliflower, beans, bitter_gourd, bottle_gourd, coriander, "
        "drumstick, ladies_finger, raw_banana, tapioca. "
        "If unsure, still pick the closest match."
    )

    import urllib.error as _ue2
    payload_dict = {
        "model": "meta/llama-3.2-11b-vision-instruct",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
                {"type": "text", "text": prompt},
            ],
        }],
        "max_tokens": 200,
        "temperature": 0.1,
    }
    payload = json.dumps(payload_dict).encode()
    req = urllib.request.Request(
        _NVIDIA_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {NVIDIA_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            result = json.loads(resp.read())
    except _ue2.HTTPError as e:
        if e.code == 401:
            raise ValueError("NVIDIA API key is invalid. Please update NVIDIA_API_KEY and redeploy.")
        raise

    content = result["choices"][0]["message"]["content"].strip()
    m = re.search(r"\{.*\}", content, re.DOTALL)
    scan = json.loads(m.group() if m else content)

    veg = scan.get("vegetable", "unknown")
    confidence = float(scan.get("confidence", 0.5))
    top_k = scan.get("top_k", [{"vegetable": veg, "confidence": confidence}])

    # Get price + prediction for detected vegetable
    current_price = None
    prediction = None
    if veg != "unknown":
        try:
            rows = _rest("price_records", {
                "vegetable_name": f"eq.{veg}",
                "order": "date.desc", "limit": "1",
                "select": "date,market_name,min_price,max_price,modal_price",
            })
            if rows:
                current_price = {**rows[0], "vegetable": veg, "unit": "Rs/kg"}
        except Exception:
            pass
        prediction = _predict(veg, None, days=1)

    return {
        "vegetable_detected": veg,
        "confidence": confidence,
        "top_k": top_k,
        "prediction": prediction,
        "current_price": current_price,
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

    if path == "/test-ai":
        if not NVIDIA_KEY:
            return _ok({"status": "error", "error": "NVIDIA_API_KEY not set on server"})
        import urllib.error as _ue3
        tried = []
        for model in _NIM_MODELS:
            try:
                payload = json.dumps({
                    "model": model,
                    "messages": [{"role": "user", "content": "Reply with exactly: ok"}],
                    "max_tokens": 5,
                }).encode()
                req = urllib.request.Request(
                    _NVIDIA_URL,
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {NVIDIA_KEY}",
                        "Content-Type": "application/json",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    result = json.loads(resp.read())
                reply = result["choices"][0]["message"]["content"].strip()
                return _ok({
                    "status": "ok",
                    "model": model,
                    "reply": reply,
                    "key_prefix": NVIDIA_KEY[:12] + "...",
                })
            except _ue3.HTTPError as e:
                body = ""
                try:
                    body = e.read().decode()[:200]
                except Exception:
                    pass
                tried.append({"model": model, "error": f"HTTP {e.code}", "body": body})
                if e.code == 401:
                    break  # Auth failure — no point trying other models
            except Exception as e:
                tried.append({"model": model, "error": str(e)})
        return _ok({
            "status": "error",
            "tried": tried,
            "key_prefix": NVIDIA_KEY[:12] + "...",
            "key_length": len(NVIDIA_KEY),
            "hint": "If error is 401, your NVIDIA API key is invalid. Get a key at build.nvidia.com",
        })

    if path == "/weather":
        try:
            return _ok(_get_weather())
        except Exception as e:
            return _err(str(e), 500)

    if path == "/scan-image":
        body = qs.get("__body__", [{}])[0]
        image_b64 = body.get("image_base64", "") if isinstance(body, dict) else ""
        if not image_b64:
            return _err("image_base64 required", 400)
        if not NVIDIA_KEY:
            return _err("NVIDIA_API_KEY not configured on server", 503)
        try:
            return _ok(_scan_image(image_b64))
        except Exception as e:
            return _err(str(e), 500)

    if path == "/ai-predict":
        veg_raw = q("vegetable", "")
        market = q("market")
        if not veg_raw:
            return _err("vegetable parameter required")
        veg = veg_raw.lower().replace(" ", "_")
        if not NVIDIA_KEY:
            # Fall back to seasonal ML prediction
            try:
                result = _predict(veg, market)
                result["model_name"] = "seasonal_ml_fallback"
                result["reasoning"] = "AI key not configured — using seasonal ML model. Update NVIDIA_API_KEY to enable AI predictions."
                result["weather_used"] = False
                return _ok(result)
            except Exception as fe:
                return _err(f"No AI key and ML fallback failed: {fe}", 503)
        try:
            return _ok(_ai_predict(veg, market))
        except ValueError as e:
            err_msg = str(e)
            if "invalid" in err_msg.lower() or "key" in err_msg.lower():
                # Auth failure — fall back to ML prediction
                try:
                    result = _predict(veg, market)
                    result["model_name"] = "seasonal_ml_fallback"
                    result["reasoning"] = "AI key rejected by NVIDIA NIM — using seasonal ML model. Please update NVIDIA_API_KEY."
                    result["weather_used"] = False
                    return _ok(result)
                except Exception:
                    pass
            return _err(err_msg, 502)
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
                {"method": "GET", "path": "/ai-predict?vegetable=tomato",                 "description": "AI-powered prediction via NVIDIA NIM (Llama 3.1)"},
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
        # Batch-fetch latest AI predictions saved to Supabase
        saved: dict = {}
        try:
            veg_list = ",".join(VEGETABLES)
            rows = _rest("predictions", {
                "vegetable_name": f"in.({veg_list})",
                "order": "created_at.desc",
                "limit": "200",
                "select": "vegetable_name,prediction_date,predicted_price,"
                          "confidence_lower,confidence_upper,trend,model_used",
            })
            for r in rows:
                v = r["vegetable_name"]
                if v not in saved:  # keep most recent (order=desc)
                    saved[v] = r
        except Exception:
            pass

        all_preds = []
        for veg in VEGETABLES:
            if veg in saved:
                r       = saved[veg]
                current = _get_price(veg, None)
                pp      = r["predicted_price"]
                tr      = _trend(current, pp) if current else r.get("trend", "stable")
                chg     = round((pp - current) / current * 100, 1) if current else 0
                all_preds.append({
                    "vegetable":        veg,
                    "prediction_date":  r["prediction_date"],
                    "current_price":    current,
                    "predicted_price":  pp,
                    "confidence_lower": r.get("confidence_lower") or round(pp * 0.92, 2),
                    "confidence_upper": r.get("confidence_upper") or round(pp * 1.08, 2),
                    "trend":            tr,
                    "trend_emoji":      {"up": "↑", "down": "↓", "stable": "→"}.get(tr, "→"),
                    "model_name":       r.get("model_used", "ai"),
                    "change_pct":       chg,
                })
            else:
                p = _predict(veg, None, days=1)
                if p:
                    p["change_pct"] = round(
                        (p["predicted_price"] - p["current_price"]) / p["current_price"] * 100, 1
                    ) if p.get("current_price") else 0
                    all_preds.append(p)

        rising  = sorted([p for p in all_preds if p["trend"] == "up"],  key=lambda x: x["change_pct"], reverse=True)[:5]
        falling = sorted([p for p in all_preds if p["trend"] == "down"], key=lambda x: x["change_pct"])[:5]
        return _ok({
            "total_vegetables": len(all_preds),
            "markets_tracked":  5,
            "last_updated":     str(date.today()),
            "top_rising":       rising,
            "top_falling":      falling,
            "all_predictions":  all_preds,
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

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
        # Inject parsed body into qs so _dispatch can read it
        qs = {"__body__": [data]}
        try:
            status, body = _dispatch(parsed.path, qs)
        except Exception as e:
            status, body = 500, json.dumps({"error": str(e)})
        self._respond(status, body)

    def do_OPTIONS(self):
        self._respond(200, "{}")

    def log_message(self, fmt, *args):
        pass
