# 🥦 Chennai Vegetable Price Prediction System

> An end-to-end ML platform that forecasts next-day vegetable prices across Chennai markets, featuring a multi-model ensemble, computer vision vegetable identification, real-time alerts, and a REST API — backed by a React Native mobile app.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Running the API](#running-the-api)
  - [Training Models](#training-models)
  - [Evaluating Models](#evaluating-models)
  - [Mobile App](#mobile-app)
- [API Reference](#api-reference)
- [ML Models](#ml-models)
- [Configuration](#configuration)
- [Development](#development)
- [License](#license)

---

## Overview

The **Chennai Vegetable Price Prediction System** (`vegprice`) helps farmers, traders, and consumers make data-driven decisions by predicting the next-day retail prices of 20+ vegetables across Chennai's major markets (Koyambedu, Thiruvallur, etc.).

Prices are influenced by seasonal cycles, festivals, rainfall, supply-chain disruptions, and market demand. This system captures all these factors through a multi-model ensemble combining classical ML, gradient boosting, time-series models, and deep learning — then exposes everything through a production-grade FastAPI backend and a cross-platform React Native mobile app.

---

## Features

| Feature | Description |
|---|---|
| 🔮 **Price Prediction** | Next-day price forecast for 20+ vegetables per market |
| 📈 **Trend Analytics** | Historical price trends, seasonality, and market comparisons |
| 📅 **Forecast Explorer** | Multi-day ahead forecasts with confidence intervals |
| 📸 **Vision Scan** | Upload a vegetable photo → get identified name + current price |
| 🔔 **Price Alerts** | Subscribe to alerts when a vegetable crosses a price threshold |
| 🏪 **Market Comparison** | Compare prices across multiple Chennai markets in real-time |
| 🔄 **Auto-Retraining** | Scheduled daily incremental retraining pipeline |
| 📊 **Prometheus Metrics** | Built-in observability via `/metrics` endpoint |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Native App                       │
│         (Expo · price screens · vision scanner)          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                        │
│  /predict  /vision  /prices  /forecast  /alerts  /analytics│
│  Rate Limiting · CORS · Auth · Prometheus Metrics        │
└──────┬─────────────────┬────────────────────────────────┘
       │                 │
┌──────▼──────┐  ┌───────▼───────────────────────────────┐
│  Supabase   │  │         ML Inference Pipeline           │
│  PostgreSQL │  │  Ensemble → XGBoost / LightGBM /       │
│  + Redis    │  │  Prophet / LSTM / Transformer / TCN    │
└─────────────┘  └────────────────────────────────────────┘
                                │
                 ┌──────────────▼──────────────────────┐
                 │        Vision Module (YOLOv8)         │
                 │     Vegetable Detection & ID          │
                 └─────────────────────────────────────┘
```

---

## Project Structure

```
model/
├── api/                        # FastAPI application
│   ├── main.py                 # App entry point, middleware, routers
│   ├── config.py               # Pydantic settings (env-driven)
│   ├── routers/                # Route handlers
│   │   ├── predictions.py      # POST /predict
│   │   ├── prices.py           # GET  /prices
│   │   ├── forecast.py         # GET  /forecast
│   │   ├── alerts.py           # POST /alerts
│   │   ├── analytics.py        # GET  /analytics
│   │   └── vision.py           # POST /vision/scan
│   ├── services/               # Business logic layer
│   │   ├── prediction_service.py
│   │   ├── price_service.py
│   │   ├── alert_service.py
│   │   ├── vision_service.py
│   │   └── notification_service.py
│   ├── schemas/                # Pydantic request/response models
│   └── db/                     # Database session & helpers
│
├── src/                        # Core ML library
│   ├── models/                 # Model implementations
│   │   ├── base_model.py       # Abstract base class
│   │   ├── baseline/           # Moving average, naive baselines
│   │   ├── boosting/           # XGBoost, LightGBM
│   │   ├── timeseries/         # Prophet
│   │   ├── deep_learning/      # LSTM, TCN, Transformer
│   │   └── ensemble/           # Stacking / voting ensemble
│   ├── pipeline/
│   │   ├── training_pipeline.py   # Full training workflow
│   │   ├── inference_pipeline.py  # Real-time inference
│   │   └── retraining.py          # Incremental daily retraining
│   ├── data/                   # Data loaders & feature engineering
│   ├── evaluation/             # Metrics, comparison reports
│   └── vision/                 # YOLOv8-based vegetable classifier
│
├── config/
│   ├── vegetables.yaml         # 20 vegetables, aliases, price ranges
│   ├── markets.yaml            # Chennai market definitions
│   ├── festivals.yaml          # Festival calendar (affects prices)
│   └── model_params.yaml       # Hyperparameters for all models
│
├── scripts/
│   ├── download_data.py        # Fetch historical data (Agmarknet, etc.)
│   ├── train_models.py         # Kick off training pipeline
│   ├── evaluate_models.py      # Model comparison report
│   └── seed_database.py        # Seed Supabase with historical prices
│
├── mobile/                     # React Native app (Expo)
│   ├── package.json
│   └── src/
│
├── deployment/
│   └── nginx/                  # Nginx reverse proxy config
│
├── tests/                      # Pytest test suite
├── notebooks/                  # EDA & experiment notebooks
├── pyproject.toml              # Project metadata, ruff, black, mypy, pytest
├── requirements.txt            # Production dependencies
├── requirements-dev.txt        # Dev/test dependencies
├── Makefile                    # Common task shortcuts
└── .env.example                # Environment variable template
```

---

## Tech Stack

### Backend & ML
| Layer | Technology |
|---|---|
| API Framework | FastAPI 0.111 + Uvicorn |
| Database | Supabase (PostgreSQL + asyncpg) |
| Cache | Redis |
| ORM / Migrations | SQLAlchemy 2 (async) + Alembic |
| Task Scheduling | APScheduler |
| Rate Limiting | SlowAPI |
| Observability | Prometheus + FastAPI Instrumentator |
| Auth | python-jose (JWT) + passlib (bcrypt) |

### Machine Learning
| Category | Libraries |
|---|---|
| Data | pandas, numpy, scipy |
| Classical ML | scikit-learn (Random Forest) |
| Gradient Boosting | XGBoost, LightGBM |
| Time Series | Prophet |
| Deep Learning | PyTorch, Einops |
| Computer Vision | Ultralytics YOLOv8, OpenCV, Albumentations |
| HPO | Optuna |

### Mobile
| | |
|---|---|
| Framework | React Native + Expo |

### Tooling
| | |
|---|---|
| Linting & Formatting | Ruff, Black |
| Type Checking | mypy |
| Testing | Pytest + pytest-asyncio |
| Python | 3.11+ |

---

## Getting Started

### Prerequisites

- Python **3.11+**
- Docker & Docker Compose (for local services)
- Node.js **18+** and npm/yarn (for mobile app)
- A [Supabase](https://supabase.com/) project (free tier works)
- A Redis instance (or use the one in Docker Compose)

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd model

# 2. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install production dependencies
make install

# 4. Install dev/test dependencies
make install-dev

# 5. Copy environment template and fill in your values
cp .env.example .env
```

### Environment Variables

Copy `.env.example` to `.env` and configure the following:

| Variable | Description | Example |
|---|---|---|
| `ENVIRONMENT` | `development` / `production` | `development` |
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql+asyncpg://...` |
| `SUPABASE_URL` | Your Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon/service key | `eyJ...` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `SECRET_KEY` | JWT signing secret | `your-very-secret-key` |
| `KAGGLE_USERNAME` | Kaggle username (for data download) | `john_doe` |
| `KAGGLE_KEY` | Kaggle API key | `abc123` |

---

## Usage

### Running the API

```bash
# Start backing services (PostgreSQL via Supabase + Redis) with Docker
make up

# Start FastAPI in dev mode with hot-reload
make api
# → API available at http://localhost:8000
# → Interactive docs at http://localhost:8000/docs
# → Metrics at http://localhost:8000/metrics
```

### Training Models

```bash
# Step 1 — Download historical price data (last 3 years)
make download

# Step 2 — Seed the database with historical prices
make seed

# Step 3 — Run full training pipeline (all models, all vegetables)
make train

# Step 3b — Incremental retraining only on new data
make retrain

# Step 4 — Generate model evaluation report
make evaluate
```

### Evaluating Models

```bash
make evaluate
# Outputs a comparison table with RMSE, MAE, MAPE for each model + vegetable
```

### Mobile App

```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go on your Android/iOS device
```

---

## API Reference

The full interactive API reference is available at **`/docs`** (Swagger UI) or **`/redoc`** when the server is running.

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API info & links |
| `GET` | `/health` | Health check |
| `POST` | `/predict` | Predict next-day price for a vegetable |
| `GET` | `/prices` | Current / historical prices |
| `GET` | `/forecast` | Multi-day price forecast |
| `POST` | `/vision/scan` | Identify vegetable from image + get price |
| `POST` | `/alerts` | Create a price threshold alert |
| `GET` | `/analytics` | Trend analytics & market comparison |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint |

### Example — Price Prediction

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

### Example — Vision Scan

```bash
curl -X POST http://localhost:8000/vision/scan \
  -F "image=@/path/to/vegetable.jpg"
```

```json
{
  "identified_vegetable": "brinjal",
  "confidence": 0.94,
  "current_price": 55.0,
  "unit": "kg",
  "market": "koyambedu"
}
```

---

## ML Models

The system trains and maintains **7 model types** per vegetable per market, then combines them in a stacking ensemble.

| Model | Type | Key Strength |
|---|---|---|
| **Random Forest** | Ensemble tree | Robust baseline, handles outliers |
| **XGBoost** | Gradient boosting | High accuracy, fast inference |
| **LightGBM** | Gradient boosting | Speed + memory efficiency |
| **Prophet** | Additive time series | Seasonality + holiday effects |
| **LSTM** | Deep learning (RNN) | Long-range sequential patterns |
| **TCN** | Deep learning (CNN) | Parallel training, dilated convolutions |
| **Transformer** | Deep learning (attention) | Complex temporal dependencies |
| **Ensemble** | Stacking | Best overall accuracy |

### Hyperparameter Tuning

All model hyperparameters are defined in `config/model_params.yaml`. Models are further tuned with **Optuna** (50 trials / 1-hour budget) during training.

### Data Split

- **70%** training (chronological — no random shuffle)
- **15%** validation
- **15%** test

---

## Configuration

All configuration lives in the `config/` directory and is version-controlled (no secrets).

| File | Purpose |
|---|---|
| `vegetables.yaml` | 20 supported vegetables with aliases and typical price ranges |
| `markets.yaml` | Chennai market definitions (name, location, type) |
| `festivals.yaml` | Festival calendar used as price-influencing features |
| `model_params.yaml` | Hyperparameters for all 7 model types + Optuna settings |

---

## Development

### Common Commands

```bash
make help          # Show all available commands
make install       # Install production deps
make install-dev   # Install dev/test deps
make api           # Run FastAPI dev server
make train         # Full model training
make evaluate      # Model evaluation report
make test          # Run pytest suite with coverage
make lint          # Ruff + Black auto-fix
make clean         # Remove __pycache__, processed data
```

### Running Tests

```bash
make test
# or
pytest tests/ -v --cov=src --cov=api --cov-report=term-missing
```

### Code Style

This project enforces:
- **Ruff** for linting (line length: 100, Python 3.11 target)
- **Black** for formatting (line length: 100)
- **mypy** for type checking

Run all checks at once:
```bash
make lint
```

---

## License

This project is proprietary. All rights reserved.

---

<p align="center">Built for Chennai's vegetable markets · Powered by Python 3.11 + FastAPI + PyTorch</p>
# agriculture-Price-Prediction
