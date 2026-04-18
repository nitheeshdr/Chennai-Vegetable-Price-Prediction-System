from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException, Path, Query
from pydantic import BaseModel, Field

from api.schemas.responses import AlertResponse
from api.services.alert_service import create_alert, delete_alert, get_user_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


class CreateAlertRequest(BaseModel):
    user_id: str = Field(..., description="Supabase Auth user identifier", examples=["user_abc123"])
    vegetable_name: str = Field(..., description="Vegetable to monitor", examples=["tomato"])
    threshold_price: float = Field(..., description="Price threshold (Rs/kg) that triggers the alert", examples=[50.0])
    direction: str = Field(..., description="Fire alert when price goes `above` or `below` the threshold", examples=["above"])
    market_name: str | None = Field(None, description="Restrict monitoring to this market. Omit for any market.", examples=["koyambedu"])
    device_token: str | None = Field(None, description="FCM device token for push notifications")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "user_id": "user_abc123",
                    "vegetable_name": "tomato",
                    "threshold_price": 50.0,
                    "direction": "above",
                    "market_name": "koyambedu",
                    "device_token": "fcm-token-here",
                }
            ]
        }
    }


@router.post(
    "",
    response_model=AlertResponse,
    status_code=201,
    summary="Create a price alert",
    description=(
        "Register a price-threshold alert for a vegetable. "
        "When the monitored price crosses the threshold in the specified direction, "
        "a push notification is sent to the device via **Firebase Cloud Messaging (FCM)**.\n\n"
        "`direction` must be either `above` or `below`."
    ),
    response_description="Newly created alert record",
)
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


@router.get(
    "/{user_id}",
    response_model=list[AlertResponse],
    summary="List alerts for a user",
    description="Returns all active and inactive price alerts belonging to the given user.",
    response_description="Array of alert records (may be empty)",
)
async def list_alerts(user_id: str = Path(..., description="Supabase Auth user identifier", examples=["user_abc123"])):
    return await get_user_alerts(user_id)


@router.delete(
    "/{alert_id}",
    status_code=204,
    summary="Delete an alert",
    description="Permanently deletes the alert with the given ID. Returns `204 No Content` on success.",
)
async def remove_alert(alert_id: str = Path(..., description="UUID of the alert to delete", examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"])):
    await delete_alert(alert_id)
