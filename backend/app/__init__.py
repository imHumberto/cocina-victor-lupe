from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO

from config import config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO()


def create_app(env="default"):
    app = Flask(__name__)
    app.config.from_object(config[env])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, origins=[app.config["FRONTEND_URL"]])
    socketio.init_app(app, cors_allowed_origins=app.config["FRONTEND_URL"], async_mode="threading")

    from app.routes.auth import auth_bp
    from app.routes.menu import menu_bp
    from app.routes.pedidos import pedidos_bp
    from app.routes.admin import admin_bp
    from app.routes.repartidor import repartidor_bp
    from app.routes.notificaciones import notif_bp
    from app.routes.geo import geo_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(menu_bp, url_prefix="/api/menu")
    app.register_blueprint(pedidos_bp, url_prefix="/api/pedidos")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(repartidor_bp, url_prefix="/api/repartidor")
    app.register_blueprint(notif_bp, url_prefix="/api/notificaciones")
    app.register_blueprint(geo_bp, url_prefix="/api/geo")

    return app
