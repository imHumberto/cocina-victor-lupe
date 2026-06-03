import secrets
from datetime import datetime, timezone
from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    telefono_whatsapp = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    direccion_entrega = db.Column(db.Text)
    empresa = db.Column(db.String(120))
    tipo_vivienda = db.Column(db.String(30))
    referencias_entrega = db.Column(db.Text)
    invite_token = db.Column(db.String(64), unique=True, default=lambda: secrets.token_urlsafe(32))
    rol = db.Column(db.Enum("cliente", "admin", "repartidor", name="rol_enum"), nullable=False, default="cliente")
    notif_app = db.Column(db.Boolean, default=True)
    notif_whatsapp = db.Column(db.Boolean, default=False)
    activo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    pedidos = db.relationship("Pedido", foreign_keys="Pedido.cliente_id", backref="cliente", lazy="dynamic")
    pedidos_repartidos = db.relationship("Pedido", foreign_keys="Pedido.repartidor_id", backref="repartidor", lazy="dynamic")
    notificaciones = db.relationship("Notificacion", backref="usuario", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "telefono_whatsapp": self.telefono_whatsapp,
            "direccion_entrega": self.direccion_entrega,
            "empresa": self.empresa,
            "tipo_vivienda": self.tipo_vivienda,
            "referencias_entrega": self.referencias_entrega,
            "rol": self.rol,
            "notif_app": self.notif_app,
            "notif_whatsapp": self.notif_whatsapp,
            "activo": self.activo,
        }
