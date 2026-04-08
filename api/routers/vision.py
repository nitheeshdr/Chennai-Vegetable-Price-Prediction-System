from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from api.schemas.responses import ScanResponse
from api.services.vision_service import identify_vegetable
from api.services.prediction_service import get_prediction
from api.services.price_service import get_current_price

router = APIRouter(prefix="/scan-image", tags=["vision"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10


@router.post("", response_model=ScanResponse)
async def scan_vegetable_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {file.content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image too large (max {MAX_SIZE_MB}MB)")

    # Identify vegetable
    vision_result = await identify_vegetable(image_bytes)
    vegetable = vision_result.get("top_prediction", "unknown")

    prediction = None
    current = None

    if vegetable != "unknown":
        prediction = await get_prediction(vegetable)
        current = await get_current_price(vegetable)

    return ScanResponse(
        vegetable_detected=vegetable,
        confidence=vision_result.get("confidence", 0.0),
        top_k=vision_result.get("top_k", []),
        prediction=prediction,
        current_price=current,
    )
