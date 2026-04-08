from __future__ import annotations

import httpx
from loguru import logger

from api.config import settings


async def send_push_notification(token: str, title: str, body: str) -> bool:
    if not settings.fcm_server_key:
        logger.warning("FCM_SERVER_KEY not configured — push notifications disabled")
        return False
    payload = {
        "to": token,
        "notification": {"title": title, "body": body},
        "priority": "high",
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://fcm.googleapis.com/fcm/send",
                json=payload,
                headers={"Authorization": f"key={settings.fcm_server_key}"},
                timeout=10,
            )
            if resp.status_code == 200:
                logger.info(f"Push sent to {token[:20]}...: {title}")
                return True
            logger.warning(f"FCM returned {resp.status_code}: {resp.text[:200]}")
    except Exception as exc:
        logger.error(f"Push notification failed: {exc}")
    return False
