import math
from flask import Blueprint, jsonify, request
from app.models.configuracion import Configuracion
from app.utils.helpers import require_role

RESTAURANTE_LAT = 20.6832166
RESTAURANTE_LNG = -103.3720445
RADIO_DEFAULT_KM = 2.0


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

config_bp = Blueprint("config", __name__)


@config_bp.get("/estado")
def get_estado():
    """Público — el cliente lo consulta para saber si puede ordenar."""
    pausado = Configuracion.get("pedidos_pausados", "false") == "true"
    return jsonify({"pedidos_pausados": pausado})


@config_bp.post("/pedidos-pausados")
@require_role("admin")
def set_pedidos_pausados():
    data = request.get_json() or {}
    pausado = bool(data.get("pausado", False))
    Configuracion.set("pedidos_pausados", "true" if pausado else "false")
    return jsonify({"pedidos_pausados": pausado})


@config_bp.get("/radio-entrega")
def get_radio():
    radio = float(Configuracion.get("radio_entrega_km", RADIO_DEFAULT_KM))
    return jsonify({"radio_km": radio, "restaurante_lat": RESTAURANTE_LAT, "restaurante_lng": RESTAURANTE_LNG})


@config_bp.post("/radio-entrega")
@require_role("admin")
def set_radio():
    data = request.get_json() or {}
    radio = float(data.get("radio_km", RADIO_DEFAULT_KM))
    Configuracion.set("radio_entrega_km", str(radio))
    return jsonify({"radio_km": radio})


@config_bp.post("/validar-zona")
def validar_zona():
    data = request.get_json() or {}
    lat = data.get("lat")
    lng = data.get("lng")
    if lat is None or lng is None:
        return jsonify({"error": "Faltan coordenadas"}), 400
    radio = float(Configuracion.get("radio_entrega_km", RADIO_DEFAULT_KM))
    distancia = haversine(RESTAURANTE_LAT, RESTAURANTE_LNG, float(lat), float(lng))
    dentro = distancia <= radio
    return jsonify({"dentro": dentro, "distancia_km": round(distancia, 2), "radio_km": radio})
