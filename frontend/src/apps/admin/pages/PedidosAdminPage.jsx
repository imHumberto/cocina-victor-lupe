import { useEffect, useState, useCallback } from "react";
import api from "../../../services/api";
import EstadoBadge from "../../../components/shared/EstadoBadge";
import { useSocketEvent } from "../../../hooks/useSocket";
import { getSocket } from "../../../services/socket";

const ESTADOS_RESUMEN = ["confirmado", "en_preparacion", "listo", "en_camino", "entregado", "cancelado"];

const MOTIVOS_RAPIDOS = [
  "Se acabó el plato del día",
  "No hay suficiente stock",
  "Pedido fuera de horario",
  "Problema con el pago",
];

export default function PedidosAdminPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [modalRechazo, setModalRechazo] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [modalEstado, setModalEstado] = useState(null); // { pedido, estado }

  const cargar = () => {
    api.get("/admin/pedidos-hoy")
      .then(({ data }) => setPedidos(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    getSocket()?.emit("join_admin");
  }, []);

  const handleActualizado = useCallback((p) => {
    setPedidos((ps) => ps.map((x) => x.id === p.id ? p : x));
  }, []);
  useSocketEvent("pedido_actualizado", handleActualizado);

  const cambiarEstado = async (id, estado) => {
    try {
      const { data } = await api.patch(`/admin/pedidos/${id}/estado`, { estado });
      setPedidos((ps) => ps.map((x) => x.id === data.id ? data : x));
      setModalEstado(null);
    } catch (err) {
      alert(err.response?.data?.error ?? "Error al cambiar el estado");
    }
  };

  const confirmar = async (id) => {
    try {
      const { data } = await api.post(`/admin/pedidos/${id}/confirmar`);
      setPedidos((ps) => ps.map((x) => x.id === data.id ? data : x));
    } catch (err) {
      alert(err.response?.data?.error ?? "Error al confirmar el pedido");
    }
  };

  const rechazar = async () => {
    if (!motivoRechazo.trim()) return;
    try {
      const { data } = await api.post(`/admin/pedidos/${modalRechazo.id}/rechazar`, { motivo: motivoRechazo });
      setPedidos((ps) => ps.map((x) => x.id === data.id ? data : x));
      setModalRechazo(null);
      setMotivoRechazo("");
    } catch (err) {
      alert(err.response?.data?.error ?? "Error al rechazar el pedido");
    }
  };

  const imprimir = (p) => {
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Comanda #${p.id}</title>
      <style>body{font-family:monospace;padding:20px} h2{margin:0}</style></head><body>
      <h2>La Cocina de Víctor y Lupe — Comanda #${p.id}</h2>
      <p>Recibe: <strong>${p.receptor_nombre || p.cliente?.nombre}</strong></p>
      <p>Dirección: ${p.direccion?.direccion ?? p.entrega_direccion ?? p.cliente?.direccion_entrega ?? "—"}</p>
      ${(p.direccion?.referencias || p.entrega_referencias) ? `<p>Referencias: ${p.direccion?.referencias ?? p.entrega_referencias}</p>` : ""}
      <p>Tel: ${p.receptor_telefono || p.cliente?.telefono_whatsapp}</p>
      <p>Hora entrega: ${p.hora_entrega}</p>
      <p>Plato: ${p.plato_elegido === "principal" ? "Principal" : "Alternativa"}</p>
      <p>Bebida: ${p.bebida_elegida === "principal" ? "Principal" : "Alternativa"}</p>
      <p>Pago: ${p.metodo_pago}</p>
      ${p.notas ? `<p>Nota: ${p.notas}</p>` : ""}
      <script>window.print();window.close();</script>
      </body></html>
    `);
  };

  const visible = filtro === "todos" ? pedidos : pedidos.filter((p) => p.estado === filtro);

  const resumen = ESTADOS_RESUMEN.reduce((acc, e) => {
    acc[e] = pedidos.filter((p) => p.estado === e).length;
    return acc;
  }, {});

  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-brand" /></div>;

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <h2 className="h5 fw-bold mb-0">Pedidos del día</h2>
        <button className="btn btn-sm btn-outline-brand" onClick={cargar}>
          <i className="bi bi-arrow-clockwise me-1" /> Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="row g-2 mb-3">
        {[
          { k: "pendiente", label: "Pendientes", color: "warning" },
          { k: "en_preparacion", label: "En preparación", color: "info" },
          { k: "listo", label: "Listos", color: "warning" },
          { k: "en_camino", label: "En camino", color: "primary" },
          { k: "entregado", label: "Entregados", color: "success" },
        ].map(({ k, label, color }) => (
          <div className="col-6 col-md-3" key={k}>
            <div className={`card border-${color} text-center p-2`} style={{ cursor: "pointer" }} onClick={() => setFiltro(filtro === k ? "todos" : k)}>
              <div className={`fs-4 fw-bold text-${color}`}>{resumen[k]}</div>
              <div className="small text-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>#</th><th>Cliente</th><th>Hora</th><th>Plato</th><th>Pago</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id}>
                <td className="fw-bold">{p.id}</td>
                <td>
                  <div>{p.receptor_nombre || p.cliente?.nombre}</div>
                  <div className="text-muted small">{p.direccion?.alias ?? p.entrega_direccion ?? p.cliente?.direccion_entrega}</div>
                  {(p.direccion?.referencias || p.entrega_referencias) && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{p.direccion?.referencias ?? p.entrega_referencias}</div>}
                </td>
                <td>{p.hora_entrega}</td>
                <td>
                  <div>{p.plato_elegido === "principal" ? "Principal" : "Alternativa"}</div>
                  <div className="text-muted small">{p.bebida_elegida === "principal" ? "Beb. principal" : "Beb. alt."}</div>
                  {p.notas && <div className="badge bg-warning text-dark">📝 Nota</div>}
                </td>
                <td>{p.metodo_pago}</td>
                <td>
                  <EstadoBadge estado={p.estado} />
                </td>
                <td>
                  <div className="d-flex gap-1 flex-wrap align-items-center">
                    {p.estado === "pendiente" && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => confirmar(p.id)}>
                          <i className="bi bi-check-lg me-1" />Aceptar
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => { setModalRechazo(p); setMotivoRechazo(""); }}>
                          <i className="bi bi-x-lg me-1" />Rechazar
                        </button>
                      </>
                    )}
                    {p.estado === "confirmado" && (
                      <>
                        <button className="btn btn-sm btn-brand" onClick={() => setModalEstado({ pedido: p, estado: "en_preparacion" })}>
                          <i className="bi bi-fire me-1" />En preparación
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setModalEstado({ pedido: p, estado: "cancelado" })}>
                          Cancelar
                        </button>
                      </>
                    )}
                    {p.estado === "en_preparacion" && (
                      <>
                        <button className="btn btn-sm btn-brand" onClick={() => setModalEstado({ pedido: p, estado: "listo" })}>
                          <i className="bi bi-bag-check me-1" />Pedido listo
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setModalEstado({ pedido: p, estado: "cancelado" })}>
                          Cancelar
                        </button>
                      </>
                    )}
                    {p.estado === "listo" && (
                      <span className="text-muted small">
                        <i className="bi bi-hourglass-split me-1" />Esperando repartidor
                      </span>
                    )}
                    {p.estado === "en_camino" && (
                      <>
                        <span className="text-muted small me-1">
                          <i className="bi bi-scooter me-1" />
                          {p.repartidor?.nombre ?? "Sin repartidor"}
                        </span>
                        <button className="btn btn-sm btn-outline-success" onClick={() => setModalEstado({ pedido: p, estado: "entregado" })}>
                          <i className="bi bi-check-circle me-1" />Entregado
                        </button>
                      </>
                    )}
                    {p.estado === "rechazado" && (
                      <span className="text-danger small fst-italic">{p.motivo_rechazo}</span>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" title="Imprimir comanda" onClick={() => imprimir(p)}>
                      <i className="bi bi-printer" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="text-center text-muted py-3">Sin pedidos con ese filtro</p>}
      </div>

      {/* Modal confirmar cambio de estado */}
      {modalEstado && (() => {
        const LABELS = {
          confirmado:     "Confirmado",
          en_preparacion: "En preparación",
          listo:          "Pedido listo",
          en_camino:      "En camino",
          entregado:      "Entregado",
          cancelado:      "Cancelado",
        };
        return (
          <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h6 className="modal-title fw-bold">Confirmar cambio de estado</h6>
                  <button className="btn-close" onClick={() => setModalEstado(null)} />
                </div>
                <div className="modal-body">
                  <p className="mb-1 text-muted small">
                    Pedido <strong>#{modalEstado.pedido.id}</strong> — {modalEstado.pedido.receptor_nombre || modalEstado.pedido.cliente?.nombre}
                  </p>
                  <p className="mb-0">
                    ¿Cambiar estado a <strong>{LABELS[modalEstado.estado] ?? modalEstado.estado}</strong>?
                  </p>
                  {modalEstado.estado === "cancelado" && (
                    <div className="alert alert-warning py-2 small mt-3 mb-0">
                      <i className="bi bi-exclamation-triangle me-1" />
                      El cliente recibirá una notificación de cancelación.
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setModalEstado(null)}>Cancelar</button>
                  <button
                    className={`btn btn-sm ${modalEstado.estado === "cancelado" ? "btn-danger" : "btn-brand"}`}
                    onClick={() => cambiarEstado(modalEstado.pedido.id, modalEstado.estado)}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal rechazo */}
      {modalRechazo && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Rechazar pedido #{modalRechazo.id}</h6>
                <button className="btn-close" onClick={() => setModalRechazo(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">Cliente: <strong>{modalRechazo.cliente?.nombre}</strong></p>
                <label className="form-label fw-semibold small">Motivo del rechazo</label>
                {/* Motivos rápidos */}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {MOTIVOS_RAPIDOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`btn btn-sm rounded-pill ${motivoRechazo === m ? "btn-danger" : "btn-outline-secondary"}`}
                      onClick={() => setMotivoRechazo(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="O escribe el motivo..."
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setModalRechazo(null)}>Cancelar</button>
                <button className="btn btn-danger btn-sm" onClick={rechazar} disabled={!motivoRechazo.trim()}>
                  Confirmar rechazo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
