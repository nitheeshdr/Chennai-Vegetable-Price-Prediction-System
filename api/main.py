"""
FastAPI application entry point.
"""
from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

# Disable OpenMP multi-threading before ML libs are imported
# to prevent SIGSEGV crashes when running inside async server
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from api.config import settings
from api.routers import predictions, vision, prices, forecast, alerts, analytics

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── App lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting VegPrice API...")
    logger.info("API ready")
    yield
    logger.info("Shutting down VegPrice API")


# ── OpenAPI tag metadata ──────────────────────────────────────────────────────
tags_metadata = [
    {
        "name": "predictions",
        "description": (
            "ML-powered next-day price predictions for vegetables in Chennai markets. "
            "Uses an ensemble of XGBoost, LightGBM, and Prophet models."
        ),
    },
    {
        "name": "vision",
        "description": (
            "Scan a vegetable image (JPEG/PNG/WebP, max 10 MB) using a YOLOv8 model "
            "to identify the vegetable and instantly fetch its current price and prediction."
        ),
    },
    {
        "name": "prices",
        "description": (
            "Retrieve the latest recorded market prices for a vegetable, "
            "optionally filtered by market, and compare prices across all tracked markets."
        ),
    },
    {
        "name": "forecast",
        "description": "7-day price forecast for a vegetable, powered by the same ML ensemble.",
    },
    {
        "name": "alerts",
        "description": (
            "Create, list, and delete price-threshold alerts. "
            "Push notifications are sent via FCM when the threshold is crossed."
        ),
    },
    {
        "name": "analytics",
        "description": "Aggregated dashboard stats: top rising/falling vegetables and all predictions.",
    },
    {
        "name": "health",
        "description": "Health and liveness probes.",
    },
]

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VegPrice AI — Chennai Vegetable Price Prediction API",
    description=(
        "## Overview\n\n"
        "**VegPrice AI** predicts next-day vegetable prices across Chennai markets "
        "using an ML ensemble (XGBoost · LightGBM · Prophet) trained on historical "
        "APMC price data.\n\n"
        "### Key features\n"
        "- 📈 **Price predictions** — next-day & 7-day forecasts with confidence intervals\n"
        "- 📷 **Vision scan** — identify a vegetable from a photo and get its live price\n"
        "- 🏪 **Market comparison** — compare prices across Koyambedu, Parrys, and more\n"
        "- 🔔 **Price alerts** — FCM push notifications when a threshold is crossed\n"
        "- 📊 **Dashboard** — top rising/falling vegetables at a glance\n\n"
        "### Authentication\n"
        "Most endpoints are public. Alert creation requires a valid `user_id` "
        "(managed by Supabase Auth on the mobile client).\n\n"
        "### Rate limiting\n"
        "Requests are limited per IP. Exceeding the limit returns `429 Too Many Requests`."
    ),
    version="1.0.0",
    contact={
        "name": "VegPrice AI Team",
        "email": "girishkrish17@gmail.com",
    },
    license_info={
        "name": "MIT",
    },
    openapi_tags=tags_metadata,
    swagger_ui_parameters={
        "defaultModelsExpandDepth": 2,
        "defaultModelExpandDepth": 3,
        "docExpansion": "list",
        "filter": True,
        "tryItOutEnabled": True,
    },
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(predictions.router)
app.include_router(vision.router)
app.include_router(prices.router)
app.include_router(forecast.router)
app.include_router(alerts.router)
app.include_router(analytics.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get(
    "/health",
    tags=["health"],
    summary="Health check",
    description="Returns `200 OK` when the API process is running. Use this as a liveness probe.",
    response_description="Service status and active environment name",
)
async def health():
    return {"status": "ok", "environment": settings.environment}


@app.get(
    "/",
    tags=["health"],
    summary="API root",
    description="Returns a welcome message and links to the interactive docs and health endpoint.",
    response_description="Welcome message with useful links",
)
async def root():
    return {
        "message": "Chennai Vegetable Price Prediction API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
