from datetime import datetime, timezone
from app import db


class Pedido(db.Model):
    __tablename__ = "pedidos"

    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    dia_menu_id = db.Column(db.Integer, db.ForeignKey("dias_menu.id"), nullable=False)

    hora_entrega = db.Column(db.Time, nullable=False)
    # "principal" | "alternativa"
    plato_elegido = db.Column(db.String(20), nullable=False, default="principal")
    # "principal" | "alternativa"
    bebida_elegida = db.Column(db.String(20), nullable=False, default="principal")

    estado = db.Column(
        db.Enum("pendiente", "confirmado", "rechazado", "en_preparacion", "listo", "en_camino", "entregado", "cancelado", name="estado_pedido_enum"),
        nullable=False,
        default="pendiente",
    )
    motivo_rechazo = db.Column(db.Text)
    metodo_pago = db.Column(
        db.Enum("transferencia", "efectivo", "tarjeta", name="metodo_pago_enum"),
        nullable=False,
    )
    comprobante_url = db.Column(db.String(512))
    direccion_id = db.Column(db.Integer, db.ForeignKey("direcciones_cliente.id", ondelete="SET NULL"), nullable=True)
    entrega_direccion = db.Column(db.Text)       # dirección libre (uso único, no guardada en perfil)
    entrega_referencias = db.Column(db.Text)
    receptor_nombre = db.Column(db.String(120))
    receptor_telefono = db.Column(db.String(20))
    repartidor_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    tomado_en = db.Column(db.DateTime(timezone=True))
    notas = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self, include_cliente=False, include_repartidor=False):
        from app.models.direccion import DireccionCliente
        direccion = DireccionCliente.query.get(self.direccion_id) if self.direccion_id else None
        data = {
            "id": self.id,
            "cliente_id": self.cliente_id,
            "dia_menu_id": self.dia_menu_id,
            "hora_entrega": self.hora_entrega.strftime("%H:%M") if self.hora_entrega else None,
            "plato_elegido": self.plato_elegido,
            "bebida_elegida": self.bebida_elegida,
            "estado": self.estado,
            "metodo_pago": self.metodo_pago,
            "comprobante_url": self.comprobante_url,
            "repartidor_id": self.repartidor_id,
            "tomado_en": self.tomado_en.isoformat() if self.tomado_en else None,
            "notas": self.notas,
            "motivo_rechazo": self.motivo_rechazo,
            "receptor_nombre": self.receptor_nombre,
            "receptor_telefono": self.receptor_telefono,
            "direccion": direccion.to_dict() if direccion else None,
            "entrega_direccion": self.entrega_direccion,
            "entrega_referencias": self.entrega_referencias,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_cliente and self.cliente:
            data["cliente"] = self.cliente.to_dict()
        if include_repartidor and self.repartidor:
            data["repartidor"] = self.repartidor.to_dict()
        return data
