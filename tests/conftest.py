import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def sample_price_df():
    """Minimal price dataframe for testing."""
    import numpy as np
    dates = pd.date_range("2023-01-01", periods=100, freq="D")
    rng = np.random.default_rng(42)
    return pd.DataFrame({
        "date": dates,
        "vegetable_name": "tomato",
        "market_name": "Koyambedu",
        "state": "Tamil Nadu",
        "modal_price": 30 + rng.normal(0, 5, 100).cumsum() % 60,
        "min_price": 25.0,
        "max_price": 50.0,
        "arrival_qty": rng.integers(1000, 5000, 100).astype(float),
    })


@pytest.fixture
def sample_weather_df():
    import numpy as np
    dates = pd.date_range("2023-01-01", periods=100, freq="D")
    rng = np.random.default_rng(0)
    return pd.DataFrame({
        "date": dates,
        "location": "Chennai",
        "temperature": 28 + rng.normal(0, 3, 100),
        "rainfall": rng.exponential(2, 100),
        "humidity": 70 + rng.normal(0, 10, 100),
        "wind_speed": rng.uniform(5, 20, 100),
    })
