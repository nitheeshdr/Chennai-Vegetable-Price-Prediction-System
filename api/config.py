from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Security
    secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # App
    environment: str = "development"
    log_level: str = "INFO"
    model_artifacts_path: str = "data/model_artifacts"
    data_features_path: str = "data/features"

    # FCM push notifications
    fcm_server_key: str = ""

    # NVIDIA NIM (AI predictions)
    nvidia_api_key: str = ""

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
