from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml
from fastapi import APIRouter
from api.schemas.responses import VegetableInfo, VegetablesListResponse

router = APIRouter(prefix="/vegetables", tags=["vegetables"])

_CONFIG_PATH = Path("config/vegetables.yaml")


@lru_cache(maxsize=1)
def _load_vegetables() -> list[VegetableInfo]:
    with open(_CONFIG_PATH) as f:
        cfg = yaml.safe_load(f)
    result = []
    for v in cfg["vegetables"]:
        lo, hi = v.get("typical_price_range", [0, 0])
        result.append(
            VegetableInfo(
                name=v["name"],
                aliases=v.get("aliases", []),
                unit=v.get("unit", "kg"),
                typical_price_min=float(lo),
                typical_price_max=float(hi),
            )
        )
    return result


@router.get(
    "",
    response_model=VegetablesListResponse,
    summary="List all supported vegetables",
    description=(
        "Returns every vegetable tracked by the VegPrice AI system, along with its "
        "canonical name, known dataset aliases, unit of measurement, and the typical "
        "wholesale price range observed in Chennai markets.\n\n"
        "Use the `name` field as the `vegetable` parameter in all other endpoints."
    ),
    response_description="Full list of supported vegetables with metadata",
)
async def list_vegetables():
    vegetables = _load_vegetables()
    return VegetablesListResponse(total=len(vegetables), vegetables=vegetables)
