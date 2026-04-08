"""
Dataset builder: merges raw sources, runs preprocessing + feature engineering,
produces final train/val/test splits per vegetable.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from loguru import logger

from src.data.feature_engineer import FeatureEngineer
from src.data.preprocessor import Preprocessor

RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")
FEATURES_DIR = Path("data/features")


class DatasetBuilder:
    def __init__(
        self,
        raw_dir: Path = RAW_DIR,
        processed_dir: Path = PROCESSED_DIR,
        features_dir: Path = FEATURES_DIR,
        test_frac: float = 0.15,
        val_frac: float = 0.15,
    ):
        self.raw_dir = Path(raw_dir)
        self.processed_dir = Path(processed_dir)
        self.features_dir = Path(features_dir)
        self.test_frac = test_frac
        self.val_frac = val_frac

        for d in [self.processed_dir, self.features_dir]:
            d.mkdir(parents=True, exist_ok=True)

        self.preprocessor = Preprocessor()
        self.feature_engineer = FeatureEngineer()

    # ── Raw data loading ──────────────────────────────────────────────────────

    def _load_raw_price_data(self) -> pd.DataFrame:
        frames: list[pd.DataFrame] = []
        for pattern in ["mandi_raw.parquet", "kaggle_combined.parquet", "koyambedu_today.parquet"]:
            path = self.raw_dir / pattern
            if path.exists():
                df = pd.read_parquet(path)
                df["_source"] = pattern
                frames.append(df)
                logger.info(f"Loaded {len(df)} rows from {pattern}")
            else:
                logger.warning(f"Raw file not found: {path}")

        # Also pick up any loose CSVs in raw/
        for csv_path in sorted(self.raw_dir.glob("*.csv")):
            try:
                df = pd.read_csv(csv_path, low_memory=False)
                df["_source"] = csv_path.name
                frames.append(df)
                logger.info(f"Loaded {len(df)} rows from {csv_path.name}")
            except Exception as exc:
                logger.warning(f"Could not read {csv_path}: {exc}")

        if not frames:
            raise FileNotFoundError(
                f"No raw price data found in {self.raw_dir}. "
                "Run: python scripts/download_data.py"
            )

        combined = pd.concat(frames, ignore_index=True)
        combined["date"] = pd.to_datetime(combined["date"], errors="coerce")
        return combined.dropna(subset=["date"])

    def _load_weather_data(self) -> pd.DataFrame | None:
        path = self.raw_dir / "weather_raw.parquet"
        if path.exists():
            df = pd.read_parquet(path)
            df["date"] = pd.to_datetime(df["date"])
            return df
        logger.warning("Weather data not found — weather features will be zeros")
        return None

    # ── Chronological split ───────────────────────────────────────────────────

    def _split(self, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        df = df.sort_values("date")
        n = len(df)
        train_end = int(n * (1 - self.test_frac - self.val_frac))
        val_end = int(n * (1 - self.test_frac))
        return df.iloc[:train_end], df.iloc[train_end:val_end], df.iloc[val_end:]

    # ── Main build ────────────────────────────────────────────────────────────

    def build(self) -> dict[str, dict[str, pd.DataFrame]]:
        """Returns {vegetable_name: {"train": df, "val": df, "test": df}}"""
        logger.info("=== Dataset Build Start ===")

        raw = self._load_raw_price_data()
        logger.info(f"Total raw rows: {len(raw)}")

        weather = self._load_weather_data()

        # Preprocess
        clean = self.preprocessor.run(raw, fit=True)
        clean.to_parquet(self.processed_dir / "clean_prices.parquet", index=False)
        logger.info(f"Clean rows: {len(clean)}")

        # Feature engineering
        featured = self.feature_engineer.transform(clean, weather_df=weather)
        featured.to_parquet(self.features_dir / "all_features.parquet", index=False)
        logger.info(f"Featured rows: {len(featured)}")

        # Split per vegetable
        splits: dict[str, dict[str, pd.DataFrame]] = {}
        for veg, group in featured.groupby("vegetable_name"):
            if len(group) < 60:
                logger.warning(f"Skipping {veg}: only {len(group)} samples")
                continue
            train, val, test = self._split(group)
            splits[veg] = {"train": train, "val": val, "test": test}
            logger.info(
                f"  {veg}: train={len(train)}, val={len(val)}, test={len(test)}"
            )

        logger.info(f"=== Dataset Build Complete: {len(splits)} vegetables ===")
        return splits

    def load_features(self) -> pd.DataFrame:
        """Load pre-built feature file (skips rebuild)."""
        path = self.features_dir / "all_features.parquet"
        if not path.exists():
            raise FileNotFoundError(f"Features not found. Run build() first: {path}")
        return pd.read_parquet(path)
