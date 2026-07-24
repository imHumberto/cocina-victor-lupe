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
import ConfiguracionPage from "./apps/cliente/pages/ConfiguracionPage";
import NotificacionesPage from "./apps/cliente/pages/NotificacionesPage";

// Repartidor
import RepartidorLayout from "./apps/repartidor/RepartidorLayout";
import InicioRepartidorPage from "./apps/repartidor/pages/InicioRepartidorPage";
import EnColaPage from "./apps/repartidor/pages/EnColaPage";
import HistorialRepartidorPage from "./apps/repartidor/pages/HistorialRepartidorPage";

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
  if (user.rol === "repartidor") return <Navigate to="/repartidor" replace />;
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
        <Route path="configuracion" element={<ConfiguracionPage />} />
        <Route path="notificaciones" element={<NotificacionesPage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>

      {/* Repartidor */}
      <Route path="/repartidor" element={<RequireAuth roles={["repartidor"]}><RepartidorLayout /></RequireAuth>}>
        <Route index element={<InicioRepartidorPage />} />
        <Route path="cola" element={<EnColaPage />} />
        <Route path="historial" element={<HistorialRepartidorPage />} />
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
