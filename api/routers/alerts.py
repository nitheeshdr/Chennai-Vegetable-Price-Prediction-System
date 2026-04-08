from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Path, Query
from pydantic import BaseModel

from api.schemas.responses import AlertResponse
from api.services.alert_service import create_alert, delete_alert, get_user_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


class CreateAlertRequest(BaseModel):
    user_id: str
    vegetable_name: str
    threshold_price: float
    direction: str  # "above" | "below"
    market_name: str | None = None
    device_token: str | None = None


@router.post("", response_model=AlertResponse, status_code=201)
async def create_price_alert(body: CreateAlertRequest):
    if body.direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail="direction must be 'above' or 'below'")
    return await create_alert(
        user_id=body.user_id,
        vegetable_name=body.vegetable_name.lower().replace(" ", "_"),
        threshold_price=body.threshold_price,
        direction=body.direction,
        market_name=body.market_name,
        device_token=body.device_token,
    )


@router.get("/{user_id}", response_model=list[AlertResponse])
async def list_alerts(user_id: str = Path(...)):
    return await get_user_alerts(user_id)


@router.delete("/{alert_id}", status_code=204)
async def remove_alert(alert_id: str = Path(...)):
    await delete_alert(alert_id)
