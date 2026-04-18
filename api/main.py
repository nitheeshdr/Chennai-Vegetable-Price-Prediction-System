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
from fastapi.openapi.utils import get_openapi
from fastapi.responses import HTMLResponse, JSONResponse
from loguru import logger
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from api.config import settings
from api.routers import predictions, vision, prices, forecast, alerts, analytics
from api.routers import weather, vegetables, ai_predict, price_history

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
        "name": "weather",
        "description": (
            "Live Chennai weather data from Open-Meteo, including a plain-language "
            "commentary on how current conditions may affect vegetable prices."
        ),
    },
    {
        "name": "vegetables",
        "description": "Catalogue of all vegetables tracked by VegPrice AI, with aliases and typical price ranges.",
    },
    {
        "name": "ai-predictions",
        "description": (
            "AI-powered price predictions using **NVIDIA NIM** (Llama 3.1). "
            "Returns a natural-language explanation alongside the predicted price. "
            "Requires `NVIDIA_API_KEY` set via the Authorize button below."
        ),
    },
    {
        "name": "health",
        "description": "Health and liveness probes.",
    },
]

# ── App (docs_url=None so we serve custom Swagger UI HTML) ────────────────────
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
        "Most endpoints are public. The `/ai-predict` endpoint requires an **NVIDIA NIM API key** — "
        "click the **Authorize 🔓** button and paste your key under `NvidiaApiKey`.\n\n"
        "### Rate limiting\n"
        "Requests are limited per IP. Exceeding the limit returns `429 Too Many Requests`."
    ),
    version="1.0.0",
    contact={
        "name": "VegPrice AI Team",
        "email": "girishkrish17@gmail.com",
    },
    license_info={"name": "MIT"},
    openapi_tags=tags_metadata,
    docs_url=None,   # serve custom Swagger UI below
    redoc_url=None,
    lifespan=lifespan,
)


# ── Custom OpenAPI schema (adds security schemes) ─────────────────────────────
def _custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        contact=app.contact,
        license_info=app.license_info,
        tags=tags_metadata,
        routes=app.routes,
    )
    schema.setdefault("components", {})["securitySchemes"] = {
        "NvidiaApiKey": {
            "type": "apiKey",
            "in": "header",
            "name": "X-NVIDIA-API-Key",
            "description": "NVIDIA NIM API key — required for `/ai-predict`. "
                           "Get one at https://build.nvidia.com",
        },
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Supabase JWT — passed automatically by the mobile app for alert endpoints.",
        },
    }
    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = _custom_openapi  # type: ignore[method-assign]


# ── Custom Swagger UI HTML ────────────────────────────────────────────────────
_SWAGGER_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>VegPrice AI — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"/>
  <style>
    /* ── Brand colours ── */
    :root {
      --brand-green:   #2e7d32;
      --brand-light:   #43a047;
      --brand-accent:  #ff8f00;
      --brand-bg:      #f1f8e9;
      --header-height: 64px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fafafa; }

    /* ── Top header bar ── */
    #vegprice-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 0 28px;
      height: var(--header-height);
      background: var(--brand-green);
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    #vegprice-header .logo { font-size: 28px; line-height: 1; }
    #vegprice-header .brand-text h1 {
      color: #fff;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: .3px;
    }
    #vegprice-header .brand-text p {
      color: #c8e6c9;
      font-size: 12px;
      margin-top: 1px;
    }
    #vegprice-header .badge {
      margin-left: auto;
      background: var(--brand-accent);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      letter-spacing: .4px;
    }

    /* ── Swagger UI overrides ── */
    .swagger-ui .topbar { display: none; }

    .swagger-ui .info { margin: 24px 0 8px; }
    .swagger-ui .info .title { color: var(--brand-green); font-size: 28px; }
    .swagger-ui .info a { color: var(--brand-light); }

    /* Tag section headers */
    .swagger-ui .opblock-tag {
      border-bottom: 2px solid var(--brand-green) !important;
      color: var(--brand-green) !important;
      font-size: 15px !important;
      font-weight: 700 !important;
    }

    /* GET method colour */
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--brand-light) !important; }
    /* POST */
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: var(--brand-accent) !important; }
    /* DELETE */
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #c62828 !important; }

    /* Authorize button */
    .swagger-ui .btn.authorize {
      border-color: var(--brand-green) !important;
      color: var(--brand-green) !important;
    }
    .swagger-ui .btn.authorize svg { fill: var(--brand-green) !important; }

    /* Execute button */
    .swagger-ui .btn.execute { background: var(--brand-green) !important; border-color: var(--brand-green) !important; }

    /* Filter bar */
    .swagger-ui .filter-container { background: var(--brand-bg); border-radius: 6px; margin: 12px 0; }
    .swagger-ui .filter-container .filter input { border-color: var(--brand-green); }

    /* Model schema headers */
    .swagger-ui .model-title { color: var(--brand-green); }

    /* Response code 200 */
    .swagger-ui .response-col_status .response-undocumented { color: #888; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: var(--brand-green); border-radius: 3px; }
  </style>
</head>
<body>

<!-- Custom branded header -->
<div id="vegprice-header">
  <span class="logo">🥦</span>
  <div class="brand-text">
    <h1>VegPrice AI</h1>
    <p>Chennai Vegetable Price Prediction API</p>
  </div>
  <span class="badge">v1.0.0</span>
</div>

<div id="swagger-ui"></div>

<script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
<script>
  window.onload = function () {
    SwaggerUIBundle({
      url: "/openapi.json",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      plugins: [SwaggerUIBundle.plugins.DownloadUrl],
      layout: "StandaloneLayout",
      deepLinking: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 3,
      docExpansion: "list",
      filter: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      syntaxHighlight: { activate: true, theme: "nord" },
    });
  };
</script>
</body>
</html>"""


@app.get("/docs", include_in_schema=False)
async def swagger_ui_html():
    return HTMLResponse(_SWAGGER_HTML)

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
app.include_router(ai_predict.router)
app.include_router(vision.router)
app.include_router(prices.router)
app.include_router(price_history.router)
app.include_router(forecast.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(weather.router)
app.include_router(vegetables.router)


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
        "message": "VegPrice AI — Chennai Vegetable Price Prediction API",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "vegetables": "/vegetables",
            "weather": "/weather",
            "predict": "/predict?vegetable=tomato",
            "ai_predict": "/ai-predict?vegetable=tomato",
            "current_price": "/get-current-price?vegetable=tomato",
            "market_comparison": "/get-current-price/market-comparison?vegetable=tomato",
            "weekly_forecast": "/weekly-forecast?vegetable=tomato",
            "price_history": "/price-history?vegetable=tomato&days=30",
            "dashboard": "/dashboard",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
