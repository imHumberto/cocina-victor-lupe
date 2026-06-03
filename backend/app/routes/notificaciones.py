from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.notificacion import Notificacion

notif_bp = Blueprint("notificaciones", __name__)


@notif_bp.get("/")
@jwt_required()
def listar():
    user_id = int(get_jwt_identity())
    notifs = (
        Notificacion.query
        .filter_by(user_id=user_id)
        .order_by(Notificacion.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify([n.to_dict() for n in notifs])


@notif_bp.get("/no-leidas")
@jwt_required()
def count_no_leidas():
    user_id = int(get_jwt_identity())
    count = Notificacion.query.filter_by(user_id=user_id, leido=False).count()
    return jsonify({"count": count})


@notif_bp.patch("/<int:notif_id>/leer")
@jwt_required()
def marcar_leida(notif_id):
    user_id = int(get_jwt_identity())
    n = Notificacion.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
    n.leido = True
    db.session.commit()
    return jsonify(n.to_dict())


@notif_bp.post("/leer-todas")
@jwt_required()
def leer_todas():
    user_id = int(get_jwt_identity())
    Notificacion.query.filter_by(user_id=user_id, leido=False).update({"leido": True})
    db.session.commit()
    return jsonify({"ok": True})
