from datetime import date, timedelta
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models.menu import MenuSemanal, DiaMenu

menu_bp = Blueprint("menu", __name__)


@menu_bp.get("/actual")
@jwt_required()
def menu_actual():
    """Menú semanal activo (publicado) para la semana en curso o la próxima."""
    hoy = date.today()
    lunes = hoy - timedelta(days=hoy.weekday())

    menu = (
        MenuSemanal.query
        .filter(MenuSemanal.publicado == True, MenuSemanal.fecha_inicio <= hoy)
        .order_by(MenuSemanal.fecha_inicio.desc())
        .first()
    )
    if not menu:
        return jsonify({"error": "No hay menú publicado"}), 404

    return jsonify(menu.to_dict(include_dias=True))


@menu_bp.get("/<int:menu_id>")
@jwt_required()
def detalle_menu(menu_id):
    menu = MenuSemanal.query.get_or_404(menu_id)
    return jsonify(menu.to_dict(include_dias=True))


@menu_bp.get("/dia-hoy")
@jwt_required()
def dia_hoy():
    """DiaMenu correspondiente a hoy si hay menú publicado."""
    hoy = date.today()
    dia_semana = hoy.weekday()  # 0=lunes … 4=viernes

    if dia_semana > 4:
        return jsonify({"error": "Hoy no hay menú (fin de semana)"}), 404

    menu = (
        MenuSemanal.query
        .filter(MenuSemanal.publicado == True, MenuSemanal.fecha_inicio <= hoy)
        .order_by(MenuSemanal.fecha_inicio.desc())
        .first()
    )
    if not menu:
        return jsonify({"error": "No hay menú publicado"}), 404

    dia = DiaMenu.query.filter_by(menu_semanal_id=menu.id, dia=dia_semana).first()
    if not dia:
        return jsonify({"error": "No hay menú para hoy"}), 404

    return jsonify(dia.to_dict())
