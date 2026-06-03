from datetime import date, datetime, timezone, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db, socketio
from app.models.pedido import Pedido
from app.models.menu import DiaMenu, MenuSemanal
from app.services.notificaciones import notificar_pedido_en_camino, notificar_pedido_entregado
from app.utils.helpers import require_role

repartidor_bp = Blueprint("repartidor", __name__)


@repartidor_bp.get("/pedidos-hoy")
@jwt_required()
@require_role("repartidor", "admin")
def pedidos_hoy():
    hoy = date.today()
    dia_semana = hoy.weekday()

    menu = (
        MenuSemanal.query
        .filter(MenuSemanal.publicado == True, MenuSemanal.fecha_inicio <= hoy)
        .order_by(MenuSemanal.fecha_inicio.desc())
        .first()
    )
    if not menu:
        return jsonify([])

    dia_menu = DiaMenu.query.filter_by(menu_semanal_id=menu.id, dia=dia_semana).first()
    if not dia_menu:
        return jsonify([])

    repartidor_id = int(get_jwt_identity())
    pedidos = (
        Pedido.query
        .filter(
            Pedido.dia_menu_id == dia_menu.id,
            Pedido.estado.in_(["listo", "en_camino"]),
            db.or_(
                Pedido.repartidor_id == None,
                Pedido.repartidor_id == repartidor_id,
            )
        )
        .order_by(Pedido.hora_entrega)
        .all()
    )
    return jsonify([p.to_dict(include_cliente=True) for p in pedidos])


@repartidor_bp.get("/proximos")
@jwt_required()
@require_role("repartidor", "admin")
def proximos():
    hoy = date.today()
    dia_semana = hoy.weekday()
    menu = (
        MenuSemanal.query
        .filter(MenuSemanal.publicado == True, MenuSemanal.fecha_inicio <= hoy)
        .order_by(MenuSemanal.fecha_inicio.desc())
        .first()
    )
    if not menu:
        return jsonify({"count": 0})
    dia_menu = DiaMenu.query.filter_by(menu_semanal_id=menu.id, dia=dia_semana).first()
    if not dia_menu:
        return jsonify({"count": 0})
    count = Pedido.query.filter(
        Pedido.dia_menu_id == dia_menu.id,
        Pedido.estado.in_(["confirmado", "en_preparacion"]),
    ).count()
    return jsonify({"count": count})


@repartidor_bp.get("/historial")
@jwt_required()
@require_role("repartidor", "admin")
def historial():
    repartidor_id = int(get_jwt_identity())
    desde = date.today() - timedelta(days=30)
    pedidos = (
        Pedido.query
        .filter(
            Pedido.repartidor_id == repartidor_id,
            Pedido.estado.in_(["entregado", "rechazado"]),
            Pedido.created_at >= datetime(desde.year, desde.month, desde.day, tzinfo=timezone.utc),
        )
        .order_by(Pedido.created_at.desc())
        .all()
    )
    return jsonify([p.to_dict(include_cliente=True) for p in pedidos])


@repartidor_bp.get("/stats")
@jwt_required()
@require_role("repartidor", "admin")
def stats():
    repartidor_id = int(get_jwt_identity())
    hoy = date.today()
    inicio_mes = datetime(hoy.year, hoy.month, 1, tzinfo=timezone.utc)
    count = Pedido.query.filter(
        Pedido.repartidor_id == repartidor_id,
        Pedido.estado == "entregado",
        Pedido.created_at >= inicio_mes,
    ).count()
    return jsonify({"entregados_mes": count, "mes": hoy.strftime("%B %Y")})


@repartidor_bp.patch("/<int:pedido_id>/tomar")
@jwt_required()
@require_role("repartidor", "admin")
def tomar_pedido(pedido_id):
    repartidor_id = int(get_jwt_identity())
    pedido = Pedido.query.get_or_404(pedido_id)

    if pedido.estado != "listo":
        return jsonify({"error": "El pedido aún no está listo para entregar"}), 400
    if pedido.repartidor_id:
        return jsonify({"error": "Este pedido ya fue tomado por otro repartidor"}), 400

    pedido.repartidor_id = repartidor_id
    pedido.estado = "en_camino"
    pedido.tomado_en = datetime.now(timezone.utc)
    db.session.commit()

    notificar_pedido_en_camino(pedido)
    socketio.emit("pedido_actualizado", pedido.to_dict(include_cliente=True), room="admin")
    return jsonify(pedido.to_dict())


@repartidor_bp.patch("/<int:pedido_id>/entregar")
@jwt_required()
@require_role("repartidor", "admin")
def entregar_pedido(pedido_id):
    pedido = Pedido.query.get_or_404(pedido_id)

    if pedido.estado != "en_camino":
        return jsonify({"error": "El pedido no está en camino"}), 400

    data = request.get_json() or {}
    pedido.estado = "entregado"
    if "metodo_pago" in data:
        pedido.metodo_pago = data["metodo_pago"]
    db.session.commit()

    notificar_pedido_entregado(pedido)
    socketio.emit("pedido_actualizado", pedido.to_dict(include_cliente=True), room="admin")
    return jsonify(pedido.to_dict())
