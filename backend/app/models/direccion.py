from app import db


class DireccionCliente(db.Model):
    __tablename__ = "direcciones_cliente"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alias = db.Column(db.String(120))          # "Casa", "Oficina", nombre empresa
    tipo_vivienda = db.Column(db.String(30))   # casa, departamento, oficina, empresa, otro
    direccion = db.Column(db.Text, nullable=False)
    referencias = db.Column(db.Text)
    es_principal = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "alias": self.alias,
            "tipo_vivienda": self.tipo_vivienda,
            "direccion": self.direccion,
            "referencias": self.referencias,
            "es_principal": self.es_principal,
        }
