"""SQLAlchemy ORM models — mirrors Supabase tables."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from api.db.database import Base


class PriceRecord(Base):
    __tablename__ = "price_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    vegetable_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    market_name: Mapped[str] = mapped_column(String(200), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    min_price: Mapped[float] = mapped_column(Float, nullable=True)
    max_price: Mapped[float] = mapped_column(Float, nullable=True)
    modal_price: Mapped[float] = mapped_column(Float, nullable=False)
    arrival_qty: Mapped[float] = mapped_column(Float, nullable=True, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class WeatherRecord(Base):
    __tablename__ = "weather_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(100), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=True)
    rainfall: Mapped[float] = mapped_column(Float, nullable=True)
    humidity: Mapped[float] = mapped_column(Float, nullable=True)
    wind_speed: Mapped[float] = mapped_column(Float, nullable=True)


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vegetable_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    prediction_date: Mapped[str] = mapped_column(String(10), nullable=False)
    predicted_price: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_lower: Mapped[float] = mapped_column(Float, nullable=True)
    confidence_upper: Mapped[float] = mapped_column(Float, nullable=True)
    trend: Mapped[str] = mapped_column(String(10), nullable=True)
    model_used: Mapped[str] = mapped_column(String(50), nullable=True)
    actual_price: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    device_token: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    vegetable_name: Mapped[str] = mapped_column(String(100), nullable=False)
    threshold_price: Mapped[float] = mapped_column(Float, nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # "above" | "below"
    market_name: Mapped[str] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ModelMetric(Base):
    __tablename__ = "model_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(50), nullable=False)
    vegetable_name: Mapped[str] = mapped_column(String(100), nullable=False)
    eval_date: Mapped[str] = mapped_column(String(10), nullable=False)
    rmse: Mapped[float] = mapped_column(Float, nullable=True)
    mae: Mapped[float] = mapped_column(Float, nullable=True)
    mape: Mapped[float] = mapped_column(Float, nullable=True)
    direction_accuracy: Mapped[float] = mapped_column(Float, nullable=True)
