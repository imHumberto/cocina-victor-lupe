import { useEffect, useState, useCallback } from "react";
import api from "../../../services/api";
import EstadoBadge from "../../../components/shared/EstadoBadge";
import { useSocketEvent } from "../../../hooks/useSocket";
import { getSocket } from "../../../services/socket";
import useAuthStore from "../../../store/authStore";

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

  const cargarStats = () => {
    api.get("/repartidor/stats").then(({ data }) => setStats(data));
  };

  const cargarProximos = () => {
    api.get("/repartidor/proximos").then(({ data }) => setProximos(data.count));
  };

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

  const activos = pedidos;

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        {stats && (
          <div className="d-flex align-items-center gap-2 p-3 rounded-3 flex-fill" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
            <i className="bi bi-box-seam-fill" style={{ color: "#10b981", fontSize: "1.3rem" }} />
            <div>
              <div className="fw-bold" style={{ color: "#065f46", fontSize: "1.5rem", lineHeight: 1 }}>{stats.entregados_mes}</div>
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>entrega{stats.entregados_mes !== 1 ? "s" : ""} en {stats.mes}</div>
            </div>
          </div>
        )}
        <div className="d-flex align-items-center gap-2 p-3 rounded-3 flex-fill" style={{ background: proximos > 0 ? "#fffbeb" : "#f9fafb", border: `1px solid ${proximos > 0 ? "#fcd34d" : "#e5e7eb"}` }}>
          <i className="bi bi-fire" style={{ color: proximos > 0 ? "#f59e0b" : "#d1d5db", fontSize: "1.2rem" }} />
          <div>
            <div className="fw-bold" style={{ color: proximos > 0 ? "#92400e" : "#9ca3af", fontSize: "1.5rem", lineHeight: 1 }}>{proximos}</div>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>en preparación</div>
          </div>
        </div>
      </div>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link${tab === "hoy" ? " active fw-bold" : ""}`}
            onClick={() => setTab("hoy")}
          >
            Pedidos activos
            {activos.length > 0 && (
              <span className="badge bg-danger ms-2" style={{ fontSize: "0.65rem" }}>{activos.length}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link${tab === "historial" ? " active fw-bold" : ""}`}
            onClick={() => { setTab("historial"); cargarHistorial(); }}
          >
            Historial
          </button>
        </li>
      </ul>

      {tab === "hoy" && (
        <>
          {loadingHoy
            ? <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-brand" /></div>
            : <>
                {activos.length === 0 && (
                  <p className="text-muted text-center py-5">No hay pedidos activos</p>
                )}
                <div className="d-flex flex-column gap-3">
                  {activos.map((p) => (
                    <PedidoCard key={p.id} pedido={p} onTomar={tomar} onEntregar={abrirModalEntrega} repartidorNombre={user?.nombre} />
                  ))}
                </div>
              </>
          }
        </>
      )}

      {tab === "historial" && (
        <>
          {loadingHistorial
            ? <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-brand" /></div>
            : historial.length === 0
              ? <p className="text-muted text-center py-5">Sin entregas en los últimos 30 días</p>
              : <>
                  <p className="text-muted small mb-3">Últimos 30 días — {historial.length} entrega{historial.length !== 1 ? "s" : ""}</p>
                  <div className="d-flex flex-column gap-2">
                    {historial.map((p) => (
                      <PedidoCard key={p.id} pedido={p} repartidorNombre={user?.nombre} showFecha />
                    ))}
                  </div>
                </>
          }
        </>
      )}

      {/* Modal: confirmar entrega */}
      {modalEntrega && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Confirmar entrega — #{modalEntrega.id}</h6>
                <button className="btn-close" onClick={() => setModalEntrega(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  Cliente: <strong>{modalEntrega.receptor_nombre || modalEntrega.cliente?.nombre}</strong>
                </p>
                <label className="form-label fw-semibold small">¿Cómo pagó?</label>
                <div className="d-flex flex-column gap-2">
                  {[
                    { value: "efectivo",      label: "💵 Efectivo" },
                    { value: "tarjeta",       label: "💳 Tarjeta" },
                    { value: "transferencia", label: "🏦 Transferencia" },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      className="d-flex align-items-center gap-2 p-3 border rounded-3"
                      style={{ cursor: "pointer", background: metodoPagoEntrega === value ? "#fff5f5" : "#fff", borderColor: metodoPagoEntrega === value ? "#ED4137" : "#dee2e6" }}
                      onClick={() => setMetodoPagoEntrega(value)}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: metodoPagoEntrega === value ? "6px solid #ED4137" : "2px solid #ccc", flexShrink: 0 }} />
                      <span className="fw-semibold small">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setModalEntrega(null)}>Cancelar</button>
                <button className="btn btn-success btn-sm" onClick={confirmarEntrega}>
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

function PedidoCard({ pedido: p, onTomar, onEntregar, repartidorNombre, showFecha }) {
  const fecha = p.created_at
    ? new Date(p.created_at).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
    : null;

  return (
    <div className="card card-sazon p-3">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <div className="fw-bold">{p.receptor_nombre || p.cliente?.nombre}</div>
          <div className="text-muted small">{p.direccion?.direccion ?? p.entrega_direccion ?? p.cliente?.direccion_entrega}</div>
          {(p.direccion?.referencias || p.entrega_referencias) && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{p.direccion?.referencias ?? p.entrega_referencias}</div>}
        </div>
        <div className="d-flex flex-column align-items-end gap-1">
          {p.estado === "rechazado"
            ? <span className="badge fw-semibold px-2 py-1" style={{ background: "#fef2f2", color: "#ef4444", fontSize: "0.75rem" }}>Rechazado por admin</span>
            : <EstadoBadge estado={p.estado} />
          }
          {showFecha && fecha && <span className="text-muted" style={{ fontSize: "0.72rem" }}>{fecha}</span>}
        </div>
      </div>
      <div className="small mb-1">
        <i className="bi bi-clock me-1 text-brand" /> {p.hora_entrega}
        {p.metodo_pago && (
          <span className="ms-3 text-muted">
            {p.metodo_pago === "efectivo" ? "💵" : p.metodo_pago === "tarjeta" ? "💳" : "🏦"} {p.metodo_pago}
          </span>
        )}
      </div>
      {(p.receptor_telefono || p.cliente?.telefono_whatsapp) && (() => {
        const tel = (p.receptor_telefono || p.cliente.telefono_whatsapp).replace(/\D/g, "");
        const nombre = p.receptor_nombre || p.cliente?.nombre || "Cliente";
        const quien = repartidorNombre ? repartidorNombre : "el repartidor";
        const msg = encodeURIComponent(`Hola ${nombre}, soy ${quien} de La Cocina de Víctor y Lupe. Ya voy en camino con tu pedido, llego aproximadamente a las ${p.hora_entrega}. 🛵`);
        return (
          <a
            href={`https://wa.me/${tel}?text=${msg}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-outline-success mb-2 align-self-start"
          >
            <i className="bi bi-whatsapp me-1" />
            WhatsApp
          </a>
        );
      })()}
      {p.estado === "rechazado" && p.motivo_rechazo && (
        <div className="alert alert-danger py-1 px-2 small mb-2">
          <i className="bi bi-x-circle me-1" />Motivo: {p.motivo_rechazo}
        </div>
      )}
      {p.notas && <div className="alert alert-warning py-1 px-2 small mb-2">📝 {p.notas}</div>}
      <div className="d-flex gap-2 mt-1">
        {p.estado === "listo" && !p.repartidor_id && onTomar && (
          <button className="btn btn-sm btn-brand" onClick={() => onTomar(p.id)}>
            <i className="bi bi-bag-check me-1" /> Tomar pedido
          </button>
        )}
        {p.estado === "en_camino" && onEntregar && (
          <button className="btn btn-sm btn-success" onClick={() => onEntregar(p)}>
            <i className="bi bi-check-circle me-1" /> Marcar entregado
          </button>
        )}
      </div>
    </div>
  );
}
