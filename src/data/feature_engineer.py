"""
Feature engineering: lag features, rolling stats, seasonal encoding,
weather integration, festival indicators, supply-demand ratio.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from loguru import logger

FESTIVAL_CONFIG = Path("config/festivals.yaml")


def _load_festival_dates(year_range: tuple[int, int]) -> set[str]:
    """Return a set of date strings (YYYY-MM-DD) that are within festival windows."""
    try:
        with open(FESTIVAL_CONFIG) as f:
            cfg = yaml.safe_load(f)
    except FileNotFoundError:
        return set()

    festival_dates: set[str] = set()
    start_year, end_year = year_range
    for yr in range(start_year, end_year + 1):
        for fest in cfg.get("festivals", []):
            window = fest.get("window_days", 5)
            ftype = fest.get("type", "annual")
            if ftype == "annual":
                try:
                    fd = pd.Timestamp(yr, fest["month"], fest["day"])
                    for delta in range(-window, 3):
                        festival_dates.add((fd + pd.Timedelta(days=delta)).strftime("%Y-%m-%d"))
                except Exception:
                    pass
            # variable festivals (Diwali, etc.) require `holidays` package
            elif ftype == "variable":
                try:
                    import holidays as hol
                    country_hols = hol.India(years=yr)
                    key = fest.get("holiday_key", "")
                    for hdate, hname in country_hols.items():
                        if key.lower() in hname.lower():
                            fd = pd.Timestamp(hdate)
                            for delta in range(-window, 3):
                                festival_dates.add(
                                    (fd + pd.Timedelta(days=delta)).strftime("%Y-%m-%d")
                                )
                except ImportError:
                    pass
    return festival_dates


class FeatureEngineer:
    LAG_DAYS = [1, 2, 3, 7, 14]
    ROLLING_WINDOWS = [3, 7, 14]

    def __init__(self):
        self._festival_dates: set[str] | None = None

    def _get_festival_dates(self, df: pd.DataFrame) -> set[str]:
        if self._festival_dates is None:
            min_yr = df["date"].dt.year.min()
            max_yr = df["date"].dt.year.max()
            self._festival_dates = _load_festival_dates((int(min_yr), int(max_yr)))
        return self._festival_dates

    # ── Per-vegetable feature generation ─────────────────────────────────────

    def _add_lag_features(self, group: pd.DataFrame) -> pd.DataFrame:
        for lag in self.LAG_DAYS:
            group[f"price_lag_{lag}"] = group["modal_price"].shift(lag)
        return group

    def _add_rolling_features(self, group: pd.DataFrame) -> pd.DataFrame:
        for w in self.ROLLING_WINDOWS:
            group[f"rolling_mean_{w}"] = group["modal_price"].shift(1).rolling(w).mean()
            group[f"rolling_std_{w}"] = group["modal_price"].shift(1).rolling(w).std()
        group["rolling_min_7"] = group["modal_price"].shift(1).rolling(7).min()
        group["rolling_max_7"] = group["modal_price"].shift(1).rolling(7).max()
        # Price velocity (day-over-day change)
        group["price_velocity"] = group["modal_price"].diff()
        # Price volatility (std / mean)
        group["price_volatility"] = (
            group["modal_price"].shift(1).rolling(7).std()
            / group["modal_price"].shift(1).rolling(7).mean()
        ).fillna(0)
        return group

    def _add_supply_features(self, group: pd.DataFrame) -> pd.DataFrame:
        if "arrival_qty" not in group.columns:
            return group
        rolling_supply = group["arrival_qty"].shift(1).rolling(7).mean().fillna(1)
        group["supply_demand_ratio"] = group["arrival_qty"] / rolling_supply.replace(0, 1)
        return group

    # ── Calendar / seasonal features ─────────────────────────────────────────

    def _add_calendar_features(self, df: pd.DataFrame) -> pd.DataFrame:
        df["day_of_week"] = df["date"].dt.dayofweek
        df["day_of_month"] = df["date"].dt.day
        df["month"] = df["date"].dt.month
        df["quarter"] = df["date"].dt.quarter
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        df["is_month_start"] = (df["date"].dt.is_month_start).astype(int)
        df["is_month_end"] = (df["date"].dt.is_month_end).astype(int)

        # Cyclical encoding (sin/cos) for day-of-year and month
        doy = df["date"].dt.dayofyear
        df["sin_doy"] = np.sin(2 * np.pi * doy / 365.25)
        df["cos_doy"] = np.cos(2 * np.pi * doy / 365.25)
        df["sin_month"] = np.sin(2 * np.pi * df["month"] / 12)
        df["cos_month"] = np.cos(2 * np.pi * df["month"] / 12)
        df["sin_dow"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
        df["cos_dow"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

        # Season (Indian agricultural seasons)
        def season(month: int) -> int:
            if month in (12, 1, 2):
                return 0  # Winter
            elif month in (3, 4, 5):
                return 1  # Summer
            elif month in (6, 7, 8, 9):
                return 2  # Monsoon (Kharif)
            else:
                return 3  # Post-monsoon (Rabi)
        df["season"] = df["month"].apply(season)

        # Festival indicator
        fest_dates = self._get_festival_dates(df)
        df["is_festival"] = df["date"].dt.strftime("%Y-%m-%d").isin(fest_dates).astype(int)

        return df

    # ── Weather features ──────────────────────────────────────────────────────

    def _add_weather_features(
        self, df: pd.DataFrame, weather_df: pd.DataFrame | None
    ) -> pd.DataFrame:
        if weather_df is None or weather_df.empty:
            # Fill with zeros if no weather data
            for col in ["temperature", "rainfall", "humidity", "wind_speed"]:
                df[col] = 0.0
            return df

        weather_df = weather_df.copy()
        weather_df["date"] = pd.to_datetime(weather_df["date"])
        weather_df = weather_df[["date", "temperature", "rainfall", "humidity", "wind_speed"]]
        df = df.merge(weather_df, on="date", how="left")

        # Rolling weather (3-day lag for agricultural impact)
        df["rainfall_3d"] = df["rainfall"].rolling(3).mean()
        df["temp_rainfall_interaction"] = df["temperature"] * df["rainfall"].clip(0, 100)

        for col in ["temperature", "rainfall", "humidity", "wind_speed", "rainfall_3d",
                    "temp_rainfall_interaction"]:
            df[col] = df[col].fillna(df[col].median())
        return df

    # ── Main pipeline ─────────────────────────────────────────────────────────

    def transform(
        self, df: pd.DataFrame, weather_df: pd.DataFrame | None = None
    ) -> pd.DataFrame:
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")

        # Per-vegetable lag + rolling features
        group_cols = ["vegetable_name"]
        if "market_name" in df.columns:
            group_cols.append("market_name")

        parts: list[pd.DataFrame] = []
        for keys, group in df.groupby(group_cols):
            group = group.sort_values("date").copy()
            group = self._add_lag_features(group)
            group = self._add_rolling_features(group)
            group = self._add_supply_features(group)
            parts.append(group)

        df = pd.concat(parts, ignore_index=True).sort_values("date")

        # Calendar features (global — same for all vegetables on same date)
        df = self._add_calendar_features(df)
        df = self._add_weather_features(df, weather_df)

        # Target: next-day price
        target_parts: list[pd.DataFrame] = []
        for keys, group in df.groupby(group_cols):
            group = group.sort_values("date").copy()
            group["target_price"] = group["modal_price"].shift(-1)
            target_parts.append(group)
        df = pd.concat(target_parts, ignore_index=True).sort_values("date")

        before = len(df)
        # Drop rows where lag features are NaN (first 14 days per group)
        lag_cols = [f"price_lag_{l}" for l in self.LAG_DAYS]
        df = df.dropna(subset=lag_cols + ["target_price"])
        logger.info(f"Feature engineering: {before} → {len(df)} rows after NaN drop")
        return df.reset_index(drop=True)

    @staticmethod
    def get_feature_columns() -> list[str]:
        lags = [f"price_lag_{l}" for l in FeatureEngineer.LAG_DAYS]
        rolling = [
            f"rolling_{stat}_{w}"
            for w in FeatureEngineer.ROLLING_WINDOWS
            for stat in ["mean", "std"]
        ] + ["rolling_min_7", "rolling_max_7"]
        calendar = [
            "day_of_week", "day_of_month", "month", "quarter", "is_weekend",
            "is_month_start", "is_month_end",
            "sin_doy", "cos_doy", "sin_month", "cos_month", "sin_dow", "cos_dow",
            "season", "is_festival",
        ]
        supply = ["supply_demand_ratio", "price_velocity", "price_volatility"]
        weather = [
            "temperature", "rainfall", "humidity", "wind_speed",
            "rainfall_3d", "temp_rainfall_interaction",
        ]
        return lags + rolling + calendar + supply + weather
