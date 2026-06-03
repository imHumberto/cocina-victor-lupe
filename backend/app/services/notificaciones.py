from datetime import datetime, timezone

from app import db, socketio
from app.models.notificacion import Notificacion
from app.models.user import User
from app.services.whatsapp import enviar_mensaje_whatsapp


def crear_notificacion(user_id: int, mensaje: str) -> Notificacion:
    notif = Notificacion(user_id=user_id, mensaje=mensaje)
    db.session.add(notif)
    db.session.commit()

    socketio.emit("nueva_notificacion", notif.to_dict(), room=f"user_{user_id}")

    return notif


def notificar_menu_publicado(users):
    mensaje = "Ya está disponible el menú de esta semana 🍽️"
    for user in users:
        if user.notif_app:
            crear_notificacion(user.id, mensaje)
        if user.notif_whatsapp and user.telefono_whatsapp:
            enviar_mensaje_whatsapp(user.telefono_whatsapp, mensaje)


def notificar_pedido_en_camino(pedido):
    mensaje = "Ya va en camino tu pedido 🛵"
    user = pedido.cliente
    if user.notif_app:
        crear_notificacion(user.id, mensaje)
    if user.notif_whatsapp and user.telefono_whatsapp:
        enviar_mensaje_whatsapp(user.telefono_whatsapp, mensaje)


def notificar_pedido_entregado(pedido):
    mensaje = "¡Buen provecho! 🙌"
    user = pedido.cliente
    if user.notif_app:
        crear_notificacion(user.id, mensaje)
    if user.notif_whatsapp and user.telefono_whatsapp:
        enviar_mensaje_whatsapp(user.telefono_whatsapp, mensaje)
