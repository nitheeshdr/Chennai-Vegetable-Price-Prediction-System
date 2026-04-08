from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

from src.models.base_model import BaseModel


class LinearRegressionModel(BaseModel):
    name = "linear_regression"

    def __init__(self, params: dict | None = None):
        super().__init__(params)
        alpha = self.params.get("alpha", 1.0)
        self._model = Ridge(alpha=alpha, fit_intercept=True)

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        X = self._get_features(train, feature_cols).fillna(0)
        y = train[target_col].values
        self._model.fit(X, y)
        self._is_fitted = True

    def predict(self, X, feature_cols=None):
        Xf = self._get_features(X, feature_cols).fillna(0)
        preds = self._model.predict(Xf)
        return np.clip(preds, 0, None)

    def predict_with_interval(self, X, feature_cols=None, interval_width=0.9):
        preds = self.predict(X, feature_cols)
        # Ridge has no native CI — use ±15% as uncertainty
        margin = preds * 0.15
        return preds, preds - margin, preds + margin
