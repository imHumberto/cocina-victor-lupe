from datetime import datetime, time, timezone
from flask import current_app
from functools import wraps
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask import jsonify

from app.models.user import User


def tiempo_actual():
    """Hora actual en zona local (sin tzinfo para comparar con time())."""
    return datetime.now().time()


def hora_limite_pedidos():
    h, m = current_app.config["HORA_LIMITE_PEDIDOS"].split(":")
    return time(int(h), int(m))


def hora_limite_cancelacion():
    h, m = current_app.config["HORA_LIMITE_CANCELACION"].split(":")
    return time(int(h), int(m))


def puede_ordenar_hoy():
    return True  # TODO: descomentar para producción
    # return tiempo_actual() < hora_limite_pedidos()


def puede_cancelar_hoy():
    return True  # TODO: descomentar para producción
    # return tiempo_actual() < hora_limite_cancelacion()


def require_role(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or user.rol not in roles:
                return jsonify({"error": "Acceso no autorizado"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
