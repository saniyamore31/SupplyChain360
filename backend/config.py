import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root or backend directory if present
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

class Config:
    """Base application configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-supplychain360")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    DEMO_MODE = os.environ.get("DEMO_MODE", "true").lower() in ("true", "1", "yes")

class DevelopmentConfig(Config):
    """Development configuration using local SQLite."""
    DEBUG = True
    DB_PATH = BASE_DIR / "instance" / "supplychain360.db"
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")

class TestingConfig(Config):
    """Testing configuration using in-memory or dedicated test SQLite database."""
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")

config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig
}
