from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./german_app.db"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    model_config = {"env_file": ".env"}


settings = Settings()
