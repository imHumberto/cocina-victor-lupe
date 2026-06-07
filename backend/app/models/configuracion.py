from app import db


class Configuracion(db.Model):
    __tablename__ = "configuracion"

    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(64), unique=True, nullable=False)
    valor = db.Column(db.String(256), nullable=False)

    @classmethod
    def get(cls, clave, default=None):
        row = cls.query.filter_by(clave=clave).first()
        return row.valor if row else default

    @classmethod
    def set(cls, clave, valor):
        row = cls.query.filter_by(clave=clave).first()
        if row:
            row.valor = str(valor)
        else:
            row = cls(clave=clave, valor=str(valor))
            db.session.add(row)
        db.session.commit()
