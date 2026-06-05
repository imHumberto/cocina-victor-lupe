import { Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";

export default function RepartidorLayout() {
  const { user, logout } = useAuthStore();
  return (
    <div style={{ minHeight: "100dvh", background: "#f9fafb" }}>
      <nav
        className="d-flex align-items-center justify-content-between px-3 py-2"
        style={{ background: "#ED4137", position: "sticky", top: 0, zIndex: 100 }}
      >
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontSize: "1.2rem" }}>🛵</span>
          <div>
            <div className="fw-bold text-white" style={{ fontSize: "0.9rem", lineHeight: 1.2 }}>
              {user?.nombre ?? "Repartidor"}
            </div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>
              La Cocina de Víctor y Lupe
            </div>
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "8px" }}
          onClick={logout}
        >
          <i className="bi bi-box-arrow-right" />
        </button>
      </nav>
      <div className="p-3">
        <Outlet />
      </div>
    </div>
  );
}
