import { useEffect, useState, useCallback } from "react";
import api from "../../../services/api";
import { useSocketEvent } from "../../../hooks/useSocket";
import { getSocket } from "../../../services/socket";
import useAuthStore from "../../../store/authStore";

const ESTADO_CONFIG = {
  listo:     { label: "Listo para recoger", border: "#fbbf24", dot: "#f59e0b", text: "#92400e", bg: "#fffbeb" },
  en_camino: { label: "En camino",          border: "#93c5fd", dot: "#3b82f6", text: "#1e40af", bg: "#eff6ff" },
  entregado: { label: "Entregado",          border: "#86efac", dot: "#22c55e", text: "#166534", bg: "#f0fdf4" },
  rechazado: { label: "Rechazado",          border: "#fca5a5", dot: "#ef4444", text: "#991b1b", bg: "#fef2f2" },
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
    <>
      {/* Stat cards */}
      <div className="rep-stats">
        {stats && (
          <StatCard
            icon="bi-box-seam-fill"
            iconColor="#14A377"
            bg="#ecfdf5"
            border="#a7f3d0"
            value={stats.entregados_mes}
            label={`entrega${stats.entregados_mes !== 1 ? "s" : ""} en ${stats.mes}`}
          />
        )}
        <StatCard
          icon="bi-fire"
          iconColor={proximos > 0 ? "#f59e0b" : "#d1d5db"}
          bg={proximos > 0 ? "#fffbeb" : "#F1F4F9"}
          border={proximos > 0 ? "#fcd34d" : "#e5e7eb"}
          value={proximos}
          label="en preparación"
          valueColor={proximos > 0 ? "#92400e" : "var(--color-muted)"}
        />
      </div>

      {/* Tabs */}
      <div className="rep-tabs">
        {[
          { key: "hoy",      label: "Activos",  badge: pedidos.length || null },
          { key: "historial", label: "Historial" },
        ].map(({ key, label, badge }) => (
          <button
            key={key}
            className={`rep-tab${tab === key ? " rep-tab--activo" : ""}`}
            onClick={() => { setTab(key); if (key === "historial") cargarHistorial(); }}
          >
            {label}
            {badge > 0 && <span className="rep-tab__badge">{badge}</span>}
          </button>
        ))}
      </div>

      {/* Activos */}
      {tab === "hoy" && (
        loadingHoy
          ? <Spinner />
          : pedidos.length === 0
            ? <EmptyState icon="bi-bag-x" text="Sin pedidos activos" />
            : <div className="d-flex flex-column gap-3">
                {enCamino.length > 0 && (
                  <>
                    <p className="rep-section-label">En camino</p>
                    {enCamino.map((p) => (
                      <PedidoCard key={p.id} pedido={p} onEntregar={abrirModalEntrega} repartidorNombre={user?.nombre} />
                    ))}
                  </>
                )}
                {listos.length > 0 && (
                  <>
                    {enCamino.length > 0 && <p className="rep-section-label">Listos para recoger</p>}
                    {listos.map((p) => (
                      <PedidoCard key={p.id} pedido={p} onTomar={tomar} repartidorNombre={user?.nombre} />
                    ))}
                  </>
                )}
              </div>
      )}

      {/* Historial */}
      {tab === "historial" && (
        loadingHistorial
          ? <Spinner />
          : historial.length === 0
            ? <EmptyState icon="bi-clock-history" text="Sin entregas en los últimos 30 días" />
            : <>
                <p className="rep-historial-meta">
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
                <p className="fw-semibold small mb-2" style={{ color: "var(--color-navy)" }}>
                  ¿Cómo pagó el cliente?
                </p>
                <div className="d-flex flex-column gap-2">
                  {[
                    { value: "efectivo",      label: "Efectivo",     icon: "💵" },
                    { value: "tarjeta",       label: "Tarjeta",      icon: "💳" },
                    { value: "transferencia", label: "Transferencia", icon: "🏦" },
                  ].map(({ value, label, icon }) => {
                    const sel = metodoPagoEntrega === value;
                    return (
                      <label
                        key={value}
                        className={`rep-pago-opcion${sel ? " rep-pago-opcion--sel" : ""}`}
                        onClick={() => setMetodoPagoEntrega(value)}
                      >
                        <span className="rep-pago-opcion__icon">{icon}</span>
                        <span className="rep-pago-opcion__label">{label}</span>
                        <div className={`rep-pago-radio${sel ? " rep-pago-radio--sel" : ""}`} />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-0 gap-2">
                <button className="rep-btn-modal-cancel" onClick={() => setModalEntrega(null)}>
                  Cancelar
                </button>
                <button className="rep-btn-modal-ok" onClick={confirmarEntrega}>
                  <i className="bi bi-check-circle me-1" />Marcar entregado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function StatCard({ icon, iconColor, bg, border, value, label, valueColor }) {
  return (
    <div className="rep-stat-card" style={{ background: bg, borderColor: border }}>
      <i className={`bi ${icon} rep-stat-card__icon`} style={{ color: iconColor }} />
      <div>
        <div className="rep-stat-card__value" style={valueColor ? { color: valueColor } : {}}>
          {value}
        </div>
        <div className="rep-stat-card__label">{label}</div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="d-flex justify-content-center mt-5">
      <div className="spinner-border text-brand" />
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="rep-empty">
      <i className={`bi ${icon}`} />
      <p>{text}</p>
    </div>
  );
}

function MapaPreview({ address }) {
  const [error, setError] = useState(false);
  if (!address || error) return null;
  const src = `/api/geo/mapa?address=${encodeURIComponent(address)}`;
  return (
    <div className="rep-mapa-wrap">
      <img
        src={src}
        alt="Vista del recorrido"
        className="rep-mapa-img"
        onError={() => setError(true)}
      />
      <div className="rep-mapa-leyenda">
        <span className="rep-mapa-pin rep-mapa-pin--sazon">S</span> Sazón Mexa
        <span className="rep-mapa-pin rep-mapa-pin--dest ms-3">D</span> Destino
      </div>
    </div>
  );
}

function PedidoCard({ pedido: p, onTomar, onEntregar, repartidorNombre, showFecha }) {
  const cfg = ESTADO_CONFIG[p.estado] ?? {
    label: p.estado, border: "#e5e7eb", dot: "#9ca3af", text: "#374151", bg: "#f9fafb",
  };
  const esHistorial = !onTomar && !onEntregar;
  const address = p.entrega_direccion ?? p.direccion?.direccion ?? p.cliente?.direccion_entrega ?? null;

  const fecha = p.created_at
    ? new Date(p.created_at).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
    : null;

  const tel = (p.receptor_telefono || p.cliente?.telefono_whatsapp)?.replace(/\D/g, "");
  const waMsg = tel
    ? encodeURIComponent(
        `Hola ${p.receptor_nombre || p.cliente?.nombre || "Cliente"}, soy ${repartidorNombre || "el repartidor"} de Sazón Mexa. Ya voy en camino con tu pedido, llego aproximadamente a las ${p.hora_entrega}. 🛵`
      )
    : null;

  return (
    <div
      className="rep-pedido-card"
      style={{ borderColor: cfg.border, background: esHistorial ? "#fafafa" : cfg.bg }}
    >
      {/* Header */}
      <div className="rep-pedido-card__header">
        <div>
          <div className="rep-pedido-card__nombre">
            {p.receptor_nombre || p.cliente?.nombre}
          </div>
          {showFecha && fecha && (
            <div className="rep-pedido-card__fecha">{fecha}</div>
          )}
        </div>
        <span
          className="rep-estado-badge"
          style={{ borderColor: cfg.border, color: cfg.text }}
        >
          <span className="rep-estado-dot" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>
      </div>

      <div className="rep-pedido-card__divider" style={{ background: cfg.border }} />

      {/* Body */}
      <div className="rep-pedido-card__body">
        <div className="rep-pedido-card__dir">
          <i className="bi bi-geo-alt-fill rep-pedido-card__dir-icon" />
          <div>
            <div className="rep-pedido-card__dir-text">
              {p.direccion?.direccion ?? p.entrega_direccion ?? p.cliente?.direccion_entrega ?? "Sin dirección"}
            </div>
            {(p.direccion?.referencias || p.entrega_referencias) && (
              <div className="rep-pedido-card__dir-ref">
                {p.direccion?.referencias ?? p.entrega_referencias}
              </div>
            )}
          </div>
        </div>

        <div className="rep-pedido-card__meta">
          <span><i className="bi bi-clock me-1 text-brand" />{p.hora_entrega}</span>
          {p.metodo_pago && (
            <span>{PAGO_ICONS[p.metodo_pago] ?? ""} {p.metodo_pago}</span>
          )}
        </div>

        {p.notas && (
          <div className="rep-pedido-card__nota">📝 {p.notas}</div>
        )}
        {p.estado === "rechazado" && p.motivo_rechazo && (
          <div className="rep-pedido-card__rechazo">
            <i className="bi bi-x-circle me-1" />Motivo: {p.motivo_rechazo}
          </div>
        )}

        {!esHistorial && <MapaPreview address={address} />}
      </div>

      {/* Actions */}
      {(p.estado === "listo" || p.estado === "en_camino") && (
        <>
          <div className="rep-pedido-card__divider" style={{ background: cfg.border }} />
          <div className="rep-pedido-card__actions">
            {waMsg && (
              <a
                href={`https://wa.me/${tel}?text=${waMsg}`}
                target="_blank"
                rel="noreferrer"
                className="rep-btn-whatsapp"
              >
                <i className="bi bi-whatsapp" />
                <span>WhatsApp</span>
              </a>
            )}
            {p.estado === "listo" && !p.repartidor_id && onTomar && (
              <button className="rep-btn-tomar" onClick={() => onTomar(p.id)}>
                <i className="bi bi-bag-check" />
                <span>Tomar pedido</span>
              </button>
            )}
            {p.estado === "en_camino" && onEntregar && (
              <button className="rep-btn-entregar" onClick={() => onEntregar(p)}>
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
