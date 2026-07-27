from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://gymapp:gymapppassword@localhost:3306/gym_tracker"
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    class Config:
        env_file = ".env"


settings = Settings()
