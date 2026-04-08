from __future__ import annotations

import numpy as np
import pandas as pd
import xgboost as xgb

from src.models.base_model import BaseModel


class XGBoostModel(BaseModel):
    name = "xgboost"

    def __init__(self, params: dict | None = None):
        super().__init__(params)
        self._model = xgb.XGBRegressor(
            n_estimators=self.params.get("n_estimators", 500),
            learning_rate=self.params.get("learning_rate", 0.05),
            max_depth=self.params.get("max_depth", 6),
            subsample=self.params.get("subsample", 0.8),
            colsample_bytree=self.params.get("colsample_bytree", 0.8),
            reg_alpha=self.params.get("reg_alpha", 0.1),
            reg_lambda=self.params.get("reg_lambda", 1.0),
            random_state=self.params.get("random_state", 42),
            n_jobs=self.params.get("n_jobs", -1),
            tree_method="hist",
            verbosity=0,
        )

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        X_train = self._get_features(train, feature_cols).fillna(0)
        y_train = train[target_col].values
        eval_set = []
        if val is not None and len(val) > 0:
            X_val = self._get_features(val, feature_cols).fillna(0)
            y_val = val[target_col].values
            eval_set = [(X_val, y_val)]
        self._model.fit(
            X_train, y_train,
            eval_set=eval_set,
            verbose=False,
        )
        self._is_fitted = True

    def predict(self, X, feature_cols=None):
        Xf = self._get_features(X, feature_cols).fillna(0)
        return np.clip(self._model.predict(Xf), 0, None)

    def predict_with_interval(self, X, feature_cols=None, interval_width=0.9):
        preds = self.predict(X, feature_cols)
        margin = preds * 0.12
        return preds, np.clip(preds - margin, 0, None), preds + margin

    def get_feature_importance(self, feature_cols: list[str]) -> dict[str, float]:
        imp = self._model.feature_importances_
        return dict(sorted(zip(feature_cols, imp), key=lambda x: x[1], reverse=True))
