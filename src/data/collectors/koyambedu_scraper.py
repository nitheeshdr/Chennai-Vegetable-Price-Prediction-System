"""
Koyambedu Wholesale Market scraper.
Scrapes the publicly available price board from the market website.
Falls back to a known government price portal if the primary fails.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

# Primary: Tamil Nadu government market price portal
PRIMARY_URL = "https://www.tnvegetablemarketprice.com/koyambedu-market-price"
# Fallback: Agrimarket / general Tamil Nadu price portal
FALLBACK_URL = "https://agrimarket.nic.in/Agri_Market/State_Prices.aspx"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


class KoyambeduScraper:
    def __init__(self, output_dir: str = "data/raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    def _get_html(self, url: str) -> str:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        return resp.text

    def _parse_table(self, html: str, market: str = "Koyambedu") -> pd.DataFrame:
        soup = BeautifulSoup(html, "html.parser")
        records: list[dict] = []

        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue

            headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
            if not any(kw in " ".join(headers) for kw in ["vegetable", "commodity", "price"]):
                continue

            for row in rows[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all("td")]
                if len(cells) < 2:
                    continue
                record: dict = {"market_name": market, "date": date.today().isoformat()}
                for i, h in enumerate(headers):
                    if i < len(cells):
                        record[h] = cells[i]
                records.append(record)

        if not records:
            return pd.DataFrame()

        df = pd.DataFrame(records)
        df = self._normalize_columns(df)
        return df

    def _normalize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        col_map: dict[str, str] = {}
        for col in df.columns:
            lc = col.lower()
            if any(k in lc for k in ["vegetable", "commodity", "item", "name"]):
                col_map[col] = "vegetable_name"
            elif "min" in lc:
                col_map[col] = "min_price"
            elif "max" in lc:
                col_map[col] = "max_price"
            elif any(k in lc for k in ["modal", "rate", "price", "avg"]):
                col_map[col] = "modal_price"
            elif "arrival" in lc or "qty" in lc or "quantity" in lc:
                col_map[col] = "arrival_qty"

        df = df.rename(columns=col_map)

        for col in ["min_price", "max_price", "modal_price", "arrival_qty"]:
            if col in df.columns:
                df[col] = (
                    df[col]
                    .astype(str)
                    .str.replace(r"[^\d.]", "", regex=True)
                )
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df["date"] = pd.to_datetime(df.get("date", date.today().isoformat()))
        df["state"] = "Tamil Nadu"

        keep = ["date", "vegetable_name", "market_name", "state",
                "min_price", "max_price", "modal_price", "arrival_qty"]
        return df[[c for c in keep if c in df.columns]]

    def scrape_today(self) -> pd.DataFrame:
        logger.info("Scraping Koyambedu market prices...")
        for url in [PRIMARY_URL, FALLBACK_URL]:
            try:
                html = self._get_html(url)
                df = self._parse_table(html)
                if not df.empty:
                    logger.info(f"  Scraped {len(df)} price rows from {url}")
                    return df
            except Exception as exc:
                logger.warning(f"  Scraper failed for {url}: {exc}")
        logger.error("All Koyambedu scraper sources failed")
        return pd.DataFrame()

    def save(self, df: pd.DataFrame, filename: str = "koyambedu_today.parquet") -> Path:
        path = self.output_dir / filename
        df.to_parquet(path, index=False)
        logger.info(f"Saved {len(df)} Koyambedu rows → {path}")
        return path

    def run(self) -> pd.DataFrame:
        df = self.scrape_today()
        if not df.empty:
            self.save(df)
        return df
