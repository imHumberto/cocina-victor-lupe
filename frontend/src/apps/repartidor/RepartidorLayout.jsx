import { Outlet } from "react-router-dom";
import useAuthStore from "../../store/authStore";

export default function RepartidorLayout() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <div>
      <nav className="navbar px-3 py-2 bg-brand">
        <span className="navbar-brand text-white fw-bold">🛵 Repartidor</span>
        <button className="btn btn-sm btn-outline-light" onClick={logout}>
          <i className="bi bi-box-arrow-right" />
        </button>
      </nav>
      <div className="p-3">
        <Outlet />
      </div>
    </div>
  );
}
