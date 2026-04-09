#!/usr/bin/env python3
"""
Daily retraining pipeline — runs automatically via cron/launchd.
Steps:
  1. Collect fresh price data from mandi API
  2. Retrain ensemble models (incremental, no deep learning)
  3. Generate next-day predictions for all 18 vegetables
  4. Push predictions to Supabase
  5. Log results
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from datetime import date, timedelta

import psycopg2
from dotenv import load_dotenv
from loguru import logger

load_dotenv(ROOT / ".env")

import os

LOG_FILE = ROOT / "logs" / f"retrain_{date.today()}.log"
logger.add(LOG_FILE, rotation="7 days", retention="30 days", level="INFO")

VEGETABLES = [
    "tomato", "onion", "potato", "garlic", "ginger", "green_chilli",
    "brinjal", "cabbage", "carrot", "cauliflower", "beans", "bitter_gourd",
    "bottle_gourd", "coriander", "drumstick", "ladies_finger", "raw_banana", "tapioca",
]


def step_collect():
    """Fetch latest prices from mandi API."""
    logger.info("Step 1/4 — Collecting fresh price data...")
    try:
        from src.data.collectors.mandi_api import MandiCollector
        collector = MandiCollector()
        df = collector.fetch(days_back=7)
        logger.info(f"  Collected {len(df)} new price records")
    except Exception as e:
        logger.warning(f"  Data collection skipped: {e}")


def step_train():
    """Retrain all models incrementally."""
    logger.info("Step 2/4 — Training models (incremental, no deep learning)...")
    from src.pipeline.training_pipeline import TrainingPipeline
    pipeline = TrainingPipeline(include_deep_learning=False, include_lstm=False)
    mapping = pipeline.run(incremental=True)
    logger.info(f"  Trained {len(mapping)} vegetables: {list(mapping.keys())}")
    return mapping


def step_predict():
    """Generate tomorrow's predictions using freshly trained models."""
    logger.info("Step 3/4 — Generating predictions...")
    from src.pipeline.inference_pipeline import InferencePipeline
    pipe = InferencePipeline()
    tomorrow = date.today() + timedelta(days=1)
    results = {}
    for veg in VEGETABLES:
        try:
            pred = pipe.predict(veg, market=None, prediction_date=tomorrow)
            if pred:
                results[veg] = pred
                logger.info(f"  {veg}: Rs{pred.predicted_price} ({pred.trend})")
            else:
                logger.warning(f"  {veg}: no prediction returned")
        except Exception as e:
            logger.error(f"  {veg}: predict failed — {e}")
    logger.info(f"  Generated {len(results)}/{len(VEGETABLES)} predictions")
    return results, tomorrow


def step_push(results: dict, prediction_date: date):
    """Push predictions to Supabase."""
    logger.info("Step 4/4 — Pushing to Supabase...")
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.error("  DATABASE_URL not set — skipping push")
        return

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    pushed = 0
    for veg, pred in results.items():
        try:
            cur.execute(
                """
                INSERT INTO predictions
                    (vegetable_name, prediction_date, predicted_price,
                     confidence_lower, confidence_upper, trend, model_used)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    veg,
                    str(prediction_date),
                    pred.predicted_price,
                    pred.confidence_lower,
                    pred.confidence_upper,
                    pred.trend,
                    pred.model_name,
                ),
            )
            pushed += 1
        except Exception as e:
            logger.error(f"  Insert failed for {veg}: {e}")

    conn.commit()
    cur.close()
    conn.close()
    logger.info(f"  Pushed {pushed}/{len(results)} predictions to Supabase")


def main():
    logger.info(f"=== Daily retrain started: {date.today()} ===")
    try:
        step_collect()
        step_train()
        results, prediction_date = step_predict()
        step_push(results, prediction_date)
        logger.info("=== Daily retrain COMPLETE ===")
    except Exception as e:
        logger.exception(f"=== Daily retrain FAILED: {e} ===")
        sys.exit(1)


if __name__ == "__main__":
    main()
