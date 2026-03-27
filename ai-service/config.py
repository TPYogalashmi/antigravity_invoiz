import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY       = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG            = os.getenv("FLASK_DEBUG", "0") == "1"
    PORT             = int(os.getenv("FLASK_PORT", 5000))
    CORS_ORIGINS     = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8080/api")
    OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY", "")
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")

    DB_HOST     = os.getenv("DB_HOST", "localhost")
    DB_PORT     = int(os.getenv("DB_PORT", 3306))
    DB_NAME     = os.getenv("DB_NAME", "billing_crm_ai")
    DB_USER     = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "root")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{os.getenv('DB_USER','root')}:{os.getenv('DB_PASSWORD','')}@"
        f"{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT',3306)}/{os.getenv('DB_NAME','billing_crm_ai')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "default":     DevelopmentConfig,
}