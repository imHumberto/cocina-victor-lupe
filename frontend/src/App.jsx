import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";

// Shared
import LoginPage from "./apps/cliente/pages/LoginPage";
import RegistroPage from "./apps/cliente/pages/RegistroPage";

// Cliente
import ClienteLayout from "./apps/cliente/ClienteLayout";
import InicioPage from "./apps/cliente/pages/InicioPage";
import MenuPage from "./apps/cliente/pages/MenuPage";
import OrdenarPage from "./apps/cliente/pages/OrdenarPage";
import PerfilPage from "./apps/cliente/pages/PerfilPage";
import MisPedidosPage from "./apps/cliente/pages/MisPedidosPage";
import NotificacionesPage from "./apps/cliente/pages/NotificacionesPage";

// Repartidor
import RepartidorLayout from "./apps/repartidor/RepartidorLayout";
import PedidosRepartidorPage from "./apps/repartidor/pages/PedidosRepartidorPage";

// Admin
import AdminLayout from "./apps/admin/AdminLayout";
import PedidosAdminPage from "./apps/admin/pages/PedidosAdminPage";
import MenuAdminPage from "./apps/admin/pages/MenuAdminPage";
import PlatillosPage from "./apps/admin/pages/PlatillosPage";
import UsuariosPage from "./apps/admin/pages/UsuariosPage";

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="spinner-overlay"><div className="spinner-border text-brand" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuthStore();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol === "admin") return <Navigate to="/admin/pedidos" replace />;
  if (user.rol === "repartidor") return <Navigate to="/repartidor/pedidos" replace />;
  return <Navigate to="/cliente/inicio" replace />;
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro/:token" element={<RegistroPage />} />

      {/* Cliente */}
      <Route path="/cliente" element={<RequireAuth roles={["cliente"]}><ClienteLayout /></RequireAuth>}>
        <Route index element={<Navigate to="inicio" replace />} />
        <Route path="inicio" element={<InicioPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="ordenar" element={<OrdenarPage />} />
        <Route path="mis-pedidos" element={<MisPedidosPage />} />
        <Route path="notificaciones" element={<NotificacionesPage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>

      {/* Repartidor */}
      <Route path="/repartidor" element={<RequireAuth roles={["repartidor"]}><RepartidorLayout /></RequireAuth>}>
        <Route index element={<Navigate to="pedidos" replace />} />
        <Route path="pedidos" element={<PedidosRepartidorPage />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth roles={["admin"]}><AdminLayout /></RequireAuth>}>
        <Route index element={<Navigate to="pedidos" replace />} />
        <Route path="pedidos" element={<PedidosAdminPage />} />
        <Route path="menu" element={<MenuAdminPage />} />
        <Route path="platillos" element={<PlatillosPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
      </Route>

<Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
