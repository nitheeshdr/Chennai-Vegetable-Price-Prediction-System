from __future__ import annotations

from loguru import logger

from src.vision.classifier import VegetableClassifier
from src.vision.detector import VegetableDetector

_classifier: VegetableClassifier | None = None
_detector: VegetableDetector | None = None


def _get_classifier() -> VegetableClassifier:
    global _classifier
    if _classifier is None:
        _classifier = VegetableClassifier()
        _classifier.load()
    return _classifier


def _get_detector() -> VegetableDetector:
    global _detector
    if _detector is None:
        _detector = VegetableDetector()
        _detector.load()
    return _detector


async def identify_vegetable(image_bytes: bytes) -> dict:
    try:
        classifier = _get_classifier()
        result = classifier.predict_bytes(image_bytes)
        return result
    except FileNotFoundError as exc:
        logger.warning(f"Classifier not trained yet: {exc}")
        return {
            "top_prediction": "unknown",
            "confidence": 0.0,
            "top_k": [],
            "error": "Vision model not trained. Run: python scripts/train_models.py --vision",
        }
    except Exception as exc:
        logger.error(f"Vision inference error: {exc}")
        return {"top_prediction": "unknown", "confidence": 0.0, "top_k": [], "error": str(exc)}
