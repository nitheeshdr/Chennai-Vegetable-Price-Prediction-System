"""
Daily incremental retraining — runs via APScheduler inside ML worker container.
Collects fresh data, retrains models, updates artifacts.
"""
from __future__ import annotations

from datetime import date
from loguru import logger


def run_daily_retraining() -> None:
    logger.info(f"=== Daily Retraining Started: {date.today()} ===")

    # 1. Collect today's fresh data
    try:
        from src.data.collectors.mandi_api import MandiAPICollector
        from src.data.collectors.weather_api import WeatherCollector
        from src.data.collectors.koyambedu_scraper import KoyambeduScraper
        import pandas as pd
        from pathlib import Path

        raw_dir = Path("data/raw")
        mandi = MandiAPICollector(output_dir=str(raw_dir))
        today_df = mandi.fetch_state_data(
            from_date=date.today(),
            to_date=date.today(),
        )
        if not today_df.empty:
            # Append to existing parquet
            existing_path = raw_dir / "mandi_raw.parquet"
            if existing_path.exists():
                existing = pd.read_parquet(existing_path)
                combined = pd.concat([existing, today_df], ignore_index=True)
                combined = combined.drop_duplicates(
                    subset=["date", "vegetable_name", "market_name"]
                )
                combined.to_parquet(existing_path, index=False)
            else:
                today_df.to_parquet(existing_path, index=False)
            logger.info(f"Appended {len(today_df)} new mandi records")

        # Scrape Koyambedu
        koy = KoyambeduScraper(output_dir=str(raw_dir))
        koy.run()

        # Weather
        wx = WeatherCollector(output_dir=str(raw_dir))
        wx.run(years=0)  # just today

    except Exception as exc:
        logger.error(f"Data collection failed: {exc}")

    # 2. Rebuild features
    try:
        from src.data.dataset_builder import DatasetBuilder
        builder = DatasetBuilder()
        builder.build()
        logger.info("Feature rebuild complete")
    except Exception as exc:
        logger.error(f"Feature rebuild failed: {exc}")
        return

    # 3. Retrain (incremental = True skips full hyperparameter search)
    try:
        from src.pipeline.training_pipeline import TrainingPipeline
        pipeline = TrainingPipeline(include_deep_learning=False)  # fast daily retrain
        pipeline.run(incremental=True)
        logger.info("Daily retraining complete")
    except Exception as exc:
        logger.error(f"Retraining failed: {exc}")

    # 4. Clear model cache so API picks up new weights
    from src.pipeline.inference_pipeline import _MODEL_CACHE
    _MODEL_CACHE.clear()
    logger.info("Model cache cleared — API will load fresh models")
    logger.info(f"=== Daily Retraining Complete: {date.today()} ===")


def schedule_daily(hour: int = 2, minute: int = 0) -> None:
    """Start APScheduler to run retraining daily at `hour:minute`."""
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = BlockingScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        run_daily_retraining,
        trigger=CronTrigger(hour=hour, minute=minute),
        id="daily_retrain",
        name="Daily vegetable price model retraining",
        replace_existing=True,
    )
    logger.info(f"Retraining scheduler started — runs daily at {hour:02d}:{minute:02d} IST")
    scheduler.start()


if __name__ == "__main__":
    schedule_daily()
