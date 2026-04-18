from __future__ import annotations

import json
import re
from datetime import date, timedelta

import httpx
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.config import settings
from api.schemas.responses import AIPredictionResponse

router = APIRouter(prefix="/ai-predict", tags=["ai-predictions"])

_NIM_BASE = "https://integrate.api.nvidia.com/v1"
_MODEL = "meta/llama-3.1-8b-instruct"

_SYSTEM_PROMPT = (
    "You are a vegetable price analyst for Chennai, India. "
    "Given a vegetable name and contextual factors, predict tomorrow's wholesale price in Rs/kg. "
    "Respond ONLY with a valid JSON object using exactly these keys: "
    '{"predicted_price": <number>, "reasoning": "<string>", "factors_considered": ["<string>", ...]}'
    " Do not include markdown fences or any text outside the JSON."
)


def _build_user_prompt(vegetable: str, prediction_date: str) -> str:
    return (
        f"Vegetable: {vegetable}\n"
        f"Prediction date: {prediction_date}\n"
        f"Location: Chennai, Tamil Nadu, India\n"
        "Context: APMC wholesale market. Consider typical seasonal patterns, "
        "demand trends, regional supply, and any known festival or harvest cycles.\n"
        "Provide a realistic price prediction for this vegetable tomorrow."
    )


@router.get(
    "",
    response_model=AIPredictionResponse,
    summary="AI-powered price prediction (NVIDIA NIM / Llama 3.1)",
    description=(
        "Uses **NVIDIA NIM** (hosted `meta/llama-3.1-8b-instruct`) to generate a "
        "natural-language price prediction for a vegetable based on seasonal patterns, "
        "regional supply dynamics, and market context.\n\n"
        "Unlike the `/predict` endpoint (pure ML ensemble), this endpoint reasons "
        "over qualitative factors and explains its prediction in plain English.\n\n"
        "**Requires** `NVIDIA_API_KEY` to be set in the server environment.\n\n"
        "**Example:** `GET /ai-predict?vegetable=tomato`"
    ),
    response_description="AI-predicted price with natural-language reasoning and key factors",
)
async def ai_predict(
    vegetable: str = Query(..., description="Vegetable name (e.g. `tomato`, `onion`)", examples=["tomato"]),
):
    if not settings.nvidia_api_key:
        raise HTTPException(
            status_code=503,
            detail="NVIDIA NIM API key not configured. Set NVIDIA_API_KEY in the server environment.",
        )

    prediction_date = (date.today() + timedelta(days=1)).isoformat()
    payload = {
        "model": _MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(vegetable, prediction_date)},
        ],
        "temperature": 0.3,
        "max_tokens": 300,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{_NIM_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.nvidia_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error(f"NVIDIA NIM error: {exc.response.text}")
        raise HTTPException(status_code=502, detail="AI service returned an error")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unreachable: {exc}")

    content = resp.json()["choices"][0]["message"]["content"].strip()

    # Strip optional markdown fences
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    try:
        parsed = json.loads(content)
        predicted_price = float(parsed["predicted_price"])
        reasoning = str(parsed.get("reasoning", ""))
        factors = list(parsed.get("factors_considered", []))
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        logger.error(f"Failed to parse NIM response: {content!r} — {exc}")
        raise HTTPException(status_code=502, detail="AI service returned an unparseable response")

    return AIPredictionResponse(
        vegetable=vegetable.lower().replace(" ", "_"),
        prediction_date=prediction_date,
        predicted_price=predicted_price,
        reasoning=reasoning,
        model=_MODEL,
        factors_considered=factors,
    )
