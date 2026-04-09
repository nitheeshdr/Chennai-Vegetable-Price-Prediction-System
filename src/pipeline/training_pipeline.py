"""
End-to-end training pipeline: data → features → train all models → evaluate → save best.
"""
from __future__ import annotations

import json
import pickle
from pathlib import Path

import pandas as pd
import yaml
from loguru import logger

from src.data.dataset_builder import DatasetBuilder
from src.data.feature_engineer import FeatureEngineer
from src.evaluation.model_comparator import ModelComparator
from src.models.base_model import BaseModel
from src.models.baseline.linear_regression import LinearRegressionModel
from src.models.baseline.random_forest import RandomForestModel
from src.models.boosting.lightgbm_model import LightGBMModel
from src.models.boosting.xgboost_model import XGBoostModel
from src.models.ensemble.weighted_ensemble import WeightedEnsemble
from src.models.timeseries.prophet_model import ProphetModel
from src.models.timeseries.lstm_model import LSTMModel
from src.models.deep_learning.tcn_attention import TCNAttentionModel
from src.models.deep_learning.transformer_model import TransformerModel

ARTIFACT_DIR = Path("data/model_artifacts")
CONFIG_PATH = Path("config/model_params.yaml")


def _load_params() -> dict:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            return yaml.safe_load(f)
    return {}


def _build_models(params: dict, include_deep: bool = True, include_lstm: bool = True) -> list[BaseModel]:
    models: list[BaseModel] = [
        LinearRegressionModel(params.get("linear_regression")),
        RandomForestModel(params.get("random_forest")),
        XGBoostModel(params.get("xgboost")),
        LightGBMModel(params.get("lightgbm")),
        # ProphetModel disabled — pystan incompatible with Python 3.11
        # ProphetModel(params.get("prophet")),
    ]
    if include_lstm:
        models.append(LSTMModel(params.get("lstm")))
    if include_deep:
        models += [
            TCNAttentionModel(params.get("tcn")),
            TransformerModel(params.get("transformer")),
        ]
    return models


class TrainingPipeline:
    def __init__(
        self,
        artifact_dir: Path = ARTIFACT_DIR,
        include_deep_learning: bool = True,
        include_lstm: bool = True,
        min_samples: int = 180,
    ):
        self.artifact_dir = Path(artifact_dir)
        self.artifact_dir.mkdir(parents=True, exist_ok=True)
        self.include_deep = include_deep_learning
        self.include_lstm = include_lstm
        self.min_samples = min_samples
        self.feature_cols = FeatureEngineer.get_feature_columns()

    def run(self, incremental: bool = False) -> dict:
        logger.info("=" * 60)
        logger.info("TRAINING PIPELINE START")
        logger.info("=" * 60)

        # Build dataset
        builder = DatasetBuilder()
        splits = builder.build()
        params = _load_params()

        comparator = ModelComparator(str(self.artifact_dir))
        best_models_per_veg: dict[str, WeightedEnsemble] = {}
        all_model_instances: list[BaseModel] = []

        for veg, split in splits.items():
            train_df = split["train"]
            val_df = split["val"]
            test_df = split["test"]

            if len(train_df) < self.min_samples:
                logger.warning(f"Skipping {veg}: insufficient training data")
                continue

            logger.info(f"\n--- Training models for: {veg} ---")
            models = _build_models(params, include_deep=self.include_deep,
                                   include_lstm=self.include_lstm)
            trained: list[BaseModel] = []

            for model in models:
                try:
                    logger.info(f"  Fitting {model.name}...")
                    model.fit(train_df, val_df, self.feature_cols)
                    trained.append(model)
                    all_model_instances.append(model)
                    # Save individual model
                    ext = ".pt" if hasattr(model, "device") else ".pkl"
                    model_path = self.artifact_dir / veg / f"{model.name}{ext}"
                    model.save(model_path)
                except Exception as exc:
                    logger.error(f"  {model.name} failed: {exc}")

            # Build ensemble from top 3 by val RMSE
            if len(trained) >= 2:
                from src.evaluation.metrics import rmse as rmse_fn
                def _val_rmse(m: BaseModel) -> float:
                    try:
                        preds = m.predict(val_df, self.feature_cols)
                        n = min(len(preds), len(val_df))
                        return rmse_fn(val_df["target_price"].values[-n:], preds[-n:])
                    except Exception:
                        return float("inf")

                ranked = sorted(trained, key=_val_rmse)[:3]
                ensemble = WeightedEnsemble(ranked)
                ensemble.fit(train_df, val_df, self.feature_cols)
                ensemble_path = self.artifact_dir / veg / "ensemble.pkl"
                ensemble.save(ensemble_path)
                best_models_per_veg[veg] = ensemble
                logger.info(f"  Ensemble saved for {veg}")

        # Evaluate all on test sets
        all_results = comparator.compare(
            all_model_instances, splits, self.feature_cols
        )

        # Save vegetable → best model mapping
        mapping = {veg: "ensemble" for veg in best_models_per_veg}
        (self.artifact_dir / "model_mapping.json").write_text(json.dumps(mapping, indent=2))
        logger.info(f"\nTraining complete. Best models: {mapping}")
        return mapping
