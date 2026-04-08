"""
Abstract base class for all price prediction models.
Every model must implement: fit, predict, save, load.
"""
from __future__ import annotations

import pickle
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from loguru import logger


class PredictionResult:
    def __init__(
        self,
        vegetable: str,
        prediction_date: str,
        predicted_price: float,
        confidence_lower: float,
        confidence_upper: float,
        trend: str,
        model_name: str,
    ):
        self.vegetable = vegetable
        self.prediction_date = prediction_date
        self.predicted_price = round(predicted_price, 2)
        self.confidence_lower = round(confidence_lower, 2)
        self.confidence_upper = round(confidence_upper, 2)
        self.trend = trend  # "up" | "down" | "stable"
        self.model_name = model_name

    def to_dict(self) -> dict:
        return {
            "vegetable": self.vegetable,
            "prediction_date": self.prediction_date,
            "predicted_price": self.predicted_price,
            "confidence_lower": self.confidence_lower,
            "confidence_upper": self.confidence_upper,
            "trend": self.trend,
            "model_name": self.model_name,
        }


def get_trend(current_price: float, predicted_price: float, threshold: float = 0.03) -> str:
    if predicted_price > current_price * (1 + threshold):
        return "up"
    elif predicted_price < current_price * (1 - threshold):
        return "down"
    return "stable"


class BaseModel(ABC):
    name: str = "base"

    def __init__(self, params: dict | None = None):
        self.params = params or {}
        self._model: Any = None
        self._is_fitted = False

    @abstractmethod
    def fit(
        self,
        train: pd.DataFrame,
        val: pd.DataFrame | None = None,
        feature_cols: list[str] | None = None,
        target_col: str = "target_price",
    ) -> None:
        ...

    @abstractmethod
    def predict(self, X: pd.DataFrame, feature_cols: list[str] | None = None) -> np.ndarray:
        ...

    def predict_with_interval(
        self,
        X: pd.DataFrame,
        feature_cols: list[str] | None = None,
        interval_width: float = 0.9,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Returns (predictions, lower_bound, upper_bound).
        Default: symmetric ±10% interval — subclasses should override."""
        preds = self.predict(X, feature_cols)
        margin = preds * 0.10
        return preds, preds - margin, preds + margin

    def save(self, path: Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self._model, f)
        logger.info(f"Saved {self.name} → {path}")

    def load(self, path: Path) -> None:
        path = Path(path)
        with open(path, "rb") as f:
            self._model = pickle.load(f)
        self._is_fitted = True
        logger.info(f"Loaded {self.name} ← {path}")

    @staticmethod
    def _get_features(df: pd.DataFrame, feature_cols: list[str] | None) -> pd.DataFrame:
        if feature_cols is not None:
            available = [c for c in feature_cols if c in df.columns]
            return df[available]
        from src.data.feature_engineer import FeatureEngineer
        cols = [c for c in FeatureEngineer.get_feature_columns() if c in df.columns]
        return df[cols]
