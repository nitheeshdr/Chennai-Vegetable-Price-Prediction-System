"""
Inference pipeline: load trained model for a vegetable and produce predictions.
Used by the FastAPI backend for real-time predictions.
"""
from __future__ import annotations

import json
import pickle
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger

from src.data.feature_engineer import FeatureEngineer
from src.models.base_model import PredictionResult, get_trend
from src.models.ensemble.weighted_ensemble import WeightedEnsemble

ARTIFACT_DIR = Path("data/model_artifacts")
FEATURES_DIR = Path("data/features")
_MODEL_CACHE: dict[str, WeightedEnsemble] = {}


def _load_model(vegetable: str, artifact_dir: Path = ARTIFACT_DIR) -> WeightedEnsemble | None:
    if vegetable in _MODEL_CACHE:
        return _MODEL_CACHE[vegetable]

    ensemble_path = artifact_dir / vegetable / "ensemble.pkl"
    if not ensemble_path.exists():
        logger.warning(f"No ensemble model for {vegetable}")
        return None

    with open(ensemble_path, "rb") as f:
        data = pickle.load(f)

    # Rebuild component models
    from src.models.baseline.linear_regression import LinearRegressionModel
    from src.models.baseline.random_forest import RandomForestModel
    from src.models.boosting.xgboost_model import XGBoostModel
    from src.models.boosting.lightgbm_model import LightGBMModel
    from src.models.timeseries.prophet_model import ProphetModel
    from src.models.timeseries.lstm_model import LSTMModel
    from src.models.deep_learning.tcn_attention import TCNAttentionModel
    from src.models.deep_learning.transformer_model import TransformerModel

    name_to_cls = {
        "linear_regression": LinearRegressionModel,
        "random_forest": RandomForestModel,
        "xgboost": XGBoostModel,
        "lightgbm": LightGBMModel,
        "prophet": ProphetModel,
        "lstm": LSTMModel,
        "tcn_attention": TCNAttentionModel,
        "transformer": TransformerModel,
    }

    loaded_models = []
    for model_name in data.get("model_names", []):
        cls = name_to_cls.get(model_name)
        if cls is None:
            continue
        model = cls()
        ext = ".pt" if model_name in ("lstm", "tcn_attention", "transformer") else ".pkl"
        model_path = artifact_dir / vegetable / f"{model_name}{ext}"
        if model_path.exists():
            model.load(model_path)
            loaded_models.append(model)

    ensemble = WeightedEnsemble(loaded_models)
    ensemble.weights = data["weights"]
    ensemble._is_fitted = True
    _MODEL_CACHE[vegetable] = ensemble
    return ensemble


def _get_latest_features(
    vegetable: str, market: str | None = None
) -> pd.DataFrame | None:
    features_path = FEATURES_DIR / "all_features.parquet"
    if not features_path.exists():
        return None
    df = pd.read_parquet(features_path)
    mask = df["vegetable_name"] == vegetable
    if market:
        mask &= df["market_name"].str.lower() == market.lower()
    group = df[mask].sort_values("date")
    if len(group) == 0:
        return None
    return group


class InferencePipeline:
    def __init__(self, artifact_dir: Path = ARTIFACT_DIR):
        self.artifact_dir = Path(artifact_dir)
        self.feature_cols = FeatureEngineer.get_feature_columns()

    def predict(
        self,
        vegetable: str,
        market: str | None = None,
        prediction_date: date | None = None,
    ) -> PredictionResult | None:
        if prediction_date is None:
            prediction_date = date.today() + timedelta(days=1)

        model = _load_model(vegetable, self.artifact_dir)
        if model is None:
            return None

        df = _get_latest_features(vegetable, market)
        if df is None or len(df) == 0:
            return None

        # Use last 30 rows for inference (sequence models need history)
        recent = df.tail(30)
        try:
            preds, lower, upper = model.predict_with_interval(recent, self.feature_cols)
        except Exception as exc:
            logger.error(f"Prediction failed for {vegetable}: {exc}")
            return None

        if len(preds) == 0:
            return None

        predicted_price = float(preds[-1])
        current_price = float(recent["modal_price"].iloc[-1])
        trend = get_trend(current_price, predicted_price)

        return PredictionResult(
            vegetable=vegetable,
            prediction_date=prediction_date.isoformat(),
            predicted_price=predicted_price,
            confidence_lower=float(lower[-1]) if len(lower) > 0 else predicted_price * 0.9,
            confidence_upper=float(upper[-1]) if len(upper) > 0 else predicted_price * 1.1,
            trend=trend,
            model_name="ensemble",
        )

    def predict_weekly(
        self, vegetable: str, market: str | None = None
    ) -> list[PredictionResult]:
        """Predict 7 days ahead — uses Prophet if available, else repeats ensemble."""
        results = []
        # Try Prophet (supports native multi-step)
        prophet_path = self.artifact_dir / vegetable / "prophet.pkl"
        if prophet_path.exists():
            from src.models.timeseries.prophet_model import ProphetModel
            prophet = ProphetModel()
            prophet.load(prophet_path)
            forecast = prophet.forecast_future(periods=7)
            for _, row in forecast.iterrows():
                fd = pd.Timestamp(row["ds"]).date()
                current_price = self._get_current_price(vegetable, market)
                pred_price = max(float(row["yhat"]), 0)
                trend = get_trend(current_price or pred_price, pred_price)
                results.append(PredictionResult(
                    vegetable=vegetable,
                    prediction_date=fd.isoformat(),
                    predicted_price=pred_price,
                    confidence_lower=max(float(row["yhat_lower"]), 0),
                    confidence_upper=max(float(row["yhat_upper"]), 0),
                    trend=trend,
                    model_name="prophet",
                ))
        else:
            result = self.predict(vegetable, market)
            if result:
                for i in range(7):
                    d = date.today() + timedelta(days=i + 1)
                    results.append(PredictionResult(
                        vegetable=vegetable,
                        prediction_date=d.isoformat(),
                        predicted_price=result.predicted_price,
                        confidence_lower=result.confidence_lower,
                        confidence_upper=result.confidence_upper,
                        trend=result.trend,
                        model_name=result.model_name,
                    ))
        return results

    def _get_current_price(self, vegetable: str, market: str | None) -> float | None:
        df = _get_latest_features(vegetable, market)
        if df is None or len(df) == 0:
            return None
        return float(df["modal_price"].iloc[-1])
