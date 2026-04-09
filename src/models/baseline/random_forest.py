from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from src.models.base_model import BaseModel


class RandomForestModel(BaseModel):
    name = "random_forest"

    def __init__(self, params: dict | None = None):
        super().__init__(params)
        self._model = RandomForestRegressor(
            n_estimators=self.params.get("n_estimators", 300),
            max_depth=self.params.get("max_depth", 12),
            min_samples_leaf=self.params.get("min_samples_leaf", 5),
            n_jobs=self.params.get("n_jobs", -1),
            random_state=self.params.get("random_state", 42),
        )

    def load(self, path) -> None:
        super().load(path)
        if hasattr(self._model, 'n_jobs'):
            self._model.n_jobs = 1

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        X = self._get_features(train, feature_cols).fillna(0)
        y = train[target_col].values
        self._model.fit(X, y)
        self._is_fitted = True

    def predict(self, X, feature_cols=None):
        Xf = self._get_features(X, feature_cols).fillna(0).values
        return np.clip(self._model.predict(Xf), 0, None)

    def predict_with_interval(self, X, feature_cols=None, interval_width=0.9):
        Xf = self._get_features(X, feature_cols).fillna(0).values  # numpy to silence feature-name warnings
        # Aggregate individual tree predictions for a natural CI
        tree_preds = np.stack(
            [tree.predict(Xf) for tree in self._model.estimators_], axis=0
        )
        lower_q = (1 - interval_width) / 2 * 100
        upper_q = (1 + interval_width) / 2 * 100
        preds = tree_preds.mean(axis=0)
        lower = np.percentile(tree_preds, lower_q, axis=0)
        upper = np.percentile(tree_preds, upper_q, axis=0)
        return (
            np.clip(preds, 0, None),
            np.clip(lower, 0, None),
            np.clip(upper, 0, None),
        )
