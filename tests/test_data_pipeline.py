import pytest
import pandas as pd
from src.data.preprocessor import Preprocessor, load_alias_map
from src.data.feature_engineer import FeatureEngineer


def test_alias_map_loads():
    m = load_alias_map()
    assert "tomato" in m.values()
    assert "onion" in m.values()


def test_preprocessor_standardize_name():
    p = Preprocessor()
    assert p.standardize_vegetable_name("Tomato") == "tomato"
    assert p.standardize_vegetable_name("ONION") == "onion"
    assert p.standardize_vegetable_name("xyz_unknown") is None


def test_preprocessor_clean(sample_price_df):
    p = Preprocessor()
    clean = p.clean(sample_price_df)
    assert len(clean) > 0
    assert "modal_price" in clean.columns
    assert clean["modal_price"].notna().all()
    assert (clean["modal_price"] > 0).all()


def test_preprocessor_fill_gaps(sample_price_df):
    p = Preprocessor()
    clean = p.clean(sample_price_df)
    filled = p.fill_gaps(clean)
    assert len(filled) >= len(clean)


def test_feature_engineer_transform(sample_price_df, sample_weather_df):
    p = Preprocessor()
    clean = p.run(sample_price_df)
    fe = FeatureEngineer()
    featured = fe.transform(clean, weather_df=sample_weather_df)
    assert "price_lag_1" in featured.columns
    assert "rolling_mean_7" in featured.columns
    assert "sin_doy" in featured.columns
    assert "target_price" in featured.columns
    # No NaN in lag features after transform
    assert featured["price_lag_1"].notna().all()


def test_feature_columns_list():
    cols = FeatureEngineer.get_feature_columns()
    assert len(cols) > 10
    assert "price_lag_7" in cols
    assert "temperature" in cols
    assert "is_festival" in cols
