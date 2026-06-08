from datetime import date, datetime, time, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db, socketio
from app.models.direccion import DireccionCliente
from app.models.pedido import Pedido
from app.models.menu import DiaMenu, MenuSemanal
from app.utils.helpers import puede_ordenar_hoy, puede_cancelar_hoy

pedidos_bp = Blueprint("pedidos", __name__)


@pedidos_bp.post("/")
@jwt_required()
def crear_pedido():
    if not puede_ordenar_hoy():
        return jsonify({"error": "Ya no se pueden hacer pedidos hoy (límite 3:40 PM)"}), 400

    user_id = int(get_jwt_identity())
    data = request.get_json()

    hoy = date.today()
    dia_semana = hoy.weekday()
    if dia_semana > 4:
        return jsonify({"error": "Hoy no hay servicio (fin de semana)"}), 400

    menu = (
        MenuSemanal.query
        .filter(MenuSemanal.publicado == True, MenuSemanal.fecha_inicio <= hoy)
        .order_by(MenuSemanal.fecha_inicio.desc())
        .first()
    )
    if not menu:
        return jsonify({"error": "No hay menú publicado"}), 400

    dia_menu = DiaMenu.query.filter_by(menu_semanal_id=menu.id, dia=dia_semana).first()
    if not dia_menu:
        return jsonify({"error": "No hay menú para hoy"}), 400

    # TODO: descomentar para producción
    # pedido_existente = Pedido.query.filter_by(
    #     cliente_id=user_id, dia_menu_id=dia_menu.id
    # ).filter(Pedido.estado != "cancelado").first()
    # if pedido_existente:
    #     return jsonify({"error": "Ya tienes un pedido para hoy"}), 409

    hora_str = data.get("hora_entrega", "13:00")
    try:
        h, m = hora_str.split(":")
        hora_entrega = time(int(h), int(m))
    except (ValueError, AttributeError):
        return jsonify({"error": "Formato de hora inválido (HH:MM)"}), 400

    hora_min = time(13, 0)
    hora_max = time(17, 0)
    if not (hora_min <= hora_entrega <= hora_max):
        return jsonify({"error": "La hora de entrega debe ser entre 1:00 PM y 5:00 PM"}), 400

    direccion_id = data.get("direccion_id")
    if direccion_id:
        from app.models.direccion import DireccionCliente
        dir_obj = DireccionCliente.query.filter_by(id=direccion_id, user_id=user_id).first()
        if not dir_obj:
            direccion_id = None

    pedido = Pedido(
        cliente_id=user_id,
        dia_menu_id=dia_menu.id,
        hora_entrega=hora_entrega,
        plato_elegido=data.get("plato_elegido", "principal"),
        bebida_elegida=data.get("bebida_elegida", "principal"),
        metodo_pago=data["metodo_pago"],
        comprobante_url=data.get("comprobante_url") or None,
        notas=data.get("notas"),
        direccion_id=direccion_id,
        entrega_direccion=data.get("entrega_direccion") or None,
        entrega_referencias=data.get("entrega_referencias") or None,
        receptor_nombre=data.get("receptor_nombre"),
        receptor_telefono=data.get("receptor_telefono"),
    )
    db.session.add(pedido)
    db.session.commit()

    socketio.emit("pedido_nuevo", pedido.to_dict(include_cliente=True), room="admin")

    return jsonify(pedido.to_dict()), 201


@pedidos_bp.get("/mis-pedidos")
@jwt_required()
def mis_pedidos():
    user_id = int(get_jwt_identity())
    pedidos = (
        Pedido.query
        .filter_by(cliente_id=user_id)
        .order_by(Pedido.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify([p.to_dict() for p in pedidos])


@pedidos_bp.delete("/<int:pedido_id>")
@jwt_required()
def cancelar_pedido(pedido_id):
    if not puede_cancelar_hoy():
        return jsonify({"error": "El tiempo para cancelar ya pasó (límite 9:00 AM)"}), 400

    user_id = int(get_jwt_identity())
    pedido = Pedido.query.filter_by(id=pedido_id, cliente_id=user_id).first_or_404()

    if pedido.estado not in ("pendiente",):
        return jsonify({"error": "No se puede cancelar un pedido en ese estado"}), 400

    pedido.estado = "cancelado"
    db.session.commit()
    return jsonify(pedido.to_dict())


# ── Direcciones guardadas ──────────────────────────────────────────────────────

@pedidos_bp.get("/mis-direcciones")
@jwt_required()
def mis_direcciones():
    from app.models.user import User
    user_id = int(get_jwt_identity())
    dirs = DireccionCliente.query.filter_by(user_id=user_id).order_by(DireccionCliente.es_principal.desc()).all()

    # Si no hay direcciones guardadas, migrar la del perfil automáticamente
    if not dirs:
        user = User.query.get(user_id)
        if user and user.direccion_entrega:
            alias = user.empresa or (user.tipo_vivienda.capitalize() if user.tipo_vivienda else "Mi dirección")
            d = DireccionCliente(
                user_id=user_id,
                alias=alias,
                tipo_vivienda=user.tipo_vivienda,
                direccion=user.direccion_entrega,
                referencias=user.referencias_entrega,
                es_principal=True,
            )
            db.session.add(d)
            db.session.commit()
            dirs = [d]

    return jsonify([d.to_dict() for d in dirs])


@pedidos_bp.post("/mis-direcciones")
@jwt_required()
def agregar_direccion():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    es_primera = DireccionCliente.query.filter_by(user_id=user_id).count() == 0
    d = DireccionCliente(
        user_id=user_id,
        alias=data.get("alias", "Mi dirección"),
        tipo_vivienda=data.get("tipo_vivienda"),
        direccion=data["direccion"],
        referencias=data.get("referencias"),
        es_principal=es_primera,
    )
    db.session.add(d)
    db.session.commit()
    return jsonify(d.to_dict()), 201


@pedidos_bp.delete("/mis-direcciones/<int:dir_id>")
@jwt_required()
def eliminar_direccion(dir_id):
    user_id = int(get_jwt_identity())
    d = DireccionCliente.query.filter_by(id=dir_id, user_id=user_id).first_or_404()
    era_principal = d.es_principal
    db.session.delete(d)
    db.session.commit()
    # Si era la principal, asignar la siguiente como principal
    if era_principal:
        siguiente = DireccionCliente.query.filter_by(user_id=user_id).first()
        if siguiente:
            siguiente.es_principal = True
            db.session.commit()
    return jsonify({"ok": True})
