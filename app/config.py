from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./german_app.db"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    jwt_secret: str = "dev-change-me"
    jwt_algorithm: str = "HS256"
    access_token_exp_minutes: int = 60 * 24 * 7
    frontend_origins: str = "http://localhost:5173"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    default_admin_username: str = "admin"
    default_admin_password: str = "admin"

    model_config = {"env_file": ".env"}


settings = Settings()
