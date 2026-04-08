"""
Evaluation metrics: RMSE, MAE, MAPE, Direction Accuracy.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


def mape(y_true: np.ndarray, y_pred: np.ndarray, eps: float = 1e-8) -> float:
    mask = np.abs(y_true) > eps
    if mask.sum() == 0:
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def direction_accuracy(
    y_true: np.ndarray, y_pred: np.ndarray, y_prev: np.ndarray
) -> float:
    """Fraction of times the model correctly predicts price direction (up/down)."""
    true_dir = np.sign(y_true - y_prev)
    pred_dir = np.sign(y_pred - y_prev)
    mask = true_dir != 0  # exclude flat days
    if mask.sum() == 0:
        return float("nan")
    return float((true_dir[mask] == pred_dir[mask]).mean() * 100)


def compute_all(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prev: np.ndarray | None = None,
) -> dict[str, float]:
    metrics = {
        "rmse": rmse(y_true, y_pred),
        "mae": mae(y_true, y_pred),
        "mape": mape(y_true, y_pred),
    }
    if y_prev is not None:
        metrics["direction_accuracy"] = direction_accuracy(y_true, y_pred, y_prev)
    return metrics


def metrics_dataframe(results: dict[str, dict[str, float]]) -> pd.DataFrame:
    """Build a comparison DataFrame from {model_name: metrics_dict}."""
    rows = []
    for model_name, m in results.items():
        rows.append({"model": model_name, **m})
    df = pd.DataFrame(rows)
    if "rmse" in df.columns:
        df = df.sort_values("rmse")
    return df.reset_index(drop=True)
