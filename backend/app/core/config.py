from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # Local dev / tests: a full URL wins. In production the DB_* parts are injected instead.
    database_url: str | None = None
    db_host: str | None = None
    db_port: int = 3306
    db_name: str = "gym_tracker"
    db_user: str | None = None
    db_password: str | None = None

    cognito_region: str = "eu-west-1"
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    allowed_emails: str = ""  # comma-separated
    allowed_origins: str = "http://localhost:5173"

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            return self.database_url
        user = quote_plus(self.db_user or "")
        password = quote_plus(self.db_password or "")
        host = self.db_host or "localhost"
        return f"mysql+pymysql://{user}:{password}@{host}:{self.db_port}/{self.db_name}"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def allowed_emails_set(self) -> set[str]:
        return {email.strip().lower() for email in self.allowed_emails.split(",") if email.strip()}


settings = Settings()
