"""
API smoke tests using httpx TestClient.
Models don't need to be trained — endpoints return 404 gracefully.
"""
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Set dummy env vars before importing app
import os
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-key")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from api.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data


def test_predict_missing_vegetable():
    resp = client.get("/predict")
    assert resp.status_code == 422  # missing required param


def test_predict_unknown_vegetable():
    resp = client.get("/predict", params={"vegetable": "alien_veggie_xyz"})
    # Should return 404 (no model) not 500
    assert resp.status_code in (404, 503)


def test_current_price_missing_param():
    resp = client.get("/get-current-price")
    assert resp.status_code == 422


def test_weekly_forecast_missing_param():
    resp = client.get("/weekly-forecast")
    assert resp.status_code == 422
