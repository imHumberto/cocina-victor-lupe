from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from werkzeug.security import generate_password_hash

from app import db, socketio
from app.models.user import User
from app.models.platillo import Platillo
from app.models.menu import MenuSemanal, DiaMenu
from app.models.pedido import Pedido
from app.models.invite import InviteToken
from app.services.notificaciones import notificar_menu_publicado, crear_notificacion
from app.utils.helpers import require_role

admin_bp = Blueprint("admin", __name__)


# ── Platillos ──────────────────────────────────────────────────────────────────

@admin_bp.get("/platillos")
@jwt_required()
@require_role("admin")
def listar_platillos():
    platillos = Platillo.query.order_by(Platillo.tipo, Platillo.nombre).all()
    return jsonify([p.to_dict() for p in platillos])


@admin_bp.post("/platillos")
@jwt_required()
@require_role("admin")
def crear_platillo():
    data = request.get_json()
    nombre = data["nombre"].strip()
    duplicado = Platillo.query.filter(db.func.lower(Platillo.nombre) == nombre.lower()).first()
    if duplicado:
        return jsonify({"error": f'Ya existe un platillo llamado "{duplicado.nombre}"'}), 409
    p = Platillo(nombre=nombre, tipo=data["tipo"], descripcion=data.get("descripcion"), foto_url=data.get("foto_url"), activo=data.get("activo", True), es_alternativa=data.get("es_alternativa", False))
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@admin_bp.patch("/platillos/<int:platillo_id>")
@jwt_required()
@require_role("admin")
def editar_platillo(platillo_id):
    p = Platillo.query.get_or_404(platillo_id)
    data = request.get_json()
    if "nombre" in data:
        nombre = data["nombre"].strip()
        duplicado = Platillo.query.filter(db.func.lower(Platillo.nombre) == nombre.lower(), Platillo.id != platillo_id).first()
        if duplicado:
            return jsonify({"error": f'Ya existe un platillo llamado "{duplicado.nombre}"'}), 409
        p.nombre = nombre
    for campo in ("tipo", "descripcion", "foto_url", "activo", "es_alternativa"):
        if campo in data:
            setattr(p, campo, data[campo])
    db.session.commit()
    return jsonify(p.to_dict())


@admin_bp.delete("/platillos/<int:platillo_id>")
@jwt_required()
@require_role("admin")
def eliminar_platillo(platillo_id):
    p = Platillo.query.get_or_404(platillo_id)
    from app.models.menu import dia_platos_fuertes, dia_guarniciones
    en_uso_simple = DiaMenu.query.filter(
        db.or_(
            DiaMenu.entrada_id == platillo_id,
            DiaMenu.postre_id == platillo_id,
            DiaMenu.bebida_id == platillo_id,
        )
    ).first()
    en_uso_multi = db.session.execute(
        db.select(dia_platos_fuertes.c.dia_menu_id).where(dia_platos_fuertes.c.platillo_id == platillo_id).limit(1)
    ).first() or db.session.execute(
        db.select(dia_guarniciones.c.dia_menu_id).where(dia_guarniciones.c.platillo_id == platillo_id).limit(1)
    ).first()
    if en_uso_simple or en_uso_multi:
        return jsonify({"error": f'"{p.nombre}" está en uso en un menú. Desactívalo en lugar de eliminarlo.'}), 409
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


# ── Menú semanal ───────────────────────────────────────────────────────────────

@admin_bp.get("/menus")
@jwt_required()
@require_role("admin")
def listar_menus():
    menus = MenuSemanal.query.order_by(MenuSemanal.fecha_inicio.desc()).all()
    return jsonify([m.to_dict() for m in menus])


@admin_bp.post("/menus")
@jwt_required()
@require_role("admin")
def crear_menu():
    data = request.get_json()
    if MenuSemanal.query.filter_by(fecha_inicio=data["fecha_inicio"]).first():
        return jsonify({"error": "Ya existe un menú para esa semana"}), 409
    menu = MenuSemanal(fecha_inicio=data["fecha_inicio"])
    db.session.add(menu)
    db.session.commit()
    return jsonify(menu.to_dict()), 201


