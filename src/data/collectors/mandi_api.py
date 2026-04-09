"""
data.gov.in Mandi (AGMARKNET) price collector.
Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
Fetches daily commodity arrival & price data for Tamil Nadu markets.
"""
from __future__ import annotations

import os
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
PAGE_SIZE = 500


class MandiAPICollector:
    def __init__(self, api_key: str | None = None, output_dir: str = "data/raw"):
        self.api_key = api_key or os.getenv("DATA_GOV_IN_API_KEY", "")
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "VegPrice/1.0"})

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _fetch_page(self, offset: int, filters: dict) -> dict:
        params = {
            "api-key": self.api_key,
            "format": "json",
            "limit": PAGE_SIZE,
            "offset": offset,
            **filters,
        }
        resp = self.session.get(BASE_URL, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def fetch_state_data(
        self,
        state: str = "Tamil Nadu",
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> pd.DataFrame:
        if from_date is None:
            from_date = date.today() - timedelta(days=365 * 3)
        if to_date is None:
            to_date = date.today()

        logger.info(f"Fetching mandi data: {state} | {from_date} → {to_date}")

        # API uses lowercase field names; date filter not supported server-side — filter in Python
        filters = {
            "filters[state]": state,
        }

        all_records: list[dict] = []
        offset = 0

        while True:
            try:
                data = self._fetch_page(offset, filters)
            except Exception as exc:
                logger.error(f"Failed fetching offset {offset}: {exc}")
                break

            records = data.get("records", [])
            if not records:
                break

            all_records.extend(records)
            total = int(data.get("total", 0))
            logger.info(f"  Fetched {len(all_records)}/{total} records")

            if len(all_records) >= total:
                break
            offset += PAGE_SIZE
            time.sleep(0.3)  # be polite to the API

        if not all_records:
            logger.warning("No records returned from Mandi API")
            return pd.DataFrame()

        df = pd.DataFrame(all_records)
        df = self._normalize(df)
        # Filter by date range in Python (API doesn't support date range filter)
        if "date" in df.columns and from_date and to_date:
            from_ts = pd.Timestamp(from_date)
            to_ts = pd.Timestamp(to_date)
            df = df[(df["date"] >= from_ts) & (df["date"] <= to_ts)]
        return df

    def _normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        # API returns lowercase field names
        col_map = {
            "arrival_date": "date",
            "commodity": "vegetable_name",
            "market": "market_name",
            "district": "district",
            "state": "state",
            "min_price": "min_price",
            "max_price": "max_price",
            "modal_price": "modal_price",
            "arrivals_in_qtl": "arrival_qty",
        }
        df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

        # Parse date
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                df["date"] = pd.to_datetime(df["date"], format=fmt, errors="raise")
                break
            except (ValueError, KeyError):
                continue
        else:
            df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")

        # Numeric prices
        for col in ["min_price", "max_price", "modal_price", "arrival_qty"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Convert qtl → kg (1 quintal = 100 kg)
        if "arrival_qty" in df.columns:
            df["arrival_qty"] = df["arrival_qty"] * 100

        df = df.dropna(subset=["date", "vegetable_name", "modal_price"])
        df = df.sort_values("date").reset_index(drop=True)
        return df

    def save(self, df: pd.DataFrame, filename: str = "mandi_raw.parquet") -> Path:
        path = self.output_dir / filename
        df.to_parquet(path, index=False)
        logger.info(f"Saved {len(df)} mandi records → {path}")
        return path

    def run(self, years: int = 3) -> pd.DataFrame:
        from_date = date.today() - timedelta(days=365 * years)
        df = self.fetch_state_data(from_date=from_date)
        if not df.empty:
            self.save(df)
        return df
