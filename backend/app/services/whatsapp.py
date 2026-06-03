import requests
from flask import current_app


def enviar_mensaje_whatsapp(telefono: str, mensaje: str) -> bool:
    """Envía un mensaje de texto simple via Meta Cloud API."""
    token = current_app.config["META_API_TOKEN"]
    phone_id = current_app.config["META_PHONE_NUMBER_ID"]
    url = f"{current_app.config['META_WHATSAPP_API_URL']}/{phone_id}/messages"

    if not token or not phone_id:
        current_app.logger.warning("META_API_TOKEN o META_PHONE_NUMBER_ID no configurados")
        return False

    numero = telefono.replace("+", "").replace(" ", "").replace("-", "")

    payload = {
        "messaging_product": "whatsapp",
        "to": numero,
        "type": "text",
        "text": {"body": mensaje},
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        return True
    except requests.RequestException as e:
        current_app.logger.error(f"Error enviando WhatsApp a {telefono}: {e}")
        return False
