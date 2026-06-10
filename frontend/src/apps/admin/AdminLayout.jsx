import { Outlet, NavLink } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import logo from "../../assets/logo.svg";
import "./admin.css";

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
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <img src={logo} alt="Logo" />
        </div>

        <nav className="admin-sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-item${isActive ? " active" : ""}`}
            >
              <i className={`bi ${icon}`} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-logout" onClick={logout}>
            <i className="bi bi-box-arrow-left" /> Salir
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="btn btn-link p-1 text-muted"><i className="bi bi-bell fs-5" /></button>
          <div className="d-flex align-items-center gap-2" style={{ cursor: "pointer" }}>
            <div className="admin-topbar-avatar">
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
