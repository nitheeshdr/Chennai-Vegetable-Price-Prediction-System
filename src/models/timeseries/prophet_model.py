"""
Facebook Prophet model — one model per vegetable, handles seasonality natively.
"""
from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger

from src.models.base_model import BaseModel


class ProphetModel(BaseModel):
    name = "prophet"

    def __init__(self, params: dict | None = None):
        super().__init__(params)
        self._model = None

    def _build_prophet(self):
        from prophet import Prophet
        return Prophet(
            changepoint_prior_scale=self.params.get("changepoint_prior_scale", 0.05),
            seasonality_prior_scale=self.params.get("seasonality_prior_scale", 10.0),
            holidays_prior_scale=self.params.get("holidays_prior_scale", 10.0),
            seasonality_mode=self.params.get("seasonality_mode", "multiplicative"),
            yearly_seasonality=self.params.get("yearly_seasonality", True),
            weekly_seasonality=self.params.get("weekly_seasonality", True),
            daily_seasonality=False,
        )

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            prophet_df = pd.DataFrame({
                "ds": pd.to_datetime(train["date"]),
                "y": train[target_col].values,
            })
            self._model = self._build_prophet()
            self._model.fit(prophet_df)
            self._is_fitted = True

    def predict(self, X, feature_cols=None):
        future = pd.DataFrame({"ds": pd.to_datetime(X["date"])})
        forecast = self._model.predict(future)
        preds = forecast["yhat"].values
        return np.clip(preds, 0, None)

    def predict_with_interval(self, X, feature_cols=None, interval_width=0.9):
        future = pd.DataFrame({"ds": pd.to_datetime(X["date"])})
        forecast = self._model.predict(future)
        preds = np.clip(forecast["yhat"].values, 0, None)
        lower = np.clip(forecast["yhat_lower"].values, 0, None)
        upper = np.clip(forecast["yhat_upper"].values, 0, None)
        return preds, lower, upper

    def forecast_future(self, periods: int = 7) -> pd.DataFrame:
        future = self._model.make_future_dataframe(periods=periods)
        forecast = self._model.predict(future)
        return forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(periods)

    def save(self, path: Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self._model, f)

    def load(self, path: Path) -> None:
        path = Path(path)
        with open(path, "rb") as f:
            self._model = pickle.load(f)
        self._is_fitted = True
