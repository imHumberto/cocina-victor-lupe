import os
from app import create_app, socketio
from flask_socketio import join_room
from flask_jwt_extended import decode_token

app = create_app(os.getenv("FLASK_ENV", "development"))


@socketio.on("connect")
def on_connect(auth):
    """Cliente se suscribe a su sala personal para notificaciones."""
    if auth and "token" in auth:
        try:
            data = decode_token(auth["token"])
            user_id = data["sub"]
            join_room(f"user_{user_id}")
        except Exception:
            pass


@socketio.on("join_admin")
def on_join_admin():
    join_room("admin")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5001, debug=app.debug, allow_unsafe_werkzeug=True)
