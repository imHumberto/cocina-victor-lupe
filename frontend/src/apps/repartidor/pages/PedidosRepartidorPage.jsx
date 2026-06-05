import { useEffect, useState, useCallback } from "react";
import api from "../../../services/api";
import { useSocketEvent } from "../../../hooks/useSocket";
import { getSocket } from "../../../services/socket";
import useAuthStore from "../../../store/authStore";

const ESTADO_CONFIG = {
  listo:    { label: "Listo para recoger", bg: "#fffbeb", border: "#fbbf24", dot: "#f59e0b", text: "#92400e" },
  en_camino: { label: "En camino",         bg: "#eff6ff", border: "#93c5fd", dot: "#3b82f6", text: "#1e40af" },
  entregado: { label: "Entregado",         bg: "#f0fdf4", border: "#86efac", dot: "#22c55e", text: "#166534" },
  rechazado: { label: "Rechazado",         bg: "#fef2f2", border: "#fca5a5", dot: "#ef4444", text: "#991b1b" },
};

const PAGO_ICONS = { efectivo: "💵", tarjeta: "💳", transferencia: "🏦" };

export default function PedidosRepartidorPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("hoy");
  const [pedidos, setPedidos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loadingHoy, setLoadingHoy] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [stats, setStats] = useState(null);
  const [proximos, setProximos] = useState(0);
  const [modalEntrega, setModalEntrega] = useState(null);
  const [metodoPagoEntrega, setMetodoPagoEntrega] = useState("efectivo");

  const cargarHoy = () => {
    api.get("/repartidor/pedidos-hoy")
      .then(({ data }) => setPedidos(data))
      .finally(() => setLoadingHoy(false));
  };
  const cargarStats    = () => api.get("/repartidor/stats").then(({ data }) => setStats(data));
  const cargarProximos = () => api.get("/repartidor/proximos").then(({ data }) => setProximos(data.count));
  const cargarHistorial = () => {
    if (historial.length > 0) return;
    setLoadingHistorial(true);
    api.get("/repartidor/historial")
      .then(({ data }) => setHistorial(data))
      .finally(() => setLoadingHistorial(false));
  };

  useEffect(() => {
    cargarHoy();
    cargarStats();
    cargarProximos();
    getSocket()?.emit("join_admin");
  }, []);

  const handleActualizado = useCallback((p) => {
    cargarProximos();
    setPedidos((ps) => {
      const miId = ps.find((x) => x.id === p.id)?.repartidor_id;
      const disponible = ["listo", "en_camino"].includes(p.estado) && (!p.repartidor_id || p.repartidor_id === miId);
      if (!disponible) return ps.filter((x) => x.id !== p.id);
      const existe = ps.some((x) => x.id === p.id);
      if (!existe) return [...ps, p];
      return ps.map((x) => x.id === p.id ? p : x);
    });
  }, []);
  useSocketEvent("pedido_actualizado", handleActualizado);

  const tomar = async (id) => {
    try {
      const { data } = await api.patch(`/repartidor/${id}/tomar`);
      setPedidos((ps) => ps.map((p) => p.id === id ? data : p));
    } catch (err) {
      alert(err.response?.data?.error ?? "Error");
    }
  };

  const abrirModalEntrega = (pedido) => {
    setMetodoPagoEntrega(pedido.metodo_pago ?? "efectivo");
    setModalEntrega(pedido);
  };

  const confirmarEntrega = async () => {
    try {
      const { data } = await api.patch(`/repartidor/${modalEntrega.id}/entregar`, { metodo_pago: metodoPagoEntrega });
      setPedidos((ps) => ps.map((p) => p.id === modalEntrega.id ? data : p));
      setHistorial([]);
      cargarStats();
      setModalEntrega(null);
    } catch (err) {
      alert(err.response?.data?.error ?? "Error");
    }
  };

  const enCamino = pedidos.filter((p) => p.estado === "en_camino");
  const listos   = pedidos.filter((p) => p.estado === "listo");

  return (
    <div className="pb-4">

      {/* Stats */}
      <div className="d-flex gap-2 mb-4">
        {stats && (
          <StatCard
            icon="bi-box-seam-fill"
            iconColor="#10b981"
            bg="#ecfdf5"
            border="#a7f3d0"
            value={stats.entregados_mes}
            label={`entrega${stats.entregados_mes !== 1 ? "s" : ""} en ${stats.mes}`}
          />
        )}
        <StatCard
          icon="bi-fire"
          iconColor={proximos > 0 ? "#f59e0b" : "#d1d5db"}
          bg={proximos > 0 ? "#fffbeb" : "#f9fafb"}
          border={proximos > 0 ? "#fcd34d" : "#e5e7eb"}
          value={proximos}
          label="en preparación"
          valueColor={proximos > 0 ? "#92400e" : "#9ca3af"}
        />
      </div>

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4">
        {[
          { key: "hoy",      label: "Activos",  badge: pedidos.length || null },
          { key: "historial", label: "Historial" },
        ].map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => { setTab(key); if (key === "historial") cargarHistorial(); }}
            className="fw-semibold px-3 py-2 rounded-pill border-0"
            style={{
              background: tab === key ? "#ED4137" : "#f3f4f6",
              color:      tab === key ? "#fff"    : "#6b7280",
              fontSize: "0.875rem",
              transition: "all 0.15s",
              position: "relative",
            }}
          >
            {label}
            {badge > 0 && (
              <span
                className="position-absolute"
                style={{
                  top: -6, right: -6,
                  background: tab === key ? "#fff" : "#ED4137",
                  color:      tab === key ? "#ED4137" : "#fff",
                  borderRadius: "999px",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  padding: "1px 5px",
                  lineHeight: 1.6,
                }}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Activos */}
      {tab === "hoy" && (
        loadingHoy
          ? <Spinner />
          : pedidos.length === 0
            ? <EmptyState icon="bi-bag-x" text="Sin pedidos activos" />
            : <div className="d-flex flex-column gap-3">
                {/* En camino primero */}
                {enCamino.length > 0 && (
                  <>
                    <SectionLabel text="En camino" color="#1e40af" />
                    {enCamino.map((p) => (
                      <PedidoCard key={p.id} pedido={p} onEntregar={abrirModalEntrega} repartidorNombre={user?.nombre} />
                    ))}
                  </>
                )}
                {listos.length > 0 && (
                  <>
                    {enCamino.length > 0 && <SectionLabel text="Listos para recoger" color="#92400e" />}
                    {listos.map((p) => (
                      <PedidoCard key={p.id} pedido={p} onTomar={tomar} repartidorNombre={user?.nombre} />
                    ))}
                  </>
                )}
              </div>
      )}

      {/* Tab: Historial */}
      {tab === "historial" && (
        loadingHistorial
          ? <Spinner />
          : historial.length === 0
            ? <EmptyState icon="bi-clock-history" text="Sin entregas en los últimos 30 días" />
            : <>
                <p className="text-muted small mb-3">
                  Últimos 30 días — {historial.length} entrega{historial.length !== 1 ? "s" : ""}
                </p>
                <div className="d-flex flex-column gap-2">
                  {historial.map((p) => (
                    <PedidoCard key={p.id} pedido={p} repartidorNombre={user?.nombre} showFecha />
                  ))}
                </div>
              </>
      )}

      {/* Modal: confirmar entrega */}
      {modalEntrega && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="modal-dialog modal-dialog-centered mx-3">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <div>
                  <h6 className="modal-title fw-bold mb-0" style={{ fontSize: "1.05rem" }}>
                    Confirmar entrega
                  </h6>
                  <p className="text-muted small mb-0">
                    {modalEntrega.receptor_nombre || modalEntrega.cliente?.nombre}
                  </p>
                </div>
                <button className="btn-close ms-auto" onClick={() => setModalEntrega(null)} />
              </div>
              <div className="modal-body px-4 py-3">
                <p className="fw-semibold small mb-2" style={{ color: "#374151" }}>¿Cómo pagó el cliente?</p>
                <div className="d-flex flex-column gap-2">
                  {[
                    { value: "efectivo",      label: "Efectivo",      icon: "💵" },
                    { value: "tarjeta",       label: "Tarjeta",       icon: "💳" },
                    { value: "transferencia", label: "Transferencia",  icon: "🏦" },
                  ].map(({ value, label, icon }) => {
                    const sel = metodoPagoEntrega === value;
                    return (
                      <label
                        key={value}
                        onClick={() => setMetodoPagoEntrega(value)}
                        className="d-flex align-items-center gap-3 px-3 py-2 rounded-3"
                        style={{
                          cursor: "pointer",
                          background: sel ? "#fff5f5" : "#f9fafb",
                          border: `1.5px solid ${sel ? "#ED4137" : "#e5e7eb"}`,
                          transition: "all 0.12s",
                        }}
                      >
                        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
                        <span className="fw-semibold small flex-fill">{label}</span>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          border: sel ? "5px solid #ED4137" : "2px solid #d1d5db",
                          transition: "all 0.12s",
                        }} />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-0 gap-2">
                <button
                  className="btn flex-fill py-2 rounded-3"
                  style={{ background: "#f3f4f6", color: "#374151", fontWeight: 600 }}
                  onClick={() => setModalEntrega(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn flex-fill py-2 rounded-3"
                  style={{ background: "#22c55e", color: "#fff", fontWeight: 600 }}
                  onClick={confirmarEntrega}
                >
                  <i className="bi bi-check-circle me-1" />Marcar entregado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function StatCard({ icon, iconColor, bg, border, value, label, valueColor }) {
  return (
    <div
      className="d-flex align-items-center gap-3 p-3 rounded-3 flex-fill"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <i className={`bi ${icon}`} style={{ color: iconColor, fontSize: "1.4rem", flexShrink: 0 }} />
      <div>
        <div className="fw-bold" style={{ color: valueColor ?? "#065f46", fontSize: "1.6rem", lineHeight: 1 }}>
          {value}
        </div>
        <div className="text-muted" style={{ fontSize: "0.72rem" }}>{label}</div>
      </div>
    </div>
  );
}

function SectionLabel({ text, color }) {
  return (
    <p className="fw-bold mb-0" style={{ fontSize: "0.75rem", color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {text}
    </p>
  );
}

function Spinner() {
  return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-brand" /></div>;
}

function EmptyState({ icon, text }) {
  return (
    <div className="text-center py-5">
      <i className={`bi ${icon} d-block mb-2`} style={{ fontSize: "2rem", color: "#d1d5db" }} />
      <p className="text-muted small">{text}</p>
    </div>
  );
}

function PedidoCard({ pedido: p, onTomar, onEntregar, repartidorNombre, showFecha }) {
  const cfg = ESTADO_CONFIG[p.estado] ?? { label: p.estado, bg: "#f9fafb", border: "#e5e7eb", dot: "#9ca3af", text: "#374151" };
  const fecha = p.created_at
    ? new Date(p.created_at).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
    : null;

  const tel = (p.receptor_telefono || p.cliente?.telefono_whatsapp)?.replace(/\D/g, "");
  const waMsg = tel
    ? encodeURIComponent(
        `Hola ${p.receptor_nombre || p.cliente?.nombre || "Cliente"}, soy ${repartidorNombre || "el repartidor"} de La Cocina de Víctor y Lupe. Ya voy en camino con tu pedido, llego aproximadamente a las ${p.hora_entrega}. 🛵`
      )
    : null;

  const esHistorial = !onTomar && !onEntregar;

  return (
    <div
      className="rounded-4 p-0 overflow-hidden"
      style={{
        border: `1.5px solid ${cfg.border}`,
        background: esHistorial ? "#fafafa" : cfg.bg,
      }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 d-flex justify-content-between align-items-start">
        <div className="flex-fill me-2">
          <div className="fw-bold" style={{ fontSize: "1rem", color: "#111827" }}>
            {p.receptor_nombre || p.cliente?.nombre}
          </div>
          {showFecha && fecha && (
            <div className="text-muted" style={{ fontSize: "0.72rem" }}>{fecha}</div>
          )}
        </div>
        {/* Estado dot + label */}
        <span
          className="d-flex align-items-center gap-1 px-2 py-1 rounded-pill"
          style={{ background: "#fff", border: `1px solid ${cfg.border}`, fontSize: "0.7rem", color: cfg.text, fontWeight: 600, flexShrink: 0 }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
          {cfg.label}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: cfg.border, opacity: 0.5 }} />

      {/* Body */}
      <div className="px-3 py-2">
        {/* Dirección */}
        <div className="d-flex align-items-start gap-2 mb-1">
          <i className="bi bi-geo-alt-fill mt-1" style={{ color: "#ED4137", fontSize: "0.85rem", flexShrink: 0 }} />
          <div>
            <div className="fw-semibold" style={{ fontSize: "0.85rem", color: "#1f2937" }}>
              {p.direccion?.direccion ?? p.entrega_direccion ?? p.cliente?.direccion_entrega ?? "Sin dirección"}
            </div>
            {(p.direccion?.referencias || p.entrega_referencias) && (
              <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                {p.direccion?.referencias ?? p.entrega_referencias}
              </div>
            )}
          </div>
        </div>

        {/* Hora + pago */}
        <div className="d-flex align-items-center gap-3" style={{ fontSize: "0.8rem", color: "#4b5563" }}>
          <span><i className="bi bi-clock me-1 text-brand" />{p.hora_entrega}</span>
          {p.metodo_pago && (
            <span>{PAGO_ICONS[p.metodo_pago] ?? ""} {p.metodo_pago}</span>
          )}
        </div>

        {/* Notas */}
        {p.notas && (
          <div
            className="mt-2 px-2 py-1 rounded-2 small"
            style={{ background: "#fefce8", border: "1px solid #fde68a", color: "#713f12", fontSize: "0.78rem" }}
          >
            📝 {p.notas}
          </div>
        )}

        {/* Rechazo */}
        {p.estado === "rechazado" && p.motivo_rechazo && (
          <div
            className="mt-2 px-2 py-1 rounded-2 small"
            style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontSize: "0.78rem" }}
          >
            <i className="bi bi-x-circle me-1" />Motivo: {p.motivo_rechazo}
          </div>
        )}
      </div>

      {/* Actions */}
      {(p.estado === "listo" || p.estado === "en_camino") && (
        <>
          <div style={{ height: 1, background: cfg.border, opacity: 0.5 }} />
          <div className="px-3 py-2 d-flex gap-2">
            {/* WhatsApp */}
            {waMsg && (
              <a
                href={`https://wa.me/${tel}?text=${waMsg}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{
                  background: "#dcfce7", color: "#16a34a", border: "none",
                  fontWeight: 600, fontSize: "0.8rem", borderRadius: "8px",
                }}
              >
                <i className="bi bi-whatsapp" />
                <span>WhatsApp</span>
              </a>
            )}

            {/* Tomar pedido */}
            {p.estado === "listo" && !p.repartidor_id && onTomar && (
              <button
                className="btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1"
                style={{
                  background: "#ED4137", color: "#fff", border: "none",
                  fontWeight: 600, fontSize: "0.85rem", borderRadius: "8px",
                }}
                onClick={() => onTomar(p.id)}
              >
                <i className="bi bi-bag-check" />
                <span>Tomar pedido</span>
              </button>
            )}

            {/* Marcar entregado */}
            {p.estado === "en_camino" && onEntregar && (
              <button
                className="btn btn-sm flex-fill d-flex align-items-center justify-content-center gap-1"
                style={{
                  background: "#22c55e", color: "#fff", border: "none",
                  fontWeight: 600, fontSize: "0.85rem", borderRadius: "8px",
                }}
                onClick={() => onEntregar(p)}
              >
                <i className="bi bi-check-circle" />
                <span>Marcar entregado</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
