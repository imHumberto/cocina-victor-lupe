const ESTADOS = {
  pendiente:       { label: "Recibido",       color: "#f59e0b", bg: "#fef3c7" },
  confirmado:      { label: "Confirmado",      color: "#3b82f6", bg: "#eff6ff" },
  rechazado:       { label: "Rechazado",       color: "#ef4444", bg: "#fef2f2" },
  en_preparacion:  { label: "Preparando",      color: "#8b5cf6", bg: "#f5f3ff" },
  listo:           { label: "Listo 🍱",        color: "#f59e0b", bg: "#fffbeb" },
  en_camino:       { label: "En camino 🛵",    color: "#ED4137", bg: "#fff5f5" },
  entregado:       { label: "Entregado ✓",     color: "#10b981", bg: "#ecfdf5" },
  cancelado:       { label: "Cancelado",       color: "#6b7280", bg: "#f3f4f6" },
};

export default function EstadoBadge({ estado }) {
  const e = ESTADOS[estado] ?? { label: estado, color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span
      className="badge fw-semibold px-2 py-1"
      style={{ background: e.bg, color: e.color, fontSize: "0.75rem" }}
    >
      {e.label}
    </span>
  );
}
