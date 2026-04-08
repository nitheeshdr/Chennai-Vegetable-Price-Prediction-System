#!/usr/bin/env python3
"""
Seed Supabase with historical price data from local parquet files.
Usage: python scripts/seed_database.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from dotenv import load_dotenv
from loguru import logger
from supabase import create_client
import os

load_dotenv()


def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)

    supabase = create_client(url, key)

    # Load processed price data
    price_path = Path("data/processed/clean_prices.parquet")
    if not price_path.exists():
        logger.error(f"Processed data not found: {price_path}")
        logger.info("Run: python scripts/download_data.py && python scripts/train_models.py")
        sys.exit(1)

    df = pd.read_parquet(price_path)
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    # Seed price_records table
    logger.info(f"Seeding {len(df):,} price records to Supabase...")
    records = df[[
        "date", "vegetable_name", "market_name", "state",
        "min_price", "max_price", "modal_price", "arrival_qty"
    ]].fillna(0).to_dict(orient="records")

    BATCH_SIZE = 500
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            supabase.table("price_records").upsert(
                batch,
                on_conflict="date,vegetable_name,market_name",
            ).execute()
            logger.info(f"  Inserted batch {i//BATCH_SIZE + 1}/{len(records)//BATCH_SIZE + 1}")
        except Exception as exc:
            logger.error(f"  Batch {i//BATCH_SIZE + 1} failed: {exc}")

    # Seed weather data
    weather_path = Path("data/raw/weather_raw.parquet")
    if weather_path.exists():
        wx = pd.read_parquet(weather_path)
        wx["date"] = pd.to_datetime(wx["date"]).dt.strftime("%Y-%m-%d")
        wx_records = wx.fillna(0).to_dict(orient="records")
        logger.info(f"Seeding {len(wx_records):,} weather records...")
        for i in range(0, len(wx_records), BATCH_SIZE):
            batch = wx_records[i:i + BATCH_SIZE]
            try:
                supabase.table("weather_records").upsert(
                    batch, on_conflict="date,location"
                ).execute()
            except Exception as exc:
                logger.error(f"  Weather batch failed: {exc}")

    logger.info("✓ Database seeded successfully")


if __name__ == "__main__":
    main()
