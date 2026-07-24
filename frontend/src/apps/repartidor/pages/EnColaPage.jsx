import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import { useSocketEvent } from "../../../hooks/useSocket";

const PAGO_ICONS = { efectivo: "💵", tarjeta: "💳", transferencia: "🏦" };

function MapaPreview({ address }) {
  const [error, setError] = useState(false);
  if (!address || error) return null;
  return (
    <div className="rep-mapa-wrap">
      <img
        src={`/api/geo/mapa?address=${encodeURIComponent(address)}`}
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

function PedidoColaCard({ pedido: p, expandidoId, setExpandidoId, onEntregar, repartidorNombre }) {
  const expandido = expandidoId === p.id;
  const address = p.entrega_direccion ?? p.direccion?.direccion ?? p.cliente?.direccion_entrega ?? null;
  const tel = (p.receptor_telefono || p.cliente?.telefono_whatsapp)?.replace(/\D/g, "");
  const waMsg = tel
    ? encodeURIComponent(`Hola ${p.receptor_nombre || p.cliente?.nombre || "Cliente"}, soy ${repartidorNombre || "el repartidor"} de Sazón Mexa. Ya voy en camino con tu pedido, llego aproximadamente a las ${p.hora_entrega}. 🛵`)
    : null;

  const rutaUrl = (() => {
    const dest = encodeURIComponent(address ?? "");
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  })();

  return (
    <div className="rep-pedido-card">
      <div className="rep-pedido-card__top">
        <div>
          <div className="rep-pedido-card__id">#{p.id}</div>
          <div className="rep-pedido-card__nombre">{p.receptor_nombre || p.cliente?.nombre}</div>
        </div>
        <div className="d-flex align-items-start gap-2">
          <span className="rep-badge rep-badge--camino">Listo para recolección</span>
          <button
            className="rep-pedido-card__toggle"
            onClick={() => setExpandidoId(expandido ? null : p.id)}
          >
            <i className={`bi bi-${expandido ? "dash" : "plus"}`} />
          </button>
        </div>
      </div>

      <div className="rep-pedido-card__meta">
        <div className="rep-pedido-card__meta-row">
          <i className="bi bi-geo-alt-fill" style={{ color: "#ED4137" }} />
          <span>{address ?? "Sin dirección"}</span>
        </div>
        <div className="rep-pedido-card__meta-row">
          <i className="bi bi-clock" />
          <span>{p.hora_entrega}</span>
          <i className="bi bi-credit-card ms-2" />
          <span>{PAGO_ICONS[p.metodo_pago] ?? ""} {p.metodo_pago}</span>
        </div>
      </div>

      {p.notas && (
        <div className="rep-pedido-card__nota">
          <i className="bi bi-chat-left-text" />
          <span>"{p.notas}"</span>
        </div>
      )}

      {expandido && <MapaPreview address={address} />}

      <div className="rep-btn-row">
        {waMsg && (
          <a
            href={`https://wa.me/${tel}?text=${waMsg}`}
            target="_blank"
            rel="noreferrer"
            className="rep-btn-secondary"
            style={{ textDecoration: "none" }}
          >
            <i className="bi bi-whatsapp" /> WhatsApp
          </a>
        )}
        <a
          href={rutaUrl}
          target="_blank"
          rel="noreferrer"
          className="rep-btn-secondary"
          style={{ textDecoration: "none" }}
        >
          <i className="bi bi-map" /> Ver ruta
        </a>
        <button className="rep-btn-entregar" onClick={() => onEntregar(p)}>
          <i className="bi bi-check-circle" /> Entregado
        </button>
      </div>
    </div>
  );
}

export default function EnColaPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidoId, setExpandidoId] = useState(null);
  const [modalEntrega, setModalEntrega] = useState(null);
  const [metodoPago, setMetodoPago] = useState("efectivo");

  const cargar = () =>
    api.get("/repartidor/pedidos-hoy")
      .then(({ data }) => setPedidos(data.filter(p => p.estado === "en_camino")))
      .finally(() => setLoading(false));

  useEffect(() => { cargar(); }, []);

  const handleActualizado = useCallback((p) => {
    setPedidos(ps =>
      p.estado === "en_camino"
        ? ps.some(x => x.id === p.id) ? ps.map(x => x.id === p.id ? p : x) : [...ps, p]
        : ps.filter(x => x.id !== p.id)
    );
  }, []);
  useSocketEvent("pedido_actualizado", handleActualizado);

  const abrirModal = (pedido) => {
    setMetodoPago(pedido.metodo_pago ?? "efectivo");
    setModalEntrega(pedido);
  };

  const confirmarEntrega = async () => {
    try {
      await api.patch(`/repartidor/${modalEntrega.id}/entregar`, { metodo_pago: metodoPago });
      setPedidos(ps => ps.filter(p => p.id !== modalEntrega.id));
      setModalEntrega(null);
    } catch (err) {
      alert(err.response?.data?.error ?? "Error");
    }
  };

  return (
    <>
      <div className="rep-page-header">
        <button className="rep-page-header__back" onClick={() => navigate("/repartidor")}>
          <i className="bi bi-chevron-left" />
        </button>
        <h1 className="rep-page-header__titulo">Pedidos por<br />repartir</h1>
      </div>

      {loading ? (
        <div className="rep-spinner"><div className="spinner-border text-brand" /></div>
      ) : pedidos.length === 0 ? (
        <div className="rep-empty">
          <img src="/ilustraciones/IMG-repartidorCola.png" alt="" className="rep-empty__img" />
          <p className="rep-empty__text">No tienes pedidos en cola</p>
        </div>
      ) : (
        pedidos.map(p => (
          <PedidoColaCard
            key={p.id}
            pedido={p}
            expandidoId={expandidoId}
            setExpandidoId={setExpandidoId}
            onEntregar={abrirModal}
            repartidorNombre={user?.nombre}
          />
        ))
      )}

      {/* Modal confirmar entrega */}
      {modalEntrega && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="modal-dialog modal-dialog-centered mx-3">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 pb-0 px-4 pt-4">
                <div>
                  <h6 className="modal-title fw-bold mb-0">Confirmar entrega</h6>
                  <p className="text-muted small mb-0">{modalEntrega.receptor_nombre || modalEntrega.cliente?.nombre}</p>
                </div>
                <button className="btn-close ms-auto" onClick={() => setModalEntrega(null)} />
              </div>
              <div className="modal-body px-4 py-3">
                <p className="fw-semibold small mb-2" style={{ color: "var(--color-navy)" }}>¿Cómo pagó el cliente?</p>
                <div className="d-flex flex-column gap-2">
                  {[
                    { value: "efectivo", label: "Efectivo", icon: "💵" },
                    { value: "tarjeta", label: "Tarjeta", icon: "💳" },
                    { value: "transferencia", label: "Transferencia", icon: "🏦" },
                  ].map(({ value, label, icon }) => {
                    const sel = metodoPago === value;
                    return (
                      <label key={value} className={`rep-pago-opcion${sel ? " rep-pago-opcion--sel" : ""}`} onClick={() => setMetodoPago(value)}>
                        <span className="rep-pago-opcion__icon">{icon}</span>
                        <span className="rep-pago-opcion__label">{label}</span>
                        <div className={`rep-pago-radio${sel ? " rep-pago-radio--sel" : ""}`} />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4 pt-0 gap-2">
                <button className="rep-btn-modal-cancel" onClick={() => setModalEntrega(null)}>Cancelar</button>
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
