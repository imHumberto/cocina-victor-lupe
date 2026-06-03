import { useEffect } from "react";
import useNotifStore from "../../../store/notifStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

export default function NotificacionesPage() {
  const { notificaciones, fetchNotificaciones, marcarLeida, leerTodas } = useNotifStore();

  useEffect(() => { fetchNotificaciones(); }, [fetchNotificaciones]);

  return (
    <div className="p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 fw-bold mb-0">Notificaciones</h2>
        <button className="btn btn-sm btn-outline-brand" onClick={leerTodas}>
          Marcar todas leídas
        </button>
      </div>

      {notificaciones.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-bell-slash fs-1 d-block mb-2" />
          Sin notificaciones
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {notificaciones.map((n) => (
            <div
              key={n.id}
              className={`card card-sazon p-3 ${!n.leido ? "border-start border-brand border-3" : ""}`}
              onClick={() => !n.leido && marcarLeida(n.id)}
              style={{ cursor: n.leido ? "default" : "pointer" }}
            >
              <p className={`mb-1 ${!n.leido ? "fw-semibold" : "text-muted"}`}>{n.mensaje}</p>
              <small className="text-muted">{dayjs(n.created_at).fromNow()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
