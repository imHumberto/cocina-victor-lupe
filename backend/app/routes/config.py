from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from app.models.configuracion import Configuracion

config_bp = Blueprint("config", __name__)


@config_bp.get("/estado")
def get_estado():
    """Público — el cliente lo consulta para saber si puede ordenar."""
    pausado = Configuracion.get("pedidos_pausados", "false") == "true"
    return jsonify({"pedidos_pausados": pausado})


@config_bp.post("/pedidos-pausados")
@jwt_required()
def set_pedidos_pausados():
    """Solo admin."""
    claims = get_jwt()
    if claims.get("rol") != "admin":
        return jsonify({"error": "No autorizado"}), 403

    data = request.get_json() or {}
    pausado = bool(data.get("pausado", False))
    Configuracion.set("pedidos_pausados", "true" if pausado else "false")
    return jsonify({"pedidos_pausados": pausado})
