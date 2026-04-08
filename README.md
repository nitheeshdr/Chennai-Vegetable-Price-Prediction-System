<div align="center">

# 🥦 VegPrice AI
### Chennai Vegetable Price Prediction System

*Predict. Scan. Alert. Trade smarter.*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

<br/>

> An end-to-end ML platform that forecasts next-day vegetable prices across Chennai markets —  
> powered by a 7-model ensemble, YOLOv8 vision scanning, real-time price alerts, and a React Native app.

<br/>

[🚀 Quick Start](#-quick-start) · [📖 API Docs](#-api-reference) · [🧠 ML Models](#-ml-models) · [📱 Mobile App](#-mobile-app)

</div>

---

## ✨ What It Does

```
📸 Snap a vegetable photo  →  🤖 AI identifies it  →  💰 Shows today's price + tomorrow's forecast
```

| | Feature | Description |
|---|---|---|
| 🔮 | **Price Prediction** | Next-day price forecast for 20+ vegetables across Chennai markets |
| 📸 | **Vision Scan** | Upload a vegetable photo → instant ID + price via YOLOv8 |
| 📈 | **Trend Analytics** | Historical trends, seasonality charts, market comparisons |
| 📅 | **Multi-day Forecast** | 7-day ahead forecasts with confidence intervals |
| 🔔 | **Smart Alerts** | Subscribe to threshold alerts — get notified when prices spike |
| 🏪 | **Market Comparison** | Compare prices across Koyambedu, Thiruvallur & more |
| 🔄 | **Auto-Retraining** | Scheduled daily incremental retraining pipeline |
| 📊 | **Observability** | Built-in Prometheus metrics + structured logging via Loguru |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   📱 React Native App (Expo)                 │
│             Price Screens · Vision Scanner · Alerts          │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST / HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│                     ⚡ FastAPI Backend                        │
│   /predict  /vision  /prices  /forecast  /alerts  /analytics │
│     Rate Limiting (SlowAPI) · JWT Auth · CORS · Prometheus   │
└──────┬───────────────────┬──────────────────────────────────┘
       │                   │
┌──────▼──────┐   ┌────────▼──────────────────────────────────┐
│  🐘 Supabase │   │          🧠 ML Inference Pipeline           │
│  PostgreSQL  │   │                                            │
│  + asyncpg   │   │  ┌──────────┐   ┌──────────┐              │
├──────────────┤   │  │ XGBoost  │   │ LightGBM │              │
│  ⚡ Redis     │   │  │  Prophet │   │   LSTM   │  → Ensemble  │
│  Cache Layer │   │  │    TCN   │   │ Transformer│             │
└─────────────┘   │  └──────────┘   └──────────┘              │
                  └────────────────────────────────────────────┘
                                   │
                  ┌────────────────▼────────────────────────────┐
                  │          👁️ Vision Module (YOLOv8)            │
                  │     Vegetable Detection · Classification      │
                  └─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

<details>
<summary><b>Click to expand full directory tree</b></summary>

```
agriculture-Price-Prediction/
│
├── 🌐 api/                          # FastAPI application
│   ├── main.py                      # App entry, middleware, routers
│   ├── config.py                    # Pydantic settings (env-driven)
│   ├── routers/                     # Route handlers
│   │   ├── predictions.py           # POST /predict
│   │   ├── prices.py                # GET  /prices
│   │   ├── forecast.py              # GET  /forecast
│   │   ├── alerts.py                # POST /alerts
│   │   ├── analytics.py             # GET  /analytics
│   │   └── vision.py                # POST /vision/scan
│   ├── services/                    # Business logic
│   │   ├── prediction_service.py
│   │   ├── price_service.py
│   │   ├── alert_service.py
│   │   ├── vision_service.py
│   │   └── notification_service.py
│   ├── schemas/                     # Pydantic request/response models
│   └── db/                          # Async DB session + ORM models
│
├── 🧠 src/                          # Core ML library
│   ├── models/
│   │   ├── baseline/                # Linear Regression, Random Forest
│   │   ├── boosting/                # XGBoost, LightGBM
│   │   ├── timeseries/              # Prophet, LSTM
│   │   ├── deep_learning/           # TCN, Transformer
│   │   └── ensemble/                # Weighted stacking ensemble
│   ├── pipeline/
│   │   ├── training_pipeline.py     # Full training workflow
│   │   ├── inference_pipeline.py    # Real-time inference
│   │   └── retraining.py            # Incremental daily retraining
│   ├── data/                        # Loaders, feature engineering
│   ├── evaluation/                  # Metrics, comparison reports
│   └── vision/                      # YOLOv8 classifier + detector
│
├── ⚙️ config/
│   ├── vegetables.yaml              # 20 vegetables, aliases, price ranges
│   ├── markets.yaml                 # Chennai market definitions
│   ├── festivals.yaml               # Festival calendar (price signals)
│   └── model_params.yaml            # Hyperparameters for all 7 models
│
├── 📜 scripts/
│   ├── download_data.py             # Fetch historical data
│   ├── train_models.py              # Kick off training pipeline
│   ├── evaluate_models.py           # Model comparison report
│   └── seed_database.py             # Seed Supabase with history
│
├── 📱 mobile/                       # React Native app (Expo)
├── 🚀 deployment/nginx/             # Nginx reverse proxy config
├── 🧪 tests/                        # Pytest suite
├── 📓 notebooks/                    # EDA & experiment notebooks
├── pyproject.toml                   # ruff · black · mypy · pytest config
├── requirements.txt                 # Production dependencies
├── requirements-dev.txt             # Dev / test dependencies
└── .env.example                     # Environment variable template
```

</details>

---

## 🚀 Quick Start

### Prerequisites

- Python **3.11+**
- Docker & Docker Compose
- Node.js **18+** (for mobile app)
- A [Supabase](https://supabase.com) project (free tier works)

### 1 — Clone & Install

```bash
git clone https://github.com/nitheeshdr/agriculture-Price-Prediction.git
cd agriculture-Price-Prediction

# Create virtualenv
python3 -m venv .venv && source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt   # dev deps
```

### 2 — Configure Environment

```bash
cp .env.example .env
# Edit .env with your Supabase, Redis, and API keys
```

<details>
<summary><b>Required environment variables</b></summary>

| Variable | Description | Example |
|---|---|---|
| `ENVIRONMENT` | `development` / `production` | `development` |
| `DATABASE_URL` | Supabase async connection string | `postgresql+asyncpg://...` |
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon / service key | `eyJ...` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `SECRET_KEY` | JWT signing secret | `your-secret-key` |
| `KAGGLE_USERNAME` | Kaggle username (data download) | `johndoe` |
| `KAGGLE_KEY` | Kaggle API key | `abc123` |

</details>

### 3 — Start Services & API

```bash
# Start PostgreSQL + Redis via Docker
docker compose -f deployment/docker-compose.yml up -d

# Seed the database with historical prices
python scripts/seed_database.py

# Launch FastAPI (hot-reload)
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

🎉 API live at **http://localhost:8000** · Docs at **http://localhost:8000/docs**

---

## 🧠 ML Models

The system trains **7 model types** per vegetable per market and combines them in a stacking ensemble.

| Model | Type | Key Strength |
|---|---|---|
| **Random Forest** | Ensemble tree | Robust baseline, handles outliers well |
| **XGBoost** | Gradient boosting | High accuracy, fast inference |
| **LightGBM** | Gradient boosting | Speed + memory efficiency |
| **Prophet** | Additive time series | Seasonality + festival/holiday effects |
| **LSTM** | Deep learning (RNN) | Long-range sequential patterns |
| **TCN** | Deep learning (CNN) | Parallel training, dilated convolutions |
| **Transformer** | Deep learning (attention) | Complex multi-variate temporal patterns |
| **🏆 Ensemble** | Weighted stacking | Best overall accuracy across all vegetables |

### Training Pipeline

```bash
# Download last 3 years of price data
python scripts/download_data.py --years 3

# Train all models for all vegetables
python scripts/train_models.py

# Incremental retrain (new data only)
python scripts/train_models.py --incremental

# Generate comparison report (RMSE · MAE · MAPE)
python scripts/evaluate_models.py
```

### Data Split *(chronological — no shuffle)*

```
├── 70% ──── Training
├── 15% ──── Validation
└── 15% ──── Test
```

Hyperparameters are managed in `config/model_params.yaml` and further tuned with **Optuna** (50 trials / 1-hour budget).

---

## 📖 API Reference

> Full interactive docs: **`/docs`** (Swagger) · **`/redoc`** (ReDoc)

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/predict` | Next-day price prediction |
| `GET` | `/prices` | Current & historical prices |
| `GET` | `/forecast` | Multi-day price forecast |
| `POST` | `/vision/scan` | Identify vegetable from image + price |
| `POST` | `/alerts` | Create a price threshold alert |
| `GET` | `/analytics` | Trend analytics & market comparison |
| `GET` | `/metrics` | Prometheus scrape endpoint |

### Examples

<details>
<summary><b>POST /predict — Price prediction</b></summary>

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "vegetable": "tomato",
    "market": "koyambedu",
    "date": "2025-07-15"
  }'
```

```json
{
  "vegetable": "tomato",
  "market": "koyambedu",
  "predicted_price": 42.5,
  "unit": "kg",
  "confidence_interval": [36.0, 49.0],
  "model_used": "ensemble"
}
```

</details>

<details>
<summary><b>POST /vision/scan — Vegetable image scan</b></summary>

```bash
curl -X POST http://localhost:8000/vision/scan \
  -F "image=@/path/to/vegetable.jpg"
```

```json
{
  "identified_vegetable": "brinjal",
  "confidence": 0.94,
  "current_price": 55.0,
  "predicted_tomorrow": 58.5,
  "unit": "kg",
  "market": "koyambedu"
}
```

</details>

---

## 📱 Mobile App

Built with **React Native + Expo**, the mobile app surfaces all API features on Android & iOS.

```bash
cd mobile
npm install
npx expo start
# Scan QR with Expo Go on your device
```

**Screens:** Home · Price Forecast · Vision Scanner · Analytics/Trends · Alerts

---

## 🛠️ Development

### All Commands

```bash
make help          # List all available commands
make install       # Install production deps
make install-dev   # Install dev/test deps
make api           # Start FastAPI dev server
make train         # Full model training
make retrain       # Incremental retraining
make evaluate      # Model comparison report
make test          # Run pytest with coverage
make lint          # Ruff + Black auto-fix
make seed          # Seed Supabase database
make clean         # Remove __pycache__, build artifacts
```

### Running Tests

```bash
pytest tests/ -v --cov=src --cov=api --cov-report=term-missing
```

### Code Quality

```bash
ruff check src/ api/ scripts/ --fix   # Lint
black src/ api/ scripts/              # Format
mypy src/ api/                        # Type check
```

> **Style:** Line length 100 · Python 3.11 target · All enforced via `pyproject.toml`

---

## 🥦 Supported Vegetables

<details>
<summary><b>20 vegetables tracked across Chennai markets</b></summary>

| Vegetable | Unit | Typical Range (₹/kg) |
|---|---|---|
| Tomato | kg | ₹10 – ₹120 |
| Onion | kg | ₹10 – ₹100 |
| Potato | kg | ₹15 – ₹80 |
| Brinjal | kg | ₹20 – ₹100 |
| Ladies Finger | kg | ₹30 – ₹120 |
| Beans | kg | ₹30 – ₹150 |
| Cabbage | kg | ₹10 – ₹60 |
| Carrot | kg | ₹20 – ₹100 |
| Cauliflower | kg | ₹20 – ₹120 |
| Bitter Gourd | kg | ₹30 – ₹120 |
| Bottle Gourd | kg | ₹15 – ₹60 |
| Ridge Gourd | kg | ₹20 – ₹80 |
| Snake Gourd | kg | ₹20 – ₹80 |
| Drumstick | kg | ₹40 – ₹200 |
| Raw Banana | kg | ₹20 – ₹80 |
| Tapioca | kg | ₹15 – ₹50 |
| Green Chilli | kg | ₹40 – ₹300 |
| Ginger | kg | ₹50 – ₹300 |
| Garlic | kg | ₹80 – ₹400 |
| Coriander | bunch | ₹5 – ₹50 |

</details>

---

## 📦 Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| API | FastAPI · Uvicorn · SlowAPI · python-jose |
| Database | Supabase · PostgreSQL · asyncpg · SQLAlchemy 2 · Alembic |
| Cache | Redis |
| Scheduling | APScheduler |
| ML | scikit-learn · XGBoost · LightGBM · Prophet · PyTorch |
| Vision | Ultralytics YOLOv8 · OpenCV · Albumentations |
| HPO | Optuna |
| Mobile | React Native · Expo |
| Observability | Prometheus · Loguru |
| Tooling | Ruff · Black · mypy · Pytest |

</div>

---

<div align="center">

Built with ❤️ for Chennai's vegetable markets

**[⬆ Back to top](#-vegprice-ai)**

</div>
