# VegPrice AI — API Reference

**Base URL (Vercel Serverless):** `https://chennai-vegetable-price-prediction.vercel.app`  
**Base URL (Local FastAPI):** `http://localhost:8000`  
**Version:** 1.0.0

---

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Root — returns API info |
| GET | `/health` | No | Health check + environment |

---

## Predictions

| Method | Endpoint | Auth | Query Params | Description |
|--------|----------|------|-------------|-------------|
| GET | `/predict` | No | `vegetable` (req), `market` (opt) | Supabase-first prediction; seasonal ML fallback |
| GET | `/ai-predict` | No | `vegetable` (req), `market` (opt) | NVIDIA NIM LLM price prediction with weather context |

**`/predict` Response:**
```json
{
  "vegetable": "tomato",
  "prediction_date": "2026-04-12",
  "current_price": 42.0,
  "predicted_price": 44.50,
  "confidence_lower": 40.0,
  "confidence_upper": 49.0,
  "trend": "up",
  "trend_emoji": "↑",
  "model_name": "meta/llama-3.1-8b-instruct"
}
```

**`/ai-predict` Additional Fields:**
```json
{
  "reasoning": "April sees reduced supply due to summer heat...",
  "weather_used": true
}
```

---

## Prices

| Method | Endpoint | Auth | Query Params | Description |
|--------|----------|------|-------------|-------------|
| GET | `/get-current-price` | No | `vegetable` (req), `market` (opt) | Latest market price from Supabase |
| GET | `/get-current-price/market-comparison` | No | `vegetable` (req) | Price across all tracked markets |
| GET | `/price-history` | No | `vegetable` (req), `days` (opt, default 30, max 90) | Last N days of price records |

**`/get-current-price` Response:**
```json
{
  "vegetable": "onion",
  "date": "2026-04-11",
  "market_name": "Koyambedu",
  "min_price": 18.0,
  "max_price": 26.0,
  "modal_price": 22.0,
  "unit": "Rs/kg"
}
```

**`/get-current-price/market-comparison` Response:**
```json
{
  "vegetable": "onion",
  "markets": [
    { "market": "Koyambedu", "price": 22.0 },
    { "market": "Madhavaram", "price": 24.0 }
  ],
  "cheapest_market": "Koyambedu",
  "cheapest_price": 22.0
}
```

---

## Forecast

| Method | Endpoint | Auth | Query Params | Description |
|--------|----------|------|-------------|-------------|
| GET | `/weekly-forecast` | No | `vegetable` (req), `market` (opt) | 7-day price forecast; day 1 uses Supabase AI price if available |

**Response:**
```json
{
  "vegetable": "tomato",
  "market": null,
  "forecast": [
    { "prediction_date": "2026-04-12", "predicted_price": 44.5, "trend": "up", ... },
    { "prediction_date": "2026-04-13", "predicted_price": 43.8, "trend": "stable", ... }
  ]
}
```

---

## Dashboard

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | No | Batch summary for all 18 vegetables; Supabase AI prices first |

**Response:**
```json
{
  "total_vegetables": 18,
  "markets_tracked": 5,
  "last_updated": "2026-04-11",
  "top_rising": [ { "vegetable": "tomato", "change_pct": 5.2, "predicted_price": 44.5 } ],
  "top_falling": [ { "vegetable": "onion", "change_pct": -3.1, "predicted_price": 21.0 } ],
  "all_predictions": [ ... ]
}
```

---

## Vision / Image Scan

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/scan-image` | No | `{ "image_base64": "<base64_string>" }` | Identify vegetable from image via NVIDIA NIM vision model |

**Response:**
```json
{
  "vegetable_detected": "tomato",
  "confidence": 0.93,
  "top_k": [
    { "vegetable": "tomato", "confidence": 0.93 },
    { "vegetable": "apple", "confidence": 0.04 }
  ],
  "prediction": { ... },
  "current_price": { ... }
}
```

---

## Alerts (FastAPI only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/alerts` | No | Create a price alert |
| GET | `/alerts/{user_id}` | No | List all alerts for a user |
| DELETE | `/alerts/{alert_id}` | No | Delete an alert |

**POST `/alerts` Body:**
```json
{
  "user_id": "uuid-string",
  "vegetable_name": "tomato",
  "threshold_price": 50.0,
  "direction": "above",
  "market_name": "Koyambedu",
  "device_token": "fcm-token"
}
```

---

## Miscellaneous

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/vegetables` | No | List all 18 supported vegetables |
| GET | `/weather` | No | Current Chennai weather (Open-Meteo, free) |
| GET | `/test-ai` | No | Test NVIDIA NIM connectivity |
| GET | `/docs` | No | Inline API documentation |

---

## Supported Vegetables (18)

`tomato`, `onion`, `potato`, `garlic`, `ginger`, `green_chilli`, `brinjal`, `cabbage`, `carrot`, `cauliflower`, `beans`, `bitter_gourd`, `bottle_gourd`, `coriander`, `drumstick`, `ladies_finger`, `raw_banana`, `tapioca`

---

## AI Models Used

| Model | Provider | Use Case |
|-------|----------|----------|
| `meta/llama-3.1-8b-instruct` | NVIDIA NIM | Price prediction (primary) |
| `meta/llama-3.3-70b-instruct` | NVIDIA NIM | Price prediction (fallback) |
| `nvidia/llama-3.1-nemotron-70b-instruct` | NVIDIA NIM | Price prediction (fallback) |
| `mistralai/mistral-7b-instruct-v0.3` | NVIDIA NIM | Price prediction (fallback) |
| `microsoft/phi-3-mini-128k-instruct` | NVIDIA NIM | Price prediction (fallback) |
| `meta/llama-3.2-11b-vision-instruct` | NVIDIA NIM | Vegetable image recognition |
