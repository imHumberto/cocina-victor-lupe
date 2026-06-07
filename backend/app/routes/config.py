from flask import Blueprint, jsonify, request
from app.models.configuracion import Configuracion
from app.utils.helpers import require_role

config_bp = Blueprint("config", __name__)


@config_bp.get("/estado")
def get_estado():
    """Público — el cliente lo consulta para saber si puede ordenar."""
    pausado = Configuracion.get("pedidos_pausados", "false") == "true"
    return jsonify({"pedidos_pausados": pausado})


@config_bp.post("/pedidos-pausados")
@require_role("admin")
def set_pedidos_pausados():
    """Solo admin."""
    data = request.get_json() or {}
    pausado = bool(data.get("pausado", False))
    Configuracion.set("pedidos_pausados", "true" if pausado else "false")
    return jsonify({"pedidos_pausados": pausado})
