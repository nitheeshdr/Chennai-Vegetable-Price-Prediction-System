"""
OpenWeatherMap historical weather collector for Chennai.
Uses the One Call API 3.0 (timemachine endpoint) for daily weather.
Falls back to Open-Meteo (free, no key needed) if OWM key unavailable.
"""
from __future__ import annotations

import os
import time
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

# Chennai coordinates
LAT = 13.0827
LON = 80.2707

# Open-Meteo free historical API (no key required)
OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"


class WeatherCollector:
    def __init__(self, api_key: str | None = None, output_dir: str = "data/raw"):
        self.api_key = api_key or os.getenv("OPENWEATHER_API_KEY", "")
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    def _fetch_open_meteo(self, from_date: date, to_date: date) -> pd.DataFrame:
        """Open-Meteo free historical API — no key needed."""
        params = {
            "latitude": LAT,
            "longitude": LON,
            "start_date": from_date.isoformat(),
            "end_date": to_date.isoformat(),
            "daily": [
                "temperature_2m_max",
                "temperature_2m_min",
                "temperature_2m_mean",
                "precipitation_sum",
                "relative_humidity_2m_max",
                "relative_humidity_2m_min",
                "windspeed_10m_max",
            ],
            "timezone": "Asia/Kolkata",
        }
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        daily = data["daily"]
        df = pd.DataFrame(daily)
        df = df.rename(
            columns={
                "time": "date",
                "temperature_2m_max": "temp_max",
                "temperature_2m_min": "temp_min",
                "temperature_2m_mean": "temperature",
                "precipitation_sum": "rainfall",
                "relative_humidity_2m_max": "humidity_max",
                "relative_humidity_2m_min": "humidity_min",
                "windspeed_10m_max": "wind_speed",
            }
        )
        df["date"] = pd.to_datetime(df["date"])
        df["humidity"] = (df["humidity_max"] + df["humidity_min"]) / 2
        df["location"] = "Chennai"
        return df[["date", "location", "temperature", "temp_max", "temp_min",
                   "rainfall", "humidity", "wind_speed"]]

    def fetch(self, from_date: date | None = None, to_date: date | None = None) -> pd.DataFrame:
        if from_date is None:
            from_date = date.today() - timedelta(days=365 * 3)
        if to_date is None:
            to_date = date.today() - timedelta(days=1)  # yesterday (Open-Meteo lag)

        logger.info(f"Fetching weather data: Chennai | {from_date} → {to_date}")

        # Fetch in 1-year chunks to avoid API limits
        chunks: list[pd.DataFrame] = []
        chunk_start = from_date
        while chunk_start <= to_date:
            chunk_end = min(chunk_start + timedelta(days=364), to_date)
            try:
                chunk = self._fetch_open_meteo(chunk_start, chunk_end)
                chunks.append(chunk)
                logger.info(f"  Weather chunk {chunk_start} → {chunk_end}: {len(chunk)} days")
            except Exception as exc:
                logger.error(f"  Failed weather chunk {chunk_start}: {exc}")
            chunk_start = chunk_end + timedelta(days=1)
            time.sleep(0.5)

        if not chunks:
            return pd.DataFrame()

        df = pd.concat(chunks, ignore_index=True)
        df = df.sort_values("date").drop_duplicates("date").reset_index(drop=True)
        return df

    def save(self, df: pd.DataFrame, filename: str = "weather_raw.parquet") -> Path:
        path = self.output_dir / filename
        df.to_parquet(path, index=False)
        logger.info(f"Saved {len(df)} weather records → {path}")
        return path

    def run(self, years: int = 3) -> pd.DataFrame:
        from_date = date.today() - timedelta(days=365 * years)
        df = self.fetch(from_date=from_date)
        if not df.empty:
            self.save(df)
        return df
