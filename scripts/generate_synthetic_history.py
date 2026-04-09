#!/usr/bin/env python3
"""
Generate synthetic historical price data based on today's real Mandi prices.
Uses realistic time-series patterns: seasonal cycles, weekly patterns,
festival spikes, and random walk — seeded from actual current prices.

This is used to bootstrap the ML training pipeline when only current
market prices are available from the API (Mandi API returns today only).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
from loguru import logger

RAW_DIR = Path("data/raw")
YEARS = 3


def seasonal_pattern(doy: np.ndarray, amplitude: float = 0.15) -> np.ndarray:
    """Annual seasonal cycle (monsoon → post-monsoon price dip/spike)."""
    return amplitude * np.sin(2 * np.pi * doy / 365 + np.pi / 6)


def weekly_pattern(dow: np.ndarray, amplitude: float = 0.05) -> np.ndarray:
    """Weekly cycle: prices slightly higher on weekends/market days."""
    return amplitude * np.sin(2 * np.pi * dow / 7)


def festival_spike(dates: pd.DatetimeIndex) -> np.ndarray:
    """Add price spikes around Pongal (Jan 14), Diwali (Oct-Nov), Tamil New Year (Apr 14)."""
    spike = np.zeros(len(dates))
    for i, d in enumerate(dates):
        # Pongal window: Jan 10-20
        if d.month == 1 and 8 <= d.day <= 20:
            spike[i] = 0.15
        # Tamil New Year: Apr 12-18
        elif d.month == 4 and 12 <= d.day <= 18:
            spike[i] = 0.12
        # Diwali window: Oct 15 – Nov 15 (approximate)
        elif (d.month == 10 and d.day >= 15) or (d.month == 11 and d.day <= 15):
            spike[i] = 0.10
    return spike


def random_walk(n: int, volatility: float = 0.02, seed: int = 42) -> np.ndarray:
    """Correlated random walk for realistic price drift."""
    rng = np.random.default_rng(seed)
    steps = rng.normal(0, volatility, n)
    # Add occasional supply shocks
    shocks = rng.choice([0, 0, 0, 0, 0.15, -0.15], n, p=[0.94, 0.01, 0.01, 0.01, 0.015, 0.015])
    return np.cumsum(steps + shocks)


def generate_vegetable_history(
    vegetable: str,
    base_price: float,
    dates: pd.DatetimeIndex,
    seed: int,
    volatility: float = 0.03,
) -> pd.DataFrame:
    n = len(dates)
    doy = np.array([d.day_of_year for d in dates])
    dow = np.array([d.dayofweek for d in dates])

    # Build multiplicative price series
    log_price = np.log(max(base_price, 1))
    trend = seasonal_pattern(doy, amplitude=0.15)
    weekly = weekly_pattern(dow, amplitude=0.04)
    festival = festival_spike(dates)
    walk = random_walk(n, volatility=volatility, seed=seed)

    # Normalize walk to stay within ±50% of base
    walk = walk - walk.mean()
    walk = walk / (np.abs(walk).max() + 1e-8) * 0.40

    log_series = log_price + trend + weekly + festival + walk
    prices = np.exp(log_series)
    prices = np.clip(prices, base_price * 0.3, base_price * 3.5)

    min_prices = prices * np.random.default_rng(seed + 1).uniform(0.85, 0.95, n)
    max_prices = prices * np.random.default_rng(seed + 2).uniform(1.05, 1.20, n)
    arrival = np.random.default_rng(seed + 3).integers(500, 8000, n).astype(float)

    return pd.DataFrame({
        "date": dates,
        "vegetable_name": vegetable,
        "market_name": "Koyambedu",
        "state": "Tamil Nadu",
        "min_price": np.round(min_prices, 2),
        "max_price": np.round(max_prices, 2),
        "modal_price": np.round(prices, 2),
        "arrival_qty": arrival,
    })


def main():
    mandi_path = RAW_DIR / "mandi_raw.parquet"
    if not mandi_path.exists():
        logger.error("mandi_raw.parquet not found. Run download_data.py first.")
        sys.exit(1)

    today_df = pd.read_parquet(mandi_path)
    logger.info(f"Loaded {len(today_df)} today's records, {today_df['vegetable_name'].nunique()} vegetables")

    # Use mean price per vegetable as base
    base_prices = today_df.groupby("vegetable_name")["modal_price"].mean()

    # Note: prices in the API are per quintal (100 kg), convert to per kg
    base_prices = base_prices / 100.0
    base_prices = base_prices.clip(lower=5)  # sanity floor

    dates = pd.date_range(
        end=pd.Timestamp.today().normalize() - pd.Timedelta(days=1),
        periods=365 * YEARS,
        freq="D",
    )
    logger.info(f"Generating {YEARS} years of daily history: {dates[0].date()} → {dates[-1].date()}")

    all_dfs = []
    for i, (veg, base_price) in enumerate(base_prices.items()):
        veg_df = generate_vegetable_history(
            vegetable=veg,
            base_price=float(base_price),
            dates=dates,
            seed=i * 137,
            volatility=0.025,
        )
        all_dfs.append(veg_df)

    synthetic = pd.concat(all_dfs, ignore_index=True)
    # Append today's real data
    today_clean = today_df[["date", "vegetable_name", "market_name", "state",
                             "min_price", "max_price", "modal_price"]].copy()
    today_clean["arrival_qty"] = 1000.0
    today_clean["min_price"] = today_clean["min_price"] / 100.0
    today_clean["max_price"] = today_clean["max_price"] / 100.0
    today_clean["modal_price"] = today_clean["modal_price"] / 100.0

    combined = pd.concat([synthetic, today_clean], ignore_index=True)
    combined = combined.sort_values("date").reset_index(drop=True)

    out_path = RAW_DIR / "mandi_raw.parquet"
    combined.to_parquet(out_path, index=False)
    logger.info(f"Saved {len(combined):,} rows ({combined['vegetable_name'].nunique()} vegetables) → {out_path}")
    logger.info(f"Date range: {combined['date'].min().date()} → {combined['date'].max().date()}")


if __name__ == "__main__":
    main()
