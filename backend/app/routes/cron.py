import os
from datetime import date
from flask import Blueprint, request, jsonify

from app.models.user import User
from app.models.menu import MenuSemanal, DiaMenu
from app.services.notificaciones import crear_notificacion
from app.services.whatsapp import enviar_mensaje_whatsapp

cron_bp = Blueprint("cron", __name__)

CRON_SECRET = os.environ.get("CRON_SECRET", "")


@cron_bp.post("/notificar-platillo")
def notificar_platillo_dia():
    # Verificar token secreto
    token = request.headers.get("X-Cron-Secret", "") or request.args.get("secret", "")
    if not CRON_SECRET or token != CRON_SECRET:
        return jsonify({"error": "No autorizado"}), 401

    hoy = date.today()
    dia_semana = hoy.weekday()  # 0=Lun … 4=Vie, 5=Sáb, 6=Dom

    # Solo lunes a viernes
    if dia_semana > 4:
        return jsonify({"ok": True, "msg": "Fin de semana, no se envían notificaciones"})

    # Buscar menú publicado vigente
    menu = (
        MenuSemanal.query
        .filter(MenuSemanal.publicado == True, MenuSemanal.fecha_inicio <= hoy)
        .order_by(MenuSemanal.fecha_inicio.desc())
        .first()
    )
    if not menu:
        return jsonify({"ok": True, "msg": "Sin menú publicado"})

    dia_menu = DiaMenu.query.filter_by(menu_semanal_id=menu.id, dia=dia_semana, activo=True).first()
    if not dia_menu or not dia_menu.platos_fuertes:
        return jsonify({"ok": True, "msg": "Sin platillo para hoy"})

    # Construir mensaje
    platos = " / ".join(p.nombre for p in dia_menu.platos_fuertes)
    mensaje = f"🍽️ El menú de hoy: {platos}. ¡Haz tu pedido antes de las 3:40 PM!"

    clientes = User.query.filter_by(rol="cliente", activo=True).all()
    enviados = 0
    for user in clientes:
        if user.notif_app:
            crear_notificacion(user.id, mensaje)
            enviados += 1
        if user.notif_whatsapp and user.telefono_whatsapp:
            enviar_mensaje_whatsapp(user.telefono_whatsapp, mensaje)

    return jsonify({"ok": True, "msg": f"Notificados {enviados} clientes", "platillo": platos})
