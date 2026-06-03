from app import db


class Platillo(db.Model):
    __tablename__ = "platillos"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    tipo = db.Column(
        db.Enum("entrada", "plato_fuerte", "guarnicion", "postre", "bebida", name="tipo_platillo_enum"),
        nullable=False,
    )
    descripcion = db.Column(db.Text)
    foto_url = db.Column(db.String(512))
    activo = db.Column(db.Boolean, default=True, nullable=False)
    es_alternativa = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "tipo": self.tipo,
            "descripcion": self.descripcion,
            "foto_url": self.foto_url,
            "activo": self.activo,
            "es_alternativa": self.es_alternativa,
        }
