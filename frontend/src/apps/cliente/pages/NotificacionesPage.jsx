import { useEffect } from "react";
import useNotifStore from "../../../store/notifStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

function parseNotif(mensaje) {
  const sin = mensaje.replace(/[\u{1F000}-\u{1FFFF}]|[☀-➿]|️/gu, "").trim();
  const partes = sin.split(/\.\s*Motivo:\s*/);
  return {
    titulo: partes[0].replace(/^[¡!]\s*/, "").trim(),
    subtitulo: partes[1] ? `Motivo: ${partes[1].trim()}` : null,
  };
}

function getIcono(mensaje) {
  const m = mensaje.toLowerCase();
  if (m.includes("rechazado"))                            return { icon: "bi-x-circle-fill", cancelado: true };
  if (m.includes("cancelado"))                            return { icon: "bi-x-circle-fill", cancelado: true };
  if (m.includes("confirmado"))                           return { icon: "bi-check-circle" };
  if (m.includes("entregado") || m.includes("provecho")) return { icon: "bi-bag-check" };
  if (m.includes("camino"))                               return { icon: "bi-scooter" };
  if (m.includes("preparac"))                             return { icon: "bi-hourglass-split" };
  if (m.includes("men"))                                  return { icon: "bi-calendar-week" };
  return { icon: "bi-bell-fill" };
}

function agrupar(notificaciones) {
  const hoy = dayjs().format("YYYY-MM-DD");
  const ayer = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const grupos = {};
  notificaciones.forEach((n) => {
    const fecha = dayjs(n.created_at).format("YYYY-MM-DD");
    const label =
      fecha === hoy ? "Hoy" :
      fecha === ayer ? "Ayer" :
      dayjs(n.created_at).format("D [de] MMMM");
    if (!grupos[label]) grupos[label] = [];
    grupos[label].push(n);
  });
  return grupos;
}

export default function NotificacionesPage() {
  const { notificaciones, fetchNotificaciones, leerTodas, borrarTodas } = useNotifStore();

  useEffect(() => {
    fetchNotificaciones().then(() => {
      const hayNoLeidas = useNotifStore.getState().notificaciones.some((n) => !n.leido);
      if (hayNoLeidas) leerTodas();
    });
  }, [fetchNotificaciones, leerTodas]);

  const grupos = agrupar(notificaciones);

  return (
    <div className="cliente-page">
      <div className="notif-header">
        <h1 className="notif-titulo">Notificaciones</h1>
        {notificaciones.length > 0 && (
          <button className="notif-borrar" onClick={borrarTodas}>Borrar todo</button>
        )}
      </div>

      {notificaciones.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-bell-slash fs-1 d-block mb-2" />
          <p className="mb-0">Sin notificaciones</p>
        </div>
      ) : (
        Object.entries(grupos).map(([label, items]) => (
          <div key={label} className="notif-grupo">
            <div className="notif-grupo__label">{label}</div>
            <div className="d-flex flex-column gap-2">
              {items.map((n) => {
                const { titulo, subtitulo } = parseNotif(n.mensaje);
                const { icon, cancelado } = getIcono(n.mensaje);
                return (
                  <div key={n.id} className={`notif-card${n.leido ? " notif-card--leida" : ""}`}>
                    <div className={`notif-card__icono-wrap${cancelado ? " notif-card__icono-wrap--cancelado" : ""}`}>
                      <i className={`bi ${icon}`} />
                    </div>
                    <div className="notif-card__body">
                      <div className="notif-card__titulo">{titulo}</div>
                      {subtitulo && <div className="notif-card__subtitulo">{subtitulo}</div>}
                      <div className="notif-card__tiempo">{dayjs(n.created_at).fromNow()}</div>
                    </div>
                    {!n.leido && <span className="notif-card__dot" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
