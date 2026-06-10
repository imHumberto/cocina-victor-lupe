import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useCallback } from "react";
import useNotifStore from "../../store/notifStore";
import { useSocketEvent } from "../../hooks/useSocket";
import "./cliente.css";

export default function ClienteLayout() {
  const { noLeidas, fetchCount, agregarNotificacion } = useNotifStore();

  useEffect(() => { fetchCount(); }, [fetchCount]);

  const handleNotif = useCallback(
    (notif) => agregarNotificacion(notif),
    [agregarNotificacion]
  );
  useSocketEvent("nueva_notificacion", handleNotif);

  return (
    <>
      <div className="page-with-nav">
        <Outlet />
      </div>
      <nav className="bottom-nav">
        <NavLink to="/cliente/inicio">
          <i className="bi bi-house" />
          Inicio
        </NavLink>
        <NavLink to="/cliente/menu">
          <i className="bi bi-calendar-week" />
          Menú
        </NavLink>
        <NavLink to="/cliente/notificaciones">
          <span className="position-relative d-inline-block">
            <i className="bi bi-bell" />
            {noLeidas > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: "0.55rem" }}>
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </span>
          Notificaciones
        </NavLink>
        <NavLink to="/cliente/perfil">
          <i className="bi bi-person-circle" />
          Perfil
        </NavLink>
      </nav>
    </>
  );
}
