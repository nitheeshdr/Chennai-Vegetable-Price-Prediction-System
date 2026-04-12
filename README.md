<div align="center">

# VegPrice AI
### Chennai Vegetable Price Prediction System

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo_SDK-54-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Serverless-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-LLM-76B900?style=flat-square&logo=nvidia&logoColor=white)](https://build.nvidia.com)

**Production API:** `https://chennai-vegetable-price-prediction.vercel.app`

A full-stack intelligent system that predicts next-day vegetable prices across Chennai's wholesale markets — combining a 5-model ML ensemble, NVIDIA NIM LLM reasoning, computer vision scanning, and a React Native Android application.

[Quick Start](#quick-start) · [API Reference](#api-reference) · [ML Pipeline](#ml-pipeline) · [Mobile App](#mobile-app) · [Architecture](#architecture)

</div>

---

## Overview

VegPrice AI serves vegetable traders, retailers, and households in Chennai with data-driven price intelligence. Prices at Koyambedu — one of Asia's largest wholesale markets — fluctuate 10–40% day-over-day due to seasonal harvests, weather, and supply disruptions.

The platform ingests historical mandi price data, trains an ensemble of ML models per vegetable, and augments those forecasts with real-time LLM reasoning through NVIDIA NIM. All predictions are persisted to Supabase so every screen in the mobile app reads from a single authoritative source.

---

## Features

| Feature | Description |
|---|---|
| **AI Price Prediction** | NVIDIA NIM (Llama 3.1/3.3) generates next-day price forecasts with weather integration and reasoning text |
| **ML Ensemble** | XGBoost + LightGBM + Prophet + Random Forest + Linear Regression; inverse-RMSE weighted combination |
| **Computer Vision Scan** | NVIDIA llama-3.2-11b-vision identifies vegetables from camera photos |
| **7-Day Forecast** | Day 1 from AI prediction; days 2–7 from seasonal ensemble with confidence intervals |
| **30-Day Price History** | Historical chart and daily records from `price_records` table |
| **Market Comparison** | Cheapest market identification across 5+ Chennai mandis |
| **Price Alerts** | FCM push notifications when a vegetable crosses a user-defined threshold |
| **Favourites Watchlist** | Star vegetables to pin them to the top of the home screen |
| **Dual Theme** | Material Design 3 light and dark themes, persisted across sessions |
| **Android Widgets** | Three home-screen widgets (2×2, 4×2, 4×4) via react-native-android-widget |
| **Admin Panel** | In-app screen to trigger AI predictions and monitor NVIDIA NIM model status |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                React Native App  (Expo SDK 54 · Android)         │
│    Home  ·  Scan  ·  Forecast  ·  Trends  ·  Alerts  ·  Admin   │
└────────────────────────────┬────────────────────────────────────┘
                             │  REST / JSON (HTTPS)
┌────────────────────────────▼────────────────────────────────────┐
│               API Layer  (Vercel Serverless / FastAPI)           │
│   index.py · routers · services · Redis cache · rate limiting    │
└──────────┬────────────────────────────────────┬─────────────────┘
           │                                    │
┌──────────▼──────────┐          ┌──────────────▼─────────────────┐
│  Supabase PostgreSQL│          │     ML & AI Engine              │
│  price_records      │          │  XGBoost · LightGBM · Prophet   │
│  predictions        │          │  Random Forest · Linear Reg     │
│  price_alerts       │          │  Weighted Ensemble              │
│  model_metrics      │          │  NVIDIA NIM (Llama 3.1/3.3)    │
│  users              │          │  NVIDIA Vision (Llama 3.2-11B) │
└─────────────────────┘          └────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│                    External Services                             │
│     Open-Meteo Weather  ·  Agmarknet Mandi API  ·  Firebase FCM  │
└─────────────────────────────────────────────────────────────────┘
```

### Supabase-First Consistency

All prediction-displaying screens read from the same `predictions` table row. An admin triggers `GET /ai-predict` → NVIDIA NIM returns a price → saved to Supabase → all screens update on next refresh. No screen computes predictions independently.

---

## Project Structure

```
model/
├── api/                          # Backend: Vercel serverless + FastAPI
│   ├── index.py                  # Vercel handler (Python stdlib only, zero deps)
│   ├── main.py                   # FastAPI app entry point
│   ├── config.py                 # pydantic-settings environment config
│   ├── routers/                  # Route modules (predictions, prices, forecast...)
│   ├── services/                 # Business logic (prediction, alert, vision...)
│   ├── schemas/                  # Pydantic request/response models
│   └── db/                       # SQLAlchemy models, async session, Alembic migrations
│
├── src/                          # ML pipeline
│   ├── models/
│   │   ├── baseline/             # LinearRegression, RandomForest
│   │   ├── boosting/             # XGBoost, LightGBM
│   │   ├── timeseries/           # Prophet, LSTM
│   │   ├── deep_learning/        # TCN+Attention, Transformer
│   │   └── ensemble/             # Inverse-RMSE weighted ensemble
│   ├── data/
│   │   ├── collectors/           # Mandi API, weather, Kaggle loaders
│   │   ├── preprocessor.py
│   │   ├── feature_engineer.py   # Lag, rolling, DOW, DOY, festival, weather features
│   │   └── dataset_builder.py
│   ├── pipeline/
│   │   ├── training_pipeline.py
│   │   ├── inference_pipeline.py
│   │   └── retraining.py         # Daily incremental retraining
│   ├── evaluation/               # RMSE, MAE, MAPE, direction accuracy metrics
│   └── vision/                   # YOLOv8 vegetable classifier
│
├── mobile/                       # React Native (Expo SDK 54)
│   ├── App.tsx                   # Root: GestureHandlerRootView > ThemeProvider > PaperProvider
│   ├── index.js                  # Entry: registerRootComponent + widget handlers
│   ├── app.json                  # Expo config (package ID, permissions, icon, splash)
│   ├── eas.json                  # EAS Build profiles (preview APK, production AAB)
│   └── src/
│       ├── screens/              # HomeScreen, ScanScreen, ForecastScreen, TrendsScreen...
│       ├── components/           # PriceCard, ConfidenceBar
│       ├── navigation/           # AppNavigator (BottomTab + Stack)
│       ├── services/api.ts       # Axios client + TypeScript interfaces
│       ├── store/priceStore.ts   # Zustand store with AsyncStorage persistence
│       ├── context/ThemeContext.tsx  # M3 dual-theme context and hooks
│       ├── theme.ts              # Color tokens, Paper MD3Theme builder
│       └── widgets/              # VegPriceWidget, MarketSummaryWidget, DashboardWidget
│
├── data/
│   ├── model_artifacts/          # Trained .pkl files (18 vegetables × 5 models = 90 files)
│   ├── features/                 # all_features.parquet
│   └── raw/ + processed/         # Parquet price data
│
├── config/
│   ├── vegetables.yaml           # 18 vegetable slugs and display names
│   ├── markets.yaml              # Chennai market list
│   ├── model_params.yaml         # ML hyperparameters per vegetable
│   └── festivals.yaml            # Tamil Nadu festival calendar (price spike signals)
│
├── scripts/                      # train_models.py, daily_retrain.py, seed_database.py
├── deployment/                   # docker-compose.yml, Dockerfile.api, Dockerfile.ml
├── tests/                        # pytest suite
├── notebooks/                    # Jupyter EDA and model benchmarks
├── report/                       # Technical documentation (LaTeX + Markdown)
├── vercel.json                   # Routes all requests to api/index.py
├── pyproject.toml                # ruff · black · mypy · pytest config
└── requirements-full.txt         # All Python dependencies
```

---

## Quick Start

### Prerequisites

- Python **3.11+**
- Node.js **18+** and npm
- Docker and Docker Compose (for local full-stack)
- A [Supabase](https://supabase.com) project (free tier)
- A [NVIDIA NIM](https://build.nvidia.com) API key (free tier)

### 1 — Clone and Install

```bash
git clone https://github.com/nitheeshdr/Chennai-Vegetable-Price-Prediction-System.git
cd Chennai-Vegetable-Price-Prediction-System

python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements-full.txt
```

### 2 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | `https://{project-ref}.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key — server only |
| `NVIDIA_API_KEY` | Yes | Free at `build.nvidia.com` |
| `DATABASE_URL` | FastAPI only | `postgresql+asyncpg://user:pass@host/db` |
| `REDIS_URL` | FastAPI only | `redis://localhost:6379/0` |
| `SECRET_KEY` | FastAPI only | Random 32+ character string |
| `FCM_SERVER_KEY` | Alerts only | Firebase Cloud Messaging key |

### 3 — Train ML Models

```bash
# Download historical mandi price data
python scripts/download_data.py --years 3

# Train all 5 model types for all 18 vegetables (90 artifacts total)
python scripts/train_models.py

# Evaluate and compare models
python scripts/evaluate_models.py
```

### 4 — Start the Backend

```bash
# Option A: FastAPI dev server (local)
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Option B: Full stack with Docker Compose (API + Redis + ML worker)
cd deployment && docker-compose up --build
```

API available at `http://localhost:8000` — interactive docs at `http://localhost:8000/docs`

### 5 — Start the Mobile App

```bash
cd mobile
npm install
npx expo start
# Press 'a' for Android emulator or scan QR with Expo Go
```

### 6 — Build Android APK

```bash
cd mobile
eas build --platform android --profile preview
```

---

## API Reference

The production API runs on Vercel Serverless (`api/index.py`) with zero pip dependencies. A FastAPI variant (`api/main.py`) is used for local development and Docker.

**Base URL:** `https://chennai-vegetable-price-prediction.vercel.app`

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API name and version |
| `GET` | `/health` | Status and Supabase connectivity check |
| `GET` | `/weather` | Real-time Chennai weather via Open-Meteo |
| `GET` | `/vegetables` | List of 18 supported vegetable slugs |
| `GET` | `/predict?vegetable=X&market=Y` | Supabase-first prediction; seasonal ML fallback |
| `GET` | `/ai-predict?vegetable=X` | NVIDIA NIM LLM forecast with reasoning text |
| `GET` | `/get-current-price?vegetable=X` | Latest price from `price_records` |
| `GET` | `/get-current-price/market-comparison?vegetable=X` | All markets sorted by price |
| `GET` | `/price-history?vegetable=X&days=30` | Last N days of price records (max 90) |
| `GET` | `/weekly-forecast?vegetable=X` | 7-day forecast (day 1 = AI, days 2–7 = ML) |
| `GET` | `/dashboard` | All 18 vegetables with top rising/falling summary |
| `POST` | `/scan-image` | Base64 image → vegetable identification + price |
| `GET` | `/test-ai` | NVIDIA NIM connectivity test |
| `POST` | `/alerts` | Create a price threshold alert *(FastAPI)* |
| `GET` | `/alerts/{user_id}` | List user's active alerts *(FastAPI)* |
| `DELETE` | `/alerts/{alert_id}` | Remove an alert *(FastAPI)* |
| `GET` | `/metrics` | Prometheus metrics endpoint *(FastAPI)* |

### Example Requests

<details>
<summary><strong>GET /predict — Price prediction</strong></summary>

```bash
curl "https://chennai-vegetable-price-prediction.vercel.app/predict?vegetable=tomato&market=koyambedu"
```

```json
{
  "vegetable": "tomato",
  "prediction_date": "2026-04-12",
  "current_price": 42.0,
  "predicted_price": 44.5,
  "confidence_lower": 40.0,
  "confidence_upper": 49.0,
  "trend": "up",
  "trend_emoji": "↑",
  "model_name": "meta/llama-3.1-8b-instruct"
}
```

</details>

<details>
<summary><strong>GET /dashboard — All vegetables summary</strong></summary>

```bash
curl "https://chennai-vegetable-price-prediction.vercel.app/dashboard"
```

```json
{
  "total_vegetables": 18,
  "rising_count": 7,
  "falling_count": 6,
  "stable_count": 5,
  "top_rising":  [{ "vegetable": "tomato",  "change_pct":  5.2, ... }],
  "top_falling": [{ "vegetable": "onion",   "change_pct": -3.1, ... }],
  "all_predictions": [ ... ]
}
```

</details>

<details>
<summary><strong>POST /scan-image — Camera vegetable scan</strong></summary>

```bash
curl -X POST "https://chennai-vegetable-price-prediction.vercel.app/scan-image" \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "<base64-encoded-jpeg>"}'
```

```json
{
  "vegetable_detected": "tomato",
  "confidence": 0.93,
  "top_k": [
    { "vegetable": "tomato", "confidence": 0.93 },
    { "vegetable": "apple",  "confidence": 0.04 }
  ],
  "prediction": { ... },
  "current_price": { ... }
}
```

</details>

### NVIDIA NIM Model Cascade

Text models are tried in priority order. HTTP 429 triggers a 1-second delay and the next model; HTTP 401 raises immediately.

| Priority | Model | Notes |
|---|---|---|
| 1 | `meta/llama-3.1-8b-instruct` | Primary — fast, low latency |
| 2 | `meta/llama-3.3-70b-instruct` | Secondary — high capability |
| 3 | `nvidia/llama-3.1-nemotron-70b-instruct` | NVIDIA-optimised |
| 4 | `mistralai/mistral-7b-instruct-v0.3` | Lightweight fallback |
| 5 | `microsoft/phi-3-mini-128k-instruct` | Last resort |
| — | `meta/llama-3.2-11b-vision-instruct` | Vision only (`/scan-image`) |

---

## ML Pipeline

### Feature Engineering

Each training sample is built from the following feature groups:

| Group | Features |
|---|---|
| Lag features | `price_lag_1`, `price_lag_2`, `price_lag_7`, `price_lag_14` |
| Rolling statistics | `rolling_mean_3`, `rolling_mean_7`, `rolling_mean_14`, `rolling_std_7` |
| Seasonal encoding | `doy_sin`, `doy_cos` (continuous cyclic day-of-year) |
| Calendar | `day_of_week`, `month`, `is_weekend`, `is_festival` |
| Weather | `temperature`, `rainfall_mm`, `humidity_pct` from Open-Meteo |
| Supply proxy | `arrival_qty`, `supply_demand_ratio` |
| Market encoding | One-hot encoded market name |

### Model Portfolio

Five model classes are trained per vegetable (18 × 5 = **90 model artifacts**):

| Model | Implementation | Key Strength |
|---|---|---|
| Linear Regression | scikit-learn | Ridge regularisation; stable baseline |
| Random Forest | scikit-learn | Non-linear interactions; outlier-robust |
| XGBoost | xgboost 2.0.3 | Optuna-tuned; highest tabular accuracy |
| LightGBM | lightgbm 4.3.0 | Fast training; memory efficient |
| Prophet | prophet 1.1.5 | Multi-seasonality + festival effects |

**Ensemble**: Inverse-RMSE weighted average. Each model is evaluated on the last 30-day validation window; weight = `1/RMSE_i`, normalised to sum to 1.

### Retraining Schedule

The ML pipeline retrains daily at 02:00 via macOS `launchd` (development) or the Docker `ml-worker` container (production). New `price_records` are fetched from Supabase, features re-engineered, all 5 models retrained per vegetable, and the best model selected by MAPE on the validation window.

---

## Mobile App

Built with **React Native 0.81.5** and **Expo SDK 54**, targeting Android. EAS Build compiles cloud APKs and AABs without a local Android SDK.

### Screens

| Screen | File | Description |
|---|---|---|
| Home | `HomeScreen.tsx` | Dashboard with weather, summary stats, all 18 vegetables, favourites |
| Scan | `ScanScreen.tsx` | Camera capture → NVIDIA vision → vegetable identification |
| Result | `ResultScreen.tsx` | Scan output: detected vegetable, confidence, price card |
| Forecast | `ForecastScreen.tsx` | 7-day chart, AI prediction tab, market comparison tab |
| Trends | `TrendsScreen.tsx` | Forecast tab + 30-day history chart + daily records |
| Alerts | `AlertsScreen.tsx` | Create, list, and delete price threshold alerts |
| Admin | `AdminScreen.tsx` | Trigger AI predictions, test NVIDIA NIM connectivity |

### Android Home-screen Widgets

| Widget | Size | Content |
|---|---|---|
| VegPriceWidget | 2×2 | Top rising vegetable with price and trend |
| MarketSummaryWidget | 4×2 | Six vegetables in a 2-column grid |
| DashboardWidget | 4×4 | Stats row + rising/falling vegetable columns |

### Build Commands

```bash
cd mobile

# Preview APK for sideloading / internal testing
eas build --platform android --profile preview

# Production AAB for Google Play Store
eas build --platform android --profile production

# Check SDK dependency compatibility
npx expo install --check
```

---

## Database Schema

All tables hosted on Supabase (PostgreSQL). Server-side writes use the service role key via Supabase PostgREST.

| Table | Purpose |
|---|---|
| `price_records` | Historical and current modal prices from mandi data |
| `predictions` | AI and ML price forecasts (authoritative source for all screens) |
| `price_alerts` | User-defined price threshold subscriptions |
| `model_metrics` | Per-vegetable per-model RMSE/MAE/MAPE logged after each retraining run |
| `weather_records` | Daily weather cache from Open-Meteo |
| `users` | Device registrations with FCM tokens |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Mobile framework | React Native | 0.81.5 |
| Mobile build | Expo SDK | 54.0.33 |
| Cloud builds | EAS Build | CLI 18.5 |
| Mobile language | TypeScript | 5.9.2 |
| UI library | React Native Paper (M3) | 5.12.3 |
| State management | Zustand + AsyncStorage | 4.5.2 |
| API (production) | Vercel Serverless | Python stdlib |
| API (local/docker) | FastAPI + Uvicorn | 0.111.0 |
| Database | Supabase (PostgreSQL) | — |
| Cache | Redis 7 | redis-py 5.0.4 |
| ML — boosting | XGBoost / LightGBM | 2.0.3 / 4.3.0 |
| ML — time series | Prophet | 1.1.5 |
| ML — deep learning | PyTorch (LSTM, TCN) | 2.3.0 |
| ML — baseline | scikit-learn | 1.4.2 |
| HPO | Optuna | 3.6.1 |
| LLM | NVIDIA NIM (Llama 3.1/3.3) | — |
| Vision | NVIDIA NIM (Llama 3.2-11B) | — |
| Monitoring | Prometheus Instrumentator | 7.0.0 |
| Logging | loguru | 0.7.2 |
| Lint / format | ruff / black | — |
| Type checking | mypy | — |
| Testing | pytest + pytest-asyncio | — |

---

## Development

### Running Tests

```bash
source venv/bin/activate

# Full test suite
pytest tests/ -v

# With HTML coverage report
pytest tests/ --cov=api --cov=src --cov-report=html

# Single file
pytest tests/test_api.py -v
```

### Code Quality

```bash
ruff check src/ api/ scripts/ --fix    # Lint and auto-fix
black src/ api/ scripts/               # Format
mypy src/ api/                         # Type check
tsc --noEmit -p mobile/tsconfig.json   # TypeScript check
```

---

## Supported Vegetables

18 vegetables tracked across Chennai markets:

| # | Slug | # | Slug | # | Slug |
|---|---|---|---|---|---|
| 1 | `tomato` | 7 | `brinjal` | 13 | `ladies_finger` |
| 2 | `onion` | 8 | `cabbage` | 14 | `bitter_gourd` |
| 3 | `potato` | 9 | `carrot` | 15 | `bottle_gourd` |
| 4 | `garlic` | 10 | `cauliflower` | 16 | `raw_banana` |
| 5 | `ginger` | 11 | `beans` | 17 | `drumstick` |
| 6 | `green_chilli` | 12 | `coriander` | 18 | `tapioca` |

---

## Known Limitations

- **Android only** — iOS requires an Apple Developer account and Mac build environment
- **No user authentication** — all API endpoints are currently public; Supabase Auth integration is planned
- **EAS free-tier queue** — cloud build wait times of 30–60 minutes on the free tier
- **Alert scheduling** — FCM alert records exist in Supabase but the server-side cron job evaluating prices against thresholds has not yet been deployed
- **Days 2–7 forecast** — only day 1 uses the AI prediction; multi-day LLM forecasting is planned

---

<div align="center">

Built for Chennai's vegetable markets · [Report a bug](https://github.com/nitheeshdr/Chennai-Vegetable-Price-Prediction-System/issues)

</div>
