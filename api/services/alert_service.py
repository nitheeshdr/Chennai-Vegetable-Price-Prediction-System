from __future__ import annotations

import uuid
from loguru import logger

from api.db.database import get_supabase
from api.schemas.responses import AlertResponse


async def create_alert(
    user_id: str,
    vegetable_name: str,
    threshold_price: float,
    direction: str,
    market_name: str | None = None,
    device_token: str | None = None,
) -> AlertResponse:
    supabase = get_supabase()
    alert_id = str(uuid.uuid4())

    # Upsert user
    supabase.table("users").upsert(
        {"id": user_id, "device_token": device_token}, on_conflict="id"
    ).execute()

    # Create alert
    supabase.table("price_alerts").insert({
        "id": alert_id,
        "user_id": user_id,
        "vegetable_name": vegetable_name,
        "threshold_price": threshold_price,
        "direction": direction,
        "market_name": market_name,
        "is_active": True,
    }).execute()

    return AlertResponse(
        id=alert_id,
        vegetable_name=vegetable_name,
        threshold_price=threshold_price,
        direction=direction,
        market_name=market_name,
        is_active=True,
    )


async def get_user_alerts(user_id: str) -> list[AlertResponse]:
    supabase = get_supabase()
    result = (
        supabase.table("price_alerts")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    return [
        AlertResponse(
            id=row["id"],
            vegetable_name=row["vegetable_name"],
            threshold_price=row["threshold_price"],
            direction=row["direction"],
            market_name=row.get("market_name"),
            is_active=row["is_active"],
        )
        for row in (result.data or [])
    ]


async def delete_alert(alert_id: str) -> bool:
    supabase = get_supabase()
    supabase.table("price_alerts").update({"is_active": False}).eq("id", alert_id).execute()
    return True


async def check_and_trigger_alerts() -> None:
    """Called periodically to check prices and send notifications."""
    from api.services.notification_service import send_push_notification
    from api.services.price_service import get_current_price

    supabase = get_supabase()
    alerts_result = supabase.table("price_alerts").select("*").eq("is_active", True).execute()
    alerts = alerts_result.data or []

    for alert in alerts:
        price_resp = await get_current_price(alert["vegetable_name"], alert.get("market_name"))
        if price_resp is None:
            continue

        current = price_resp.modal_price
        threshold = alert["threshold_price"]
        direction = alert["direction"]

        triggered = (direction == "above" and current >= threshold) or \
                    (direction == "below" and current <= threshold)

        if triggered:
            user_result = (
                supabase.table("users").select("device_token").eq("id", alert["user_id"]).execute()
            )
            user_data = user_result.data
            if user_data and user_data[0].get("device_token"):
                token = user_data[0]["device_token"]
                msg = (
                    f"{alert['vegetable_name'].title()} price is ₹{current:.0f}/kg "
                    f"({'above' if direction == 'above' else 'below'} your alert of ₹{threshold:.0f})"
                )
                await send_push_notification(token, "Price Alert 🔔", msg)