@admin_bp.put("/menus/<int:menu_id>/dias")
@jwt_required()
@require_role("admin")
def guardar_dias_menu(menu_id):
    """Guarda o reemplaza los días del menú semanal."""
    menu = MenuSemanal.query.get_or_404(menu_id)
    if menu.publicado:
        return jsonify({"error": "No se puede editar un menú ya publicado"}), 400

    dias_data = request.get_json()
    DiaMenu.query.filter_by(menu_semanal_id=menu_id).delete()

    for d in dias_data:
        dia = DiaMenu(
            dia=d["dia"],
            activo=d.get("activo", True),
            menu_semanal_id=menu_id,
            entrada_id=d.get("entrada_id") or None,
            alternativa_plato_disponible=d.get("alternativa_plato_disponible", True),
            alternativa_plato_costo_extra=d.get("alternativa_plato_costo_extra", 0),
            alternativa_bebida_disponible=d.get("alternativa_bebida_disponible", True),
            alternativa_bebida_costo_extra=d.get("alternativa_bebida_costo_extra", 0),
            postre_id=d.get("postre_id") or None,
            bebida_id=d.get("bebida_id") or None,
        )
        db.session.add(dia)
        db.session.flush()

        from app.models.platillo import Platillo
        def ids_a_platillos(ids):
            return Platillo.query.filter(Platillo.id.in_([i for i in ids if i])).all() if ids else []

        dia.platos_fuertes = ids_a_platillos(d.get("platos_fuertes_ids", []))
        dia.guarniciones = ids_a_platillos(d.get("guarniciones_ids", []))

    db.session.commit()
    return jsonify(menu.to_dict(include_dias=True))


@admin_bp.delete("/menus/<int:menu_id>")
@jwt_required()
@require_role("admin")
def eliminar_menu(menu_id):
    menu = MenuSemanal.query.get_or_404(menu_id)
    if menu.publicado:
        return jsonify({"error": "No se puede eliminar un menú ya publicado"}), 400
    db.session.delete(menu)
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.post("/menus/<int:menu_id>/publicar")
@jwt_required()
@require_role("admin")
def publicar_menu(menu_id):
    menu = MenuSemanal.query.get_or_404(menu_id)
    menu.publicado = True
    db.session.commit()

    clientes = User.query.filter_by(rol="cliente", activo=True).all()
    notificar_menu_publicado(clientes)

    return jsonify(menu.to_dict())


# ── Pedidos del día ────────────────────────────────────────────────────────────

@admin_bp.get("/pedidos-hoy")
@jwt_required()
@require_role("admin")
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

    pedidos = (
        Pedido.query
        .filter(Pedido.dia_menu_id == dia_menu.id, Pedido.estado != "cancelado")
        .order_by(Pedido.hora_entrega, Pedido.created_at)
        .all()
    )
    return jsonify([p.to_dict(include_cliente=True, include_repartidor=True) for p in pedidos])


MENSAJES_ESTADO = {
    "en_preparacion": "👨‍🍳 Tu pedido ya está en preparación.",
    "en_camino":      "🛵 ¡Tu pedido va en camino!",
    "entregado":      "✅ ¡Tu pedido fue entregado! Buen provecho 🙌",
    "cancelado":      "❌ Tu pedido fue cancelado.",
}

@admin_bp.patch("/pedidos/<int:pedido_id>/estado")
@jwt_required()
@require_role("admin")
def cambiar_estado(pedido_id):
    pedido = Pedido.query.get_or_404(pedido_id)
    data = request.get_json()
    pedido.estado = data["estado"]
    db.session.commit()
    mensaje = MENSAJES_ESTADO.get(pedido.estado)
    if mensaje:
        crear_notificacion(pedido.cliente_id, mensaje)
    socketio.emit("pedido_actualizado", pedido.to_dict(include_cliente=True), room="admin")
    socketio.emit("pedido_actualizado", pedido.to_dict(), room=f"user_{pedido.cliente_id}")
    return jsonify(pedido.to_dict(include_cliente=True))


@admin_bp.post("/pedidos/<int:pedido_id>/confirmar")
@jwt_required()
@require_role("admin")
def confirmar_pedido(pedido_id):
    pedido = Pedido.query.get_or_404(pedido_id)
    if pedido.estado != "pendiente":
        return jsonify({"error": "Solo se pueden confirmar pedidos pendientes"}), 400
    pedido.estado = "confirmado"
    db.session.commit()
    crear_notificacion(pedido.cliente_id, "✅ Tu pedido fue confirmado, ya está en preparación.")
    socketio.emit("pedido_actualizado", pedido.to_dict(include_cliente=True), room="admin")
    socketio.emit("pedido_actualizado", pedido.to_dict(), room=f"user_{pedido.cliente_id}")
    return jsonify(pedido.to_dict(include_cliente=True))


@admin_bp.post("/pedidos/<int:pedido_id>/rechazar")
@jwt_required()
@require_role("admin")
def rechazar_pedido(pedido_id):
    pedido = Pedido.query.get_or_404(pedido_id)
    if pedido.estado not in ("pendiente", "confirmado"):
        return jsonify({"error": "No se puede rechazar este pedido"}), 400
    data = request.get_json()
    motivo = data.get("motivo", "").strip()
    pedido.estado = "rechazado"
    pedido.motivo_rechazo = motivo
    db.session.commit()
    mensaje = f"❌ Tu pedido fue rechazado. Motivo: {motivo}" if motivo else "❌ Tu pedido fue rechazado."
    crear_notificacion(pedido.cliente_id, mensaje)
    socketio.emit("pedido_actualizado", pedido.to_dict(include_cliente=True), room="admin")
    socketio.emit("pedido_actualizado", pedido.to_dict(), room=f"user_{pedido.cliente_id}")
    return jsonify(pedido.to_dict(include_cliente=True))


