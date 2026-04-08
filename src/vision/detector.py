"""
YOLOv8 vegetable detector — used when image has multiple objects.
Falls back to classifier for single-object images.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from loguru import logger
from PIL import Image

YOLO_MODEL_PATH = Path("data/model_artifacts/vegetable_yolo.pt")


class VegetableDetector:
    def __init__(self, model_path: Path | str | None = None):
        self.model_path = Path(model_path or YOLO_MODEL_PATH)
        self._model = None

    def load(self) -> None:
        from ultralytics import YOLO
        if self.model_path.exists():
            self._model = YOLO(str(self.model_path))
            logger.info(f"YOLOv8 detector loaded from {self.model_path}")
        else:
            # Use pretrained YOLOv8n as fallback (no vegetable fine-tuning)
            self._model = YOLO("yolov8n.pt")
            logger.warning("YOLOv8 custom weights not found — using pretrained YOLOv8n")

    def detect(self, image: Image.Image | str | Path) -> list[dict]:
        if self._model is None:
            self.load()
        if isinstance(image, (str, Path)):
            image = Image.open(image)
        results = self._model(np.array(image), verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = r.names[cls_id]
                xyxy = box.xyxy[0].cpu().numpy().tolist()
                detections.append({
                    "label": label,
                    "confidence": conf,
                    "bbox": xyxy,
                })
        return sorted(detections, key=lambda x: x["confidence"], reverse=True)

    def detect_bytes(self, image_bytes: bytes) -> list[dict]:
        import io
        image = Image.open(io.BytesIO(image_bytes))
        return self.detect(image)
