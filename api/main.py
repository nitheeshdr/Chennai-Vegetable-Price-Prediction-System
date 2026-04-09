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


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Chennai Vegetable Price Prediction API",
    description=(
        "Predict next-day vegetable prices in Chennai, scan vegetable images, "
        "get price trends and market comparisons."
    ),
    version="1.0.0",
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
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/", tags=["health"])
async def root():
    return {
        "message": "Chennai Vegetable Price Prediction API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
