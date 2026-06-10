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
      <aside style={{ width: 200, minWidth: 200, background: "#0F1925", display: "flex", flexDirection: "column" }}>
        <div className="d-flex justify-content-center pt-4 pb-3 px-3">
          <img src={logo} alt="Logo" style={{ width: 110, height: 110 }} />
        </div>

        <nav className="flex-grow-1 px-3">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `d-flex align-items-center gap-2 px-3 py-2 mb-1 rounded text-decoration-none ${isActive ? "text-white fw-semibold" : "text-white-50"}`
              }
              style={({ isActive }) => ({ background: isActive ? "#094D40" : "transparent", fontSize: "0.88rem", height: 50, padding: "0 16px" })}
            >
              <i className={`bi ${icon}`} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
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
      <div className="flex-grow-1 d-flex flex-column" style={{ background: "#F9FBFC", minWidth: 0, overflow: "hidden" }}>
        {/* Topbar */}
        <header className="d-flex align-items-center justify-content-end px-4 py-2 gap-3" style={{ flexShrink: 0, background: "#fff", borderBottom: "1px solid #f0f0f0" }}>
          <button className="btn btn-link p-1 text-muted"><i className="bi bi-bell fs-5" /></button>
          <div className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
              style={{ width: 34, height: 34, background: "#E08080", fontSize: "0.8rem" }}
            >
              {user?.nombre?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <span className="small fw-semibold">{user?.nombre}</span>
          </div>
        </header>

        <main className="flex-grow-1" style={{ minHeight: 0, overflow: "hidden" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
