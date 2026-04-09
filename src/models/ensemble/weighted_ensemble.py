"""
Weighted ensemble: combines predictions from multiple models.
Weights are derived from inverse validation RMSE (better model = higher weight).
"""
from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger
from scipy.optimize import minimize
from sklearn.metrics import mean_squared_error

from src.models.base_model import BaseModel


class WeightedEnsemble(BaseModel):
    name = "ensemble"

    def __init__(self, models: list[BaseModel], params: dict | None = None):
        super().__init__(params)
        self.models = models
        self.weights: np.ndarray = np.ones(len(models)) / len(models)
        self._feature_cols: list[str] = []

    def _get_model_preds(
        self, df: pd.DataFrame, feature_cols: list[str] | None = None
    ) -> np.ndarray:
        preds_list = []
        for m in self.models:
            try:
                p = m.predict(df, feature_cols)
                if len(p) == len(df):
                    preds_list.append(p)
                else:
                    # Sequence models return fewer rows — pad with first value
                    pad = np.full(len(df) - len(p), p[0] if len(p) > 0 else 0.0)
                    preds_list.append(np.concatenate([pad, p]))
            except Exception as exc:
                logger.warning(f"Model {m.name} predict failed: {exc}")
                preds_list.append(np.zeros(len(df)))
        return np.stack(preds_list, axis=0)  # (n_models, n_samples)

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        """Fit weights using time-series CV on train+val, optimise for RMSE."""
        combined = pd.concat([train, val], ignore_index=True) if val is not None and len(val) else train
        combined = combined.sort_values("date").reset_index(drop=True) if "date" in combined.columns else combined

        n = len(combined)
        n_models = len(self.models)

        # Time-series walk-forward: 3 folds, each fold adds 20% more history
        fold_oof_preds = np.zeros((n_models, n))
        fold_oof_counts = np.zeros(n)

        n_splits = 3
        min_train = max(int(n * 0.4), 60)

        for fold in range(n_splits):
            split = min_train + int((n - min_train) * fold / n_splits)
            val_end = min_train + int((n - min_train) * (fold + 1) / n_splits)
            tr = combined.iloc[:split]
            vl = combined.iloc[split:val_end]
            if len(vl) == 0:
                continue
            for i, m in enumerate(self.models):
                try:
                    p = m.predict(vl, feature_cols)
                    if len(p) == len(vl):
                        fold_oof_preds[i, split:val_end] += p
                        fold_oof_counts[split:val_end] += 1
                except Exception as exc:
                    logger.warning(f"OOF predict failed {m.name} fold {fold}: {exc}")

        # Average over folds where we have predictions
        valid_mask = fold_oof_counts > 0
        if valid_mask.sum() < 10:
            # Fallback: use val set directly
            if val is not None and len(val) > 0:
                all_preds = self._get_model_preds(val, feature_cols)
                y_true = val[target_col].values
            else:
                self.weights = np.ones(n_models) / n_models
                self._is_fitted = True
                return
        else:
            avg_preds = np.where(fold_oof_counts > 0,
                                 fold_oof_preds / np.maximum(fold_oof_counts, 1), 0)
            all_preds = avg_preds[:, valid_mask]
            y_true = combined[target_col].values[valid_mask]

        def objective(w):
            w = np.abs(w)
            w = w / (w.sum() + 1e-8)
            ensemble_pred = (w[:, None] * all_preds).sum(axis=0)
            return mean_squared_error(y_true, ensemble_pred, squared=False)

        result = minimize(
            objective,
            x0=np.ones(n_models) / n_models,
            method="SLSQP",
            bounds=[(0, 1)] * n_models,
            constraints={"type": "eq", "fun": lambda w: np.abs(w).sum() - 1},
        )
        w = np.abs(result.x)
        self.weights = w / (w.sum() + 1e-8)
        self._is_fitted = True

        for m, wt in zip(self.models, self.weights):
            logger.info(f"  Ensemble weight | {m.name}: {wt:.3f}")

    def predict(self, X, feature_cols=None):
        all_preds = self._get_model_preds(X, feature_cols)
        return np.clip(
            (self.weights[:, None] * all_preds).sum(axis=0),
            0, None,
        )

    def predict_with_interval(self, X, feature_cols=None, interval_width=0.9):
        # Collect interval bounds from each model, then weighted average
        lowers, uppers, preds_list = [], [], []
        for m, w in zip(self.models, self.weights):
            try:
                p, lo, hi = m.predict_with_interval(X, feature_cols, interval_width)
                if len(p) != len(X):
                    pad_len = len(X) - len(p)
                    p = np.concatenate([np.full(pad_len, p[0] if len(p) else 0), p])
                    lo = np.concatenate([np.full(pad_len, lo[0] if len(lo) else 0), lo])
                    hi = np.concatenate([np.full(pad_len, hi[0] if len(hi) else 0), hi])
                preds_list.append(p * w)
                lowers.append(lo * w)
                uppers.append(hi * w)
            except Exception:
                pass

        if not preds_list:
            return np.zeros(len(X)), np.zeros(len(X)), np.zeros(len(X))

        pred = np.clip(np.sum(preds_list, axis=0), 0, None)
        lower = np.clip(np.sum(lowers, axis=0), 0, None)
        upper = np.clip(np.sum(uppers, axis=0), 0, None)
        return pred, lower, upper

    def save(self, path: Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({"weights": self.weights, "model_names": [m.name for m in self.models]}, f)

    def load(self, path: Path) -> None:
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.weights = data["weights"]
        self._is_fitted = True
