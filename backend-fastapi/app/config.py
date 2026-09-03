from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: str
    jwt_secret: str
    gemini_api_key: str
    port: int = 8000
    postgres_uri: str | None = None


settings = Settings()
