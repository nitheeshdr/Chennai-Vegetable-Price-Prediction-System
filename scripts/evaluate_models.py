#!/usr/bin/env python3
"""
Evaluate all trained models and produce a comparison report.
Usage: python scripts/evaluate_models.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from loguru import logger

load_dotenv()


def main():
    from src.data.dataset_builder import DatasetBuilder
    from src.evaluation.model_comparator import ModelComparator
    from src.evaluation.metrics import metrics_dataframe
    from src.models.baseline.linear_regression import LinearRegressionModel
    from src.models.baseline.random_forest import RandomForestModel
    from src.models.boosting.xgboost_model import XGBoostModel
    from src.models.boosting.lightgbm_model import LightGBMModel
    from src.models.timeseries.prophet_model import ProphetModel
    from src.models.timeseries.lstm_model import LSTMModel
    from src.models.deep_learning.tcn_attention import TCNAttentionModel
    from src.models.deep_learning.transformer_model import TransformerModel

    artifact_dir = Path("data/model_artifacts")
    builder = DatasetBuilder()
    splits = builder.load_features()

    # Reload from splits parquet
    import pandas as pd
    features = pd.read_parquet("data/features/all_features.parquet")
    all_veg = features["vegetable_name"].unique().tolist()

    all_models_by_veg: list = []
    loaded_splits: dict = {}

    for veg in all_veg:
        veg_df = features[features["vegetable_name"] == veg].sort_values("date")
        n = len(veg_df)
        if n < 60:
            continue
        n_test = int(n * 0.15)
        n_val = int(n * 0.15)
        train = veg_df.iloc[:n - n_test - n_val]
        val = veg_df.iloc[n - n_test - n_val:n - n_test]
        test = veg_df.iloc[n - n_test:]
        loaded_splits[veg] = {"train": train, "val": val, "test": test}

        model_configs = [
            ("linear_regression", LinearRegressionModel, ".pkl"),
            ("random_forest", RandomForestModel, ".pkl"),
            ("xgboost", XGBoostModel, ".pkl"),
            ("lightgbm", LightGBMModel, ".pkl"),
            ("prophet", ProphetModel, ".pkl"),
            ("lstm", LSTMModel, ".pt"),
            ("tcn_attention", TCNAttentionModel, ".pt"),
            ("transformer", TransformerModel, ".pt"),
        ]
        for name, cls, ext in model_configs:
            model_path = artifact_dir / veg / f"{name}{ext}"
            if model_path.exists():
                m = cls()
                m.load(model_path)
                all_models_by_veg.append(m)

    comparator = ModelComparator(str(artifact_dir))
    report = comparator.compare(all_models_by_veg, loaded_splits)

    logger.info("\n" + "=" * 60)
    logger.info("MODEL COMPARISON REPORT")
    logger.info("=" * 60)
    if not report.empty:
        avg = report.groupby("model")[["rmse", "mae", "mape"]].mean().round(2)
        print("\nAverage metrics across all vegetables:")
        print(avg.sort_values("rmse").to_string())


if __name__ == "__main__":
    main()
