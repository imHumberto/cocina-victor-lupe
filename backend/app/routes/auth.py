from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app import db
from app.models.user import User
from app.models.invite import InviteToken
from app.models.direccion import DireccionCliente

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/registro/<invite_token>")
def registro(invite_token):
    """Registro de cliente solo por invite link de un solo uso."""
    invite = InviteToken.query.filter_by(token=invite_token, usado=False).first()
    if not invite:
        return jsonify({"error": "Este link de invitación no es válido o ya fue usado"}), 404

    data = request.get_json()
    required = ["nombre", "telefono_whatsapp", "password", "direccion_entrega"]
    if not all(data.get(f) for f in required):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    if User.query.filter_by(telefono_whatsapp=data["telefono_whatsapp"]).first():
        return jsonify({"error": "Ya existe una cuenta con ese número"}), 409

    user = User(
        nombre=data["nombre"],
        telefono_whatsapp=data["telefono_whatsapp"],
        password_hash=generate_password_hash(data["password"]),
        direccion_entrega=data["direccion_entrega"],
        empresa=data.get("empresa"),
        tipo_vivienda=data.get("tipo_vivienda"),
        referencias_entrega=data.get("referencias_entrega"),
        rol="cliente",
    )
    db.session.add(user)
    invite.usado = True
    db.session.flush()  # genera user.id

    # Guardar dirección principal
    if data.get("direccion_entrega"):
        alias = data.get("empresa") or data.get("tipo_vivienda") or "Mi dirección"
        direccion = DireccionCliente(
            user_id=user.id,
            alias=alias.capitalize(),
            tipo_vivienda=data.get("tipo_vivienda"),
            direccion=data["direccion_entrega"],
            referencias=data.get("referencias_entrega"),
            es_principal=True,
        )
        db.session.add(direccion)

    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json()
    user = User.query.filter_by(telefono_whatsapp=data.get("telefono_whatsapp")).first()

    if not user or not check_password_hash(user.password_hash, data.get("password", "")):
        return jsonify({"error": "Credenciales incorrectas"}), 401

    if not user.activo:
        return jsonify({"error": "Cuenta desactivada"}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(user.to_dict())


@auth_bp.patch("/perfil")
@jwt_required()
def actualizar_perfil():
    user = User.query.get(int(get_jwt_identity()))
    data = request.get_json()

    if "telefono_whatsapp" in data:
        nuevo_tel = data["telefono_whatsapp"].strip()
        if nuevo_tel != user.telefono_whatsapp:
            if User.query.filter_by(telefono_whatsapp=nuevo_tel).first():
                return jsonify({"error": "Ese número ya está registrado"}), 409
            user.telefono_whatsapp = nuevo_tel

    for campo in ("nombre", "direccion_entrega", "empresa", "notif_app", "notif_whatsapp"):
        if campo in data:
            setattr(user, campo, data[campo])

    if "password" in data and data["password"]:
        user.password_hash = generate_password_hash(data["password"])

    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.delete("/cuenta")
@jwt_required()
def eliminar_cuenta():
    from werkzeug.security import check_password_hash
    user = User.query.get(int(get_jwt_identity()))
    data = request.get_json() or {}
    if not check_password_hash(user.password_hash, data.get("password", "")):
        return jsonify({"error": "Contraseña incorrecta"}), 403
    user.activo = False
    db.session.commit()
    return jsonify({"ok": True})
