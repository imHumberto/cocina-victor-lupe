import { Outlet } from "react-router-dom";
import "./repartidor.css";

export default function RepartidorLayout() {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)" }}>
      <div className="rep-page">
        <Outlet />
      </div>
    </div>
  );
}
