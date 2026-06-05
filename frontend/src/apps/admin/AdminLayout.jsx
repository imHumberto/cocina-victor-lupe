import { Outlet, NavLink } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import logo from "../../assets/logo.svg";

const NAV = [
  { to: "/admin/pedidos",   icon: "bi-bag-check",     label: "Pedidos" },
  { to: "/admin/menu",      icon: "bi-calendar-week", label: "Menús" },
  { to: "/admin/platillos", icon: "bi-grid",           label: "Platillos" },
  { to: "/admin/usuarios",  icon: "bi-people",         label: "Usuarios" },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 200, minWidth: 200, background: "#1a1a1a", display: "flex", flexDirection: "column" }}>
        <div className="d-flex justify-content-center pt-4 pb-3 px-3">
          <img src={logo} alt="Logo" style={{ width: 120 , height: 120 }} />
        </div>

        <nav className="flex-grow-1 px-2">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `d-flex align-items-center gap-2 px-3 py-2 mb-1 rounded text-decoration-none ${isActive ? "text-white fw-semibold" : "text-white-50"}`
              }
              style={({ isActive }) => ({ background: isActive ? "#ED4137" : "transparent", fontSize: "0.88rem" })}
            >
              <i className={`bi ${icon}`} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3" style={{ borderTop: "1px solid #333" }}>
          <button
            className="btn d-flex align-items-center gap-2 text-white-50 w-100 px-0"
            style={{ background: "none", border: "none", fontSize: "0.85rem" }}
            onClick={logout}
          >
            <i className="bi bi-box-arrow-left" /> Salir
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-grow-1 d-flex flex-column" style={{ background: "#f4f4f4", minWidth: 0, overflow: "hidden" }}>
        {/* Topbar */}
        <header className="d-flex align-items-center justify-content-end px-4 py-2 bg-white border-bottom gap-3" style={{ flexShrink: 0 }}>
          <button className="btn btn-link p-1 text-muted"><i className="bi bi-bell fs-5" /></button>
          <div className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
              style={{ width: 34, height: 34, background: "#ED4137", fontSize: "0.8rem" }}
            >
              {user?.nombre?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <span className="small fw-semibold">{user?.nombre}</span>
            <i className="bi bi-chevron-down small text-muted" />
          </div>
        </header>

        <main className="flex-grow-1" style={{ minHeight: 0, overflow: "hidden" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
