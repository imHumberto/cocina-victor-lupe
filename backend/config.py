import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/sazon_del_vic")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    META_API_TOKEN = os.getenv("META_API_TOKEN", "")
    META_PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "")
    META_WHATSAPP_API_URL = os.getenv("META_WHATSAPP_API_URL", "https://graph.facebook.com/v19.0")

    HORA_LIMITE_PEDIDOS = os.getenv("HORA_LIMITE_PEDIDOS", "15:40")
    HORA_INICIO_COCINA = os.getenv("HORA_INICIO_COCINA", "09:00")
    HORA_INICIO_ENTREGAS = os.getenv("HORA_INICIO_ENTREGAS", "13:00")
    HORA_LIMITE_CANCELACION = os.getenv("HORA_LIMITE_CANCELACION", "09:00")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
