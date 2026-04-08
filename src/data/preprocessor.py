"""
Data preprocessing: cleaning, normalization, vegetable name standardization.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from loguru import logger
from sklearn.preprocessing import LabelEncoder, MinMaxScaler

CONFIG_PATH = Path("config/vegetables.yaml")


def load_alias_map(config_path: Path = CONFIG_PATH) -> dict[str, str]:
    with open(config_path) as f:
        cfg = yaml.safe_load(f)
    alias_map: dict[str, str] = {}
    for veg in cfg["vegetables"]:
        canonical = veg["name"]
        alias_map[canonical.lower()] = canonical
        for alias in veg.get("aliases", []):
            alias_map[alias.lower().strip()] = canonical
    return alias_map


class Preprocessor:
    def __init__(self, config_path: Path = CONFIG_PATH):
        self.alias_map = load_alias_map(config_path)
        self.price_scalers: dict[str, MinMaxScaler] = {}
        self.market_encoder = LabelEncoder()

    # ── Name standardization ──────────────────────────────────────────────────

    def standardize_vegetable_name(self, name: str) -> str | None:
        if not isinstance(name, str):
            return None
        key = name.lower().strip()
        if key in self.alias_map:
            return self.alias_map[key]
        # Partial match
        for alias, canonical in self.alias_map.items():
            if alias in key or key in alias:
                return canonical
        return None

    # ── Cleaning ──────────────────────────────────────────────────────────────

    def clean(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Standardize vegetable names
        df["vegetable_name"] = df["vegetable_name"].apply(self.standardize_vegetable_name)
        unknown_before = df["vegetable_name"].isna().sum()
        df = df.dropna(subset=["vegetable_name"])
        if unknown_before:
            logger.info(f"Dropped {unknown_before} rows with unrecognized vegetable names")

        # Price sanity: must be > 0 and < 10_000 Rs/kg
        for col in ["min_price", "max_price", "modal_price"]:
            if col in df.columns:
                df[col] = df[col].where((df[col] > 0) & (df[col] < 10_000))

        # modal_price is our primary target — must exist
        df = df.dropna(subset=["modal_price"])

        # min/max imputation
        if "min_price" in df.columns and "max_price" in df.columns:
            df["min_price"] = df["min_price"].fillna(df["modal_price"] * 0.9)
            df["max_price"] = df["max_price"].fillna(df["modal_price"] * 1.1)

        # Arrival qty: fill missing with group median
        if "arrival_qty" in df.columns:
            median_qty = (
                df.groupby("vegetable_name")["arrival_qty"]
                .transform("median")
            )
            df["arrival_qty"] = df["arrival_qty"].fillna(median_qty).fillna(0)

        # Remove duplicates: keep mean price per (date, vegetable, market)
        key_cols = ["date", "vegetable_name"]
        if "market_name" in df.columns:
            key_cols.append("market_name")

        agg: dict[str, str] = {"modal_price": "mean"}
        for c in ["min_price", "max_price", "arrival_qty"]:
            if c in df.columns:
                agg[c] = "mean"

        df = df.groupby(key_cols, as_index=False).agg(agg)
        df = df.sort_values("date").reset_index(drop=True)

        logger.info(f"Cleaned dataset: {len(df)} rows, {df['vegetable_name'].nunique()} vegetables")
        return df

    # ── Gap filling ───────────────────────────────────────────────────────────

    def fill_gaps(self, df: pd.DataFrame) -> pd.DataFrame:
        """Forward-fill missing dates within each vegetable-market group."""
        df = df.copy()
        key_cols = ["vegetable_name"]
        if "market_name" in df.columns:
            key_cols.append("market_name")

        filled_chunks: list[pd.DataFrame] = []
        for keys, group in df.groupby(key_cols):
            group = group.set_index("date").sort_index()
            full_idx = pd.date_range(group.index.min(), group.index.max(), freq="D")
            group = group.reindex(full_idx)
            group.index.name = "date"
            # Forward-fill prices (max 7 days), then back-fill remainder
            group[["modal_price", "min_price", "max_price"]] = (
                group[["modal_price", "min_price", "max_price"]]
                .ffill(limit=7)
                .bfill(limit=3)
            )
            # arrival_qty: fill with 0 for gap days
            if "arrival_qty" in group.columns:
                group["arrival_qty"] = group["arrival_qty"].fillna(0)
            group = group.reset_index()
            if isinstance(keys, str):
                keys = (keys,)
            for k, v in zip(key_cols, keys):
                group[k] = v
            filled_chunks.append(group)

        if not filled_chunks:
            return df

        result = pd.concat(filled_chunks, ignore_index=True)
        return result.dropna(subset=["modal_price"]).sort_values("date").reset_index(drop=True)

    # ── Normalization ─────────────────────────────────────────────────────────

    def fit_scalers(self, df: pd.DataFrame) -> None:
        for veg, group in df.groupby("vegetable_name"):
            scaler = MinMaxScaler()
            scaler.fit(group[["modal_price"]])
            self.price_scalers[veg] = scaler

    def normalize_prices(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        scaled_parts: list[pd.DataFrame] = []
        for veg, group in df.groupby("vegetable_name"):
            if veg not in self.price_scalers:
                scaler = MinMaxScaler()
                scaler.fit(group[["modal_price"]])
                self.price_scalers[veg] = scaler
            group = group.copy()
            group["modal_price_scaled"] = self.price_scalers[veg].transform(
                group[["modal_price"]]
            )
            scaled_parts.append(group)
        return pd.concat(scaled_parts, ignore_index=True)

    def inverse_transform_price(self, vegetable: str, price_scaled: float) -> float:
        if vegetable not in self.price_scalers:
            return price_scaled
        arr = np.array([[price_scaled]])
        return float(self.price_scalers[vegetable].inverse_transform(arr)[0][0])

    # ── Encode categoricals ───────────────────────────────────────────────────

    def encode_market(self, df: pd.DataFrame) -> pd.DataFrame:
        if "market_name" not in df.columns:
            return df
        df = df.copy()
        df["market_encoded"] = self.market_encoder.fit_transform(
            df["market_name"].fillna("unknown")
        )
        return df

    # ── Full pipeline ─────────────────────────────────────────────────────────

    def run(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        df = self.clean(df)
        df = self.fill_gaps(df)
        if fit:
            self.fit_scalers(df)
        df = self.normalize_prices(df)
        df = self.encode_market(df)
        return df
