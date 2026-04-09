"""Initial schema: price_records, weather_records, predictions, users, alerts, model_metrics

Revision ID: 0001
Revises:
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "price_records",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("vegetable_name", sa.String(100), nullable=False),
        sa.Column("market_name", sa.String(200)),
        sa.Column("state", sa.String(100)),
        sa.Column("min_price", sa.Float),
        sa.Column("max_price", sa.Float),
        sa.Column("modal_price", sa.Float, nullable=False),
        sa.Column("arrival_qty", sa.Float, default=0),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("date", "vegetable_name", "market_name", name="uq_price_record"),
    )
    op.create_index("ix_price_records_date", "price_records", ["date"])
    op.create_index("ix_price_records_vegetable_name", "price_records", ["vegetable_name"])

    op.create_table(
        "weather_records",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("date", sa.String(10), nullable=False),
        sa.Column("location", sa.String(100), nullable=False),
        sa.Column("temperature", sa.Float),
        sa.Column("rainfall", sa.Float),
        sa.Column("humidity", sa.Float),
        sa.Column("wind_speed", sa.Float),
        sa.UniqueConstraint("date", "location", name="uq_weather_record"),
    )

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("vegetable_name", sa.String(100), nullable=False),
        sa.Column("prediction_date", sa.String(10), nullable=False),
        sa.Column("predicted_price", sa.Float, nullable=False),
        sa.Column("confidence_lower", sa.Float),
        sa.Column("confidence_upper", sa.Float),
        sa.Column("trend", sa.String(10)),
        sa.Column("model_used", sa.String(50)),
        sa.Column("actual_price", sa.Float),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_predictions_vegetable_name", "predictions", ["vegetable_name"])

    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("device_token", sa.String(500)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "price_alerts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("vegetable_name", sa.String(100), nullable=False),
        sa.Column("threshold_price", sa.Float, nullable=False),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("market_name", sa.String(200)),
        sa.Column("is_active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_user_id", "price_alerts", ["user_id"])

    op.create_table(
        "model_metrics",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("model_name", sa.String(50), nullable=False),
        sa.Column("vegetable_name", sa.String(100), nullable=False),
        sa.Column("eval_date", sa.String(10), nullable=False),
        sa.Column("rmse", sa.Float),
        sa.Column("mae", sa.Float),
        sa.Column("mape", sa.Float),
        sa.Column("direction_accuracy", sa.Float),
    )


def downgrade() -> None:
    for table in ["model_metrics", "price_alerts", "users", "predictions",
                  "weather_records", "price_records"]:
        op.drop_table(table)
