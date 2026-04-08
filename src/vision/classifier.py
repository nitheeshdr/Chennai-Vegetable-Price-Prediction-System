"""
EfficientNet-B4 vegetable image classifier.
Fine-tuned on vegetable image dataset; exported as TorchScript for production.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import yaml
from loguru import logger
from PIL import Image

from src.vision.augmentation import get_inference_transforms

VEGETABLES_CONFIG = Path("config/vegetables.yaml")
DEFAULT_MODEL_PATH = Path("data/model_artifacts/vegetable_classifier.pt")


def _load_class_names(config_path: Path = VEGETABLES_CONFIG) -> list[str]:
    with open(config_path) as f:
        cfg = yaml.safe_load(f)
    return [v["name"] for v in cfg["vegetables"]]


def build_efficientnet(num_classes: int, pretrained: bool = True) -> nn.Module:
    from torchvision.models import efficientnet_b4, EfficientNet_B4_Weights
    weights = EfficientNet_B4_Weights.IMAGENET1K_V1 if pretrained else None
    model = efficientnet_b4(weights=weights)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(in_features, 512),
        nn.SiLU(),
        nn.Dropout(0.3),
        nn.Linear(512, num_classes),
    )
    return model


class VegetableClassifier:
    def __init__(
        self,
        model_path: Path | str | None = None,
        class_names: list[str] | None = None,
        device: str | None = None,
    ):
        self.model_path = Path(model_path or DEFAULT_MODEL_PATH)
        self.class_names = class_names or _load_class_names()
        self.device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self._model: nn.Module | None = None
        self._transforms = get_inference_transforms()

    def load(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Classifier model not found: {self.model_path}. "
                "Run: python scripts/train_models.py --vision"
            )
        logger.info(f"Loading vegetable classifier from {self.model_path}")
        try:
            # Try TorchScript first
            self._model = torch.jit.load(str(self.model_path), map_location=self.device)
        except Exception:
            # Fallback: raw checkpoint
            checkpoint = torch.load(self.model_path, map_location=self.device)
            self._model = build_efficientnet(len(self.class_names), pretrained=False)
            self._model.load_state_dict(checkpoint.get("state_dict", checkpoint))
        self._model.eval().to(self.device)
        logger.info(f"Classifier loaded: {len(self.class_names)} classes")

    def _preprocess(self, image: Image.Image) -> torch.Tensor:
        img_array = np.array(image.convert("RGB"))
        transformed = self._transforms(image=img_array)
        return transformed["image"].unsqueeze(0).to(self.device)

    def predict(
        self, image: Image.Image | str | Path, top_k: int = 3
    ) -> dict:
        if self._model is None:
            self.load()

        if isinstance(image, (str, Path)):
            image = Image.open(image)

        tensor = self._preprocess(image)
        with torch.no_grad():
            logits = self._model(tensor)
            probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()

        top_indices = probs.argsort()[::-1][:top_k]
        results = [
            {"vegetable": self.class_names[i], "confidence": float(probs[i])}
            for i in top_indices
        ]
        return {
            "top_prediction": results[0]["vegetable"],
            "confidence": results[0]["confidence"],
            "top_k": results,
        }

    def predict_bytes(self, image_bytes: bytes, top_k: int = 3) -> dict:
        import io
        image = Image.open(io.BytesIO(image_bytes))
        return self.predict(image, top_k=top_k)
