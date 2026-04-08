"""
Kaggle vegetable/commodity price dataset downloader.
Downloads public datasets without manual intervention using the Kaggle API.
Primary dataset: krishnaik06/the-economic-times-vegetable-price-dataset
Supplementary: sudhanshusekharjha/vegetable-prices-in-india
"""
from __future__ import annotations

import os
import zipfile
from pathlib import Path

import pandas as pd
from loguru import logger

# Dataset slugs to try (in priority order)
DATASETS = [
    "krishnaik06/the-economic-times-vegetable-price-dataset",
    "sudhanshusekharjha/vegetable-prices-in-india",
    "mragpavank/vegetable-market-prices",
]


class KaggleLoader:
    def __init__(self, output_dir: str = "data/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._configure_credentials()

    def _configure_credentials(self):
        username = os.getenv("KAGGLE_USERNAME", "")
        key = os.getenv("KAGGLE_KEY", "")
        if username and key:
            kaggle_dir = Path.home() / ".kaggle"
            kaggle_dir.mkdir(exist_ok=True)
            cred_file = kaggle_dir / "kaggle.json"
            if not cred_file.exists():
                import json
                cred_file.write_text(json.dumps({"username": username, "key": key}))
                cred_file.chmod(0o600)
                logger.info("Kaggle credentials written")

    def _download_dataset(self, dataset_slug: str) -> Path | None:
        try:
            import kaggle  # noqa: F401 — triggers credential load

            slug_dir = self.output_dir / dataset_slug.replace("/", "_")
            slug_dir.mkdir(parents=True, exist_ok=True)

            os.system(
                f"kaggle datasets download -d {dataset_slug} "
                f"-p {slug_dir} --unzip --quiet"
            )
            csv_files = list(slug_dir.rglob("*.csv"))
            if csv_files:
                logger.info(f"Downloaded dataset '{dataset_slug}' → {slug_dir}")
                return slug_dir
        except Exception as exc:
            logger.warning(f"Kaggle download failed for '{dataset_slug}': {exc}")
        return None

    def _load_csvs(self, directory: Path) -> pd.DataFrame:
        dfs: list[pd.DataFrame] = []
        for csv_path in sorted(directory.rglob("*.csv")):
            try:
                df = pd.read_csv(csv_path, low_memory=False)
                df["_source_file"] = csv_path.name
                dfs.append(df)
                logger.info(f"  Loaded {csv_path.name}: {len(df)} rows")
            except Exception as exc:
                logger.warning(f"  Could not read {csv_path}: {exc}")
        return pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()

    def _normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        col_lower = {c: c.lower().strip() for c in df.columns}
        df = df.rename(columns=col_lower)

        rename: dict[str, str] = {}
        for col in df.columns:
            if any(k in col for k in ["commodity", "vegetable", "item"]):
                rename[col] = "vegetable_name"
            elif col in ("date", "arrival_date", "price_date"):
                rename[col] = "date"
            elif "min" in col and "price" in col:
                rename[col] = "min_price"
            elif "max" in col and "price" in col:
                rename[col] = "max_price"
            elif any(k in col for k in ["modal", "avg", "price"]) and col not in rename.values():
                rename[col] = "modal_price"
            elif "market" in col and "market_name" not in rename.values():
                rename[col] = "market_name"
            elif "state" in col and "state" not in rename.values():
                rename[col] = "state"
            elif "arrival" in col and "qty" in col:
                rename[col] = "arrival_qty"

        df = df.rename(columns=rename)

        if "date" not in df.columns:
            for col in df.columns:
                if "date" in col or "time" in col:
                    df = df.rename(columns={col: "date"})
                    break

        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")

        for col in ["min_price", "max_price", "modal_price", "arrival_qty"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        keep = ["date", "vegetable_name", "market_name", "state",
                "min_price", "max_price", "modal_price", "arrival_qty"]
        available = [c for c in keep if c in df.columns]
        df = df[available].dropna(subset=["date", "vegetable_name"])
        return df

    def run(self) -> pd.DataFrame:
        all_dfs: list[pd.DataFrame] = []
        for slug in DATASETS:
            slug_dir = self._download_dataset(slug)
            if slug_dir:
                df = self._load_csvs(slug_dir)
                if not df.empty:
                    df = self._normalize(df)
                    all_dfs.append(df)
                    logger.info(f"  Normalized {len(df)} rows from {slug}")

        if not all_dfs:
            logger.warning("No Kaggle data loaded")
            return pd.DataFrame()

        combined = pd.concat(all_dfs, ignore_index=True)
        combined = combined.sort_values("date").reset_index(drop=True)
        out_path = self.output_dir / "kaggle_combined.parquet"
        combined.to_parquet(out_path, index=False)
        logger.info(f"Saved {len(combined)} Kaggle rows → {out_path}")
        return combined