# ── Usuarios ───────────────────────────────────────────────────────────────────

@admin_bp.get("/usuarios")
@jwt_required()
@require_role("admin")
def listar_usuarios():
    usuarios = User.query.order_by(User.rol, User.nombre).all()
    return jsonify([u.to_dict() for u in usuarios])


@admin_bp.post("/usuarios")
@jwt_required()
@require_role("admin")
def crear_usuario():
    data = request.get_json()
    rol = data.get("rol", "cliente")
    if rol not in ("cliente", "repartidor", "admin"):
        return jsonify({"error": "Rol inválido"}), 400
    if rol == "cliente" and not data.get("direccion_entrega", "").strip():
        return jsonify({"error": "La dirección de entrega es requerida para clientes"}), 400
    if User.query.filter_by(telefono_whatsapp=data["telefono_whatsapp"]).first():
        return jsonify({"error": "Ya existe una cuenta con ese teléfono"}), 409
    u = User(
        nombre=data["nombre"],
        telefono_whatsapp=data["telefono_whatsapp"],
        password_hash=generate_password_hash(data["password"]),
        rol=rol,
        direccion_entrega=data.get("direccion_entrega"),
        empresa=data.get("empresa"),
    )
    db.session.add(u)
    db.session.commit()
    return jsonify(u.to_dict()), 201


@admin_bp.patch("/usuarios/<int:user_id>")
@jwt_required()
@require_role("admin")
def editar_usuario(user_id):
    from flask_jwt_extended import get_jwt_identity
    u = User.query.get_or_404(user_id)
    data = request.get_json()

    if "telefono_whatsapp" in data:
        existente = User.query.filter_by(telefono_whatsapp=data["telefono_whatsapp"]).first()
        if existente and existente.id != user_id:
            return jsonify({"error": "Ya existe una cuenta con ese teléfono"}), 409
        u.telefono_whatsapp = data["telefono_whatsapp"]

    for campo in ("nombre", "rol", "direccion_entrega", "empresa", "activo"):
        if campo in data:
            setattr(u, campo, data[campo])

    if data.get("password"):
        u.password_hash = generate_password_hash(data["password"])

    db.session.commit()
    return jsonify(u.to_dict())


@admin_bp.delete("/usuarios/<int:user_id>")
@jwt_required()
@require_role("admin")
def eliminar_usuario(user_id):
    from flask_jwt_extended import get_jwt_identity
    if int(get_jwt_identity()) == user_id:
        return jsonify({"error": "No puedes eliminar tu propia cuenta"}), 400
    u = User.query.get_or_404(user_id)
    db.session.delete(u)
    db.session.commit()
    return jsonify({"ok": True})


@admin_bp.get("/invite-link/<int:user_id>")
@jwt_required()
@require_role("admin")
def invite_link(user_id):
    u = User.query.get_or_404(user_id)
    return jsonify({"invite_token": u.invite_token})


# ── Invites de un solo uso ─────────────────────────────────────────────────────

@admin_bp.post("/invites")
@jwt_required()
@require_role("admin")
def generar_invite():
    from flask_jwt_extended import get_jwt_identity
    admin_id = int(get_jwt_identity())
    invite = InviteToken(creado_por_id=admin_id)
    db.session.add(invite)
    db.session.commit()
    return jsonify(invite.to_dict()), 201


@admin_bp.get("/invites")
@jwt_required()
@require_role("admin")
def listar_invites():
    invites = (
        InviteToken.query
        .filter_by(usado=False)
        .order_by(InviteToken.created_at.desc())
        .all()
    )
    return jsonify([i.to_dict() for i in invites])


@admin_bp.get("/repartidores")
@jwt_required()
@require_role("admin")
def listar_repartidores():
    reps = User.query.filter_by(rol="repartidor", activo=True).order_by(User.nombre).all()
    return jsonify([r.to_dict() for r in reps])


@admin_bp.patch("/pedidos/<int:pedido_id>/asignar-repartidor")
@jwt_required()
@require_role("admin")
def asignar_repartidor(pedido_id):
    pedido = Pedido.query.get_or_404(pedido_id)
    data = request.get_json() or {}
    pedido.repartidor_id = data.get("repartidor_id")
    db.session.commit()
    socketio.emit("pedido_actualizado", pedido.to_dict(include_cliente=True, include_repartidor=True), room="admin")
    return jsonify(pedido.to_dict(include_cliente=True, include_repartidor=True))
