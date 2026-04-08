"""
Benchmarks all trained models per vegetable and produces a comparison report.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger

from src.data.feature_engineer import FeatureEngineer
from src.evaluation.metrics import compute_all, metrics_dataframe
from src.models.base_model import BaseModel


class ModelComparator:
    def __init__(self, output_dir: str = "data/model_artifacts"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def evaluate_model(
        self,
        model: BaseModel,
        test_df: pd.DataFrame,
        feature_cols: list[str] | None = None,
        target_col: str = "target_price",
    ) -> dict[str, float]:
        try:
            preds = model.predict(test_df, feature_cols)
            # Align lengths (sequence models return fewer rows)
            n = min(len(preds), len(test_df))
            y_true = test_df[target_col].values[-n:]
            y_pred = preds[-n:]
            y_prev = test_df["modal_price"].values[-n:]
            return compute_all(y_true, y_pred, y_prev)
        except Exception as exc:
            logger.error(f"  Evaluation failed for {model.name}: {exc}")
            return {"rmse": float("inf"), "mae": float("inf"), "mape": float("inf")}

    def compare(
        self,
        models: list[BaseModel],
        splits: dict[str, dict[str, pd.DataFrame]],
        feature_cols: list[str] | None = None,
    ) -> pd.DataFrame:
        if feature_cols is None:
            feature_cols = FeatureEngineer.get_feature_columns()

        all_rows: list[dict] = []
        for veg, split in splits.items():
            test_df = split["test"]
            logger.info(f"Evaluating on: {veg}")
            for model in models:
                if not model._is_fitted:
                    continue
                metrics = self.evaluate_model(model, test_df, feature_cols)
                all_rows.append({
                    "vegetable": veg,
                    "model": model.name,
                    **metrics,
                })

        df = pd.DataFrame(all_rows)

        # Per-vegetable best model
        if not df.empty and "rmse" in df.columns:
            best = (
                df.groupby("vegetable")
                .apply(lambda g: g.nsmallest(1, "rmse"))
                .reset_index(drop=True)[["vegetable", "model", "rmse"]]
            )
            logger.info("\n=== Best models per vegetable ===")
            for _, row in best.iterrows():
                logger.info(f"  {row['vegetable']}: {row['model']} (RMSE={row['rmse']:.2f})")

        # Save report
        report_path = self.output_dir / "model_comparison.csv"
        df.to_csv(report_path, index=False)
        logger.info(f"Comparison report saved → {report_path}")
        return df

    def get_best_models(
        self, comparison_df: pd.DataFrame, top_n: int = 3
    ) -> dict[str, list[str]]:
        """Returns {vegetable: [top_n model names by RMSE]}"""
        result: dict[str, list[str]] = {}
        for veg, group in comparison_df.groupby("vegetable"):
            top = group.nsmallest(top_n, "rmse")["model"].tolist()
            result[veg] = top
        return result
