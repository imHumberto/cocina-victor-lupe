"""
Crea el primer usuario admin.

Uso:
    pipenv run python seed.py
"""

import sys
import os
from getpass import getpass
from werkzeug.security import generate_password_hash

os.environ.setdefault("FLASK_ENV", "development")

from app import create_app, db
from app.models.user import User

app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

        print("\n=== Crear usuario Admin ===")
        nombre = input("Nombre: ").strip() or "Admin"
        telefono = input("Teléfono WhatsApp (ej. +5215512345678): ").strip()
        password = getpass("Contraseña: ")

        if not telefono or not password:
            print("Teléfono y contraseña son requeridos.")
            sys.exit(1)

        if User.query.filter_by(telefono_whatsapp=telefono).first():
            print(f"Ya existe un usuario con ese teléfono.")
            sys.exit(1)

        admin = User(
            nombre=nombre,
            telefono_whatsapp=telefono,
            password_hash=generate_password_hash(password),
            rol="admin",
            notif_app=True,
        )
        db.session.add(admin)
        db.session.commit()

        print(f"\nAdmin creado: {admin.nombre} (id={admin.id})")
        print(f"Invite link para clientes: http://localhost:5173/registro/{admin.invite_token}\n")
