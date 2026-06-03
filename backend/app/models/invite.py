import secrets
from datetime import datetime, timezone
from app import db


class InviteToken(db.Model):
    __tablename__ = "invite_tokens"

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    creado_por_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    usado = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    creado_por = db.relationship("User", foreign_keys=[creado_por_id])

    def to_dict(self):
        return {
            "id": self.id,
            "token": self.token,
            "usado": self.usado,
            "created_at": self.created_at.isoformat(),
        }
