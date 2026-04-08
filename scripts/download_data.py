#!/usr/bin/env python3
"""
Download all data from web sources (no manual files needed).
Usage: python scripts/download_data.py --years 3
"""
import argparse
import sys
from pathlib import Path

# Make src importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from loguru import logger

load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Download vegetable price datasets")
    parser.add_argument("--years", type=int, default=3, help="Years of historical data")
    parser.add_argument("--skip-mandi", action="store_true", help="Skip Mandi API")
    parser.add_argument("--skip-weather", action="store_true", help="Skip weather data")
    parser.add_argument("--skip-kaggle", action="store_true", help="Skip Kaggle datasets")
    parser.add_argument("--skip-scraper", action="store_true", help="Skip Koyambedu scraper")
    args = parser.parse_args()

    results: dict[str, int] = {}

    # 1. Mandi API (data.gov.in)
    if not args.skip_mandi:
        logger.info("\n[1/4] Fetching Mandi API data (data.gov.in)...")
        from src.data.collectors.mandi_api import MandiAPICollector
        collector = MandiAPICollector()
        df = collector.run(years=args.years)
        results["mandi"] = len(df)
        logger.info(f"  ✓ Mandi: {len(df):,} records")
    else:
        logger.info("[1/4] Skipping Mandi API")

    # 2. Weather data (Open-Meteo — free, no key needed)
    if not args.skip_weather:
        logger.info("\n[2/4] Fetching weather data (Open-Meteo)...")
        from src.data.collectors.weather_api import WeatherCollector
        wx = WeatherCollector()
        df = wx.run(years=args.years)
        results["weather"] = len(df)
        logger.info(f"  ✓ Weather: {len(df):,} days")
    else:
        logger.info("[2/4] Skipping weather data")

    # 3. Kaggle datasets (requires KAGGLE_USERNAME + KAGGLE_KEY in .env)
    if not args.skip_kaggle:
        logger.info("\n[3/4] Downloading Kaggle datasets...")
        from src.data.collectors.kaggle_loader import KaggleLoader
        loader = KaggleLoader()
        df = loader.run()
        results["kaggle"] = len(df)
        logger.info(f"  ✓ Kaggle: {len(df):,} records")
    else:
        logger.info("[3/4] Skipping Kaggle datasets")

    # 4. Koyambedu live scraper
    if not args.skip_scraper:
        logger.info("\n[4/4] Scraping Koyambedu market prices...")
        from src.data.collectors.koyambedu_scraper import KoyambeduScraper
        scraper = KoyambeduScraper()
        df = scraper.run()
        results["koyambedu"] = len(df)
        logger.info(f"  ✓ Koyambedu: {len(df):,} price rows")
    else:
        logger.info("[4/4] Skipping Koyambedu scraper")

    # Summary
    logger.info("\n" + "=" * 50)
    logger.info("DATA DOWNLOAD SUMMARY")
    logger.info("=" * 50)
    total = sum(results.values())
    for source, count in results.items():
        logger.info(f"  {source:<15} {count:>10,} rows")
    logger.info(f"  {'TOTAL':<15} {total:>10,} rows")
    logger.info("\nNext step: python scripts/train_models.py")


if __name__ == "__main__":
    main()
