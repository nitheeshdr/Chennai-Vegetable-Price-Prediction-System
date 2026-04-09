import numpy as np
import pandas as pd
import pytest

from src.data.feature_engineer import FeatureEngineer
from src.data.preprocessor import Preprocessor
from src.evaluation.metrics import rmse, mae, mape, direction_accuracy


# ── Metrics ───────────────────────────────────────────────────────────────────

def test_rmse_perfect():
    y = np.array([10.0, 20.0, 30.0])
    assert rmse(y, y) == pytest.approx(0.0)


def test_mae_perfect():
    y = np.array([10.0, 20.0])
    assert mae(y, y) == pytest.approx(0.0)


def test_mape_known():
    y_true = np.array([100.0])
    y_pred = np.array([110.0])
    assert mape(y_true, y_pred) == pytest.approx(10.0)


def test_direction_accuracy():
    y_true = np.array([12.0, 8.0, 15.0])  # up, down, up
    y_pred = np.array([13.0, 7.0, 14.0])  # up, down, up → 100%
    y_prev = np.array([10.0, 10.0, 10.0])
    acc = direction_accuracy(y_true, y_pred, y_prev)
    assert acc == pytest.approx(100.0)


# ── Model training (fast smoke test) ─────────────────────────────────────────

@pytest.fixture
def feature_splits(sample_price_df, sample_weather_df):
    p = Preprocessor()
    clean = p.run(sample_price_df)
    fe = FeatureEngineer()
    featured = fe.transform(clean, weather_df=sample_weather_df)
    n = len(featured)
    return {
        "train": featured.iloc[:int(n * 0.7)],
        "val": featured.iloc[int(n * 0.7):int(n * 0.85)],
        "test": featured.iloc[int(n * 0.85):],
    }


def test_linear_regression_trains(feature_splits):
    from src.models.baseline.linear_regression import LinearRegressionModel
    m = LinearRegressionModel()
    m.fit(feature_splits["train"], feature_splits["val"])
    preds = m.predict(feature_splits["test"])
    assert len(preds) == len(feature_splits["test"])
    assert np.all(preds >= 0)


def test_random_forest_trains(feature_splits):
    from src.models.baseline.random_forest import RandomForestModel
    m = RandomForestModel({"n_estimators": 10})
    m.fit(feature_splits["train"], feature_splits["val"])
    preds = m.predict(feature_splits["test"])
    assert len(preds) == len(feature_splits["test"])


def test_xgboost_trains(feature_splits):
    from src.models.boosting.xgboost_model import XGBoostModel
    m = XGBoostModel({"n_estimators": 20})
    m.fit(feature_splits["train"], feature_splits["val"])
    preds = m.predict(feature_splits["test"])
    assert len(preds) == len(feature_splits["test"])
    assert np.all(preds >= 0)


def test_ensemble_trains(feature_splits):
    from src.models.baseline.linear_regression import LinearRegressionModel
    from src.models.baseline.random_forest import RandomForestModel
    from src.models.ensemble.weighted_ensemble import WeightedEnsemble

    m1 = LinearRegressionModel()
    m1.fit(feature_splits["train"])
    m2 = RandomForestModel({"n_estimators": 10})
    m2.fit(feature_splits["train"])

    ens = WeightedEnsemble([m1, m2])
    ens.fit(feature_splits["train"], feature_splits["val"])
    preds = ens.predict(feature_splits["test"])
    assert len(preds) == len(feature_splits["test"])
    assert np.all(preds >= 0)
    assert abs(ens.weights.sum() - 1.0) < 1e-5
