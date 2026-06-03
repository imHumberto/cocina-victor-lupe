from datetime import datetime, timezone
from app import db

# Tablas de asociación para campos multi-selección
dia_platos_fuertes = db.Table(
    "dia_platos_fuertes",
    db.Column("dia_menu_id", db.Integer, db.ForeignKey("dias_menu.id", ondelete="CASCADE"), primary_key=True),
    db.Column("platillo_id", db.Integer, db.ForeignKey("platillos.id", ondelete="CASCADE"), primary_key=True),
)


dia_guarniciones = db.Table(
    "dia_guarniciones",
    db.Column("dia_menu_id", db.Integer, db.ForeignKey("dias_menu.id", ondelete="CASCADE"), primary_key=True),
    db.Column("platillo_id", db.Integer, db.ForeignKey("platillos.id", ondelete="CASCADE"), primary_key=True),
)


class MenuSemanal(db.Model):
    __tablename__ = "menus_semanales"

    id = db.Column(db.Integer, primary_key=True)
    fecha_inicio = db.Column(db.Date, nullable=False, unique=True)
    publicado = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    dias = db.relationship("DiaMenu", backref="menu_semanal", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_dias=False):
        data = {
            "id": self.id,
            "fecha_inicio": self.fecha_inicio.isoformat(),
            "publicado": self.publicado,
        }
        if include_dias:
            data["dias"] = [d.to_dict() for d in self.dias.order_by(DiaMenu.dia)]
        return data


class DiaMenu(db.Model):
    __tablename__ = "dias_menu"

    id = db.Column(db.Integer, primary_key=True)
    dia = db.Column(db.Integer, nullable=False)  # 0=lunes … 4=viernes
    menu_semanal_id = db.Column(db.Integer, db.ForeignKey("menus_semanales.id"), nullable=False)
    activo = db.Column(db.Boolean, default=True, nullable=False)

    # Campos simples (un solo platillo)
    entrada_id = db.Column(db.Integer, db.ForeignKey("platillos.id"))
    postre_id = db.Column(db.Integer, db.ForeignKey("platillos.id"))
    bebida_id = db.Column(db.Integer, db.ForeignKey("platillos.id"))
    alternativa_bebida_costo_extra = db.Column(db.Numeric(8, 2), default=0)
    alternativa_plato_costo_extra = db.Column(db.Numeric(8, 2), default=0)
    alternativa_plato_disponible = db.Column(db.Boolean, default=True, nullable=False)
    alternativa_bebida_disponible = db.Column(db.Boolean, default=True, nullable=False)

    entrada = db.relationship("Platillo", foreign_keys=[entrada_id])
    postre = db.relationship("Platillo", foreign_keys=[postre_id])
    bebida = db.relationship("Platillo", foreign_keys=[bebida_id])

    # Campos multi-selección
    platos_fuertes = db.relationship("Platillo", secondary=dia_platos_fuertes, lazy="subquery")
    guarniciones = db.relationship("Platillo", secondary=dia_guarniciones, lazy="subquery")

    pedidos = db.relationship("Pedido", backref="dia_menu", lazy="dynamic")

    __table_args__ = (db.UniqueConstraint("menu_semanal_id", "dia", name="uq_menu_dia"),)

    DIAS_NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

    def to_dict(self):
        from app.models.platillo import Platillo
        alt_platos  = Platillo.query.filter_by(tipo="plato_fuerte", es_alternativa=True, activo=True).all() if self.alternativa_plato_disponible else []
        alt_bebidas = Platillo.query.filter_by(tipo="bebida",        es_alternativa=True, activo=True).all() if self.alternativa_bebida_disponible else []
        return {
            "id": self.id,
            "dia": self.dia,
            "activo": self.activo,
            "dia_nombre": self.DIAS_NOMBRES[self.dia] if 0 <= self.dia <= 4 else "",
            "menu_semanal_id": self.menu_semanal_id,
            "entrada": self.entrada.to_dict() if self.entrada else None,
            "platos_fuertes": [p.to_dict() for p in self.platos_fuertes],
            "alternativa_plato_disponible": self.alternativa_plato_disponible,
            "alternativa_plato_costo_extra": float(self.alternativa_plato_costo_extra or 0),
            "alternativas_plato": [p.to_dict() for p in alt_platos],
            "guarniciones": [p.to_dict() for p in self.guarniciones],
            "postre": self.postre.to_dict() if self.postre else None,
            "bebida": self.bebida.to_dict() if self.bebida else None,
            "alternativa_bebida_disponible": self.alternativa_bebida_disponible,
            "alternativa_bebida_costo_extra": float(self.alternativa_bebida_costo_extra or 0),
            "alternativas_bebida": [p.to_dict() for p in alt_bebidas],
        }
