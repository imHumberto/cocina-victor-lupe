import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import { useSocketEvent } from "../../../hooks/useSocket";
import { hasCart, clearCart } from "../../../utils/cart";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

function saludo() {
  const h = dayjs().hour();
  if (h < 12) return "¡Buenos días";
  if (h < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

function ItemMenu({ icono, label, valor }) {
  if (!valor) return null;
  return (
    <div className="d-flex align-items-center gap-3 py-2 border-bottom">
      <span style={{ fontSize: "1.3rem" }}>{icono}</span>
      <div>
        <div className="text-muted" style={{ fontSize: "0.75rem" }}>{label}</div>
        <div className="fw-semibold small">{valor}</div>
      </div>
    </div>
  );
}

const PASOS = [
  { estado: "pendiente",      icon: "📋", label: "Recibido" },
  { estado: "confirmado",     icon: "✅", label: "Confirmado" },
  { estado: "en_preparacion", icon: "👨‍🍳", label: "Preparando" },
  { estado: "en_camino",      icon: "🛵", label: "En camino" },
  { estado: "entregado",      icon: "🎉", label: "Entregado" },
];

function TrackerPedido({ pedido, onDismiss }) {
  if (pedido.estado === "rechazado") {
    return (
      <div className="rounded-3 p-4 mb-4" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "1.5rem" }}>❌</span>
            <span className="fw-bold text-danger">Pedido rechazado</span>
          </div>
          <button className="btn btn-sm btn-outline-danger rounded-pill" onClick={onDismiss}>
            Entendido
          </button>
        </div>
        {pedido.motivo_rechazo && (
          <p className="small text-muted mb-0">Motivo: <strong>{pedido.motivo_rechazo}</strong></p>
        )}
      </div>
    );
  }

  if (pedido.estado === "entregado") {
    return (
      <div className="rounded-3 p-4 mb-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: "1.5rem" }} />
            <span className="fw-bold text-success">¡Pedido entregado!</span>
          </div>
          <button className="btn btn-sm btn-outline-success rounded-pill" onClick={onDismiss}>
            Listo
          </button>
        </div>
        <p className="small text-muted mb-0">Buen provecho 🙌 Esperamos verte mañana.</p>
      </div>
    );
  }

  const idxActual = PASOS.findIndex(p => p.estado === pedido.estado);

  return (
    <div className="rounded-3 p-4 mb-4 bg-white border">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <span className="fw-bold">Tu pedido de hoy</span>
          <div className="text-muted small">Entrega a las {pedido.hora_entrega}</div>
        </div>
        <span style={{ fontSize: "1.8rem" }}>{PASOS[idxActual]?.icon ?? "📋"}</span>
      </div>

      {/* Barra de progreso */}
      <div className="position-relative mb-3">
        <div style={{ height: 4, background: "#f0f0f0", borderRadius: 2 }}>
          <div style={{
            height: 4, borderRadius: 2, background: "#ED4137",
            width: `${Math.min(100, (idxActual / (PASOS.length - 1)) * 100)}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
        <div className="d-flex justify-content-between mt-2">
          {PASOS.map((p, i) => (
            <div key={p.estado} className="text-center" style={{ flex: 1 }}>
              <div
                className="rounded-circle mx-auto mb-1 d-flex align-items-center justify-content-center"
                style={{
                  width: 28, height: 28,
                  background: i <= idxActual ? "#ED4137" : "#f0f0f0",
                  fontSize: "0.75rem",
                }}
              >
                {i <= idxActual
                  ? <span style={{ fontSize: "0.85rem" }}>{p.icon}</span>
                  : <span style={{ color: "#ccc", fontSize: "0.7rem" }}>●</span>
                }
              </div>
              <div style={{ fontSize: "0.65rem", color: i <= idxActual ? "#ED4137" : "#bbb", fontWeight: i === idxActual ? 700 : 400 }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-3">
        <span className="fw-semibold" style={{ color: "#ED4137" }}>{PASOS[idxActual]?.label}</span>
      </div>
    </div>
  );
}

export default function InicioPage() {
  const { user } = useAuthStore();
  const [dia, setDia] = useState(null);
  const [pedidoHoy, setPedidoHoy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [carritoGuardado, setCarritoGuardado] = useState(false);
  const navigate = useNavigate();

  const nombre = user?.nombre?.split(" ")[0] ?? "";
  const hoy = dayjs();
  const esFinDeSemana = hoy.day() === 0 || hoy.day() === 6;
  const puedeOrdenar = !esFinDeSemana; // TODO: descomentar para producción
  // const puedeOrdenar = !esFinDeSemana && (hoy.hour() * 60 + hoy.minute()) < (15 * 60 + 40);

  const DISMISS_KEY = "pedido_dismissed";

  const isDismissed = (pedido) => {
    try {
      const data = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
      return data[pedido.id] === pedido.estado;
    } catch { return false; }
  };

  const dismissPedido = (pedido) => {
    try {
      const data = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
      data[pedido.id] = pedido.estado;
      localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
    } catch {}
    setPedidoHoy(null);
  };

  useEffect(() => {
    if (esFinDeSemana) { setLoading(false); return; }
    Promise.all([
      api.get("/menu/dia-hoy").catch(() => null),
      api.get("/pedidos/mis-pedidos").catch(() => ({ data: [] })),
    ]).then(([diaRes, pedRes]) => {
      setDia(diaRes?.data ?? null);
      const pedidos = pedRes?.data ?? [];
      const hoyStr = hoy.format("YYYY-MM-DD");
      const pedidoHoyEncontrado = pedidos.find((p) => p.created_at?.startsWith(hoyStr) && p.estado !== "cancelado") ?? null;
      // No mostrar si ya fue descartado con ese estado
      if (pedidoHoyEncontrado && isDismissed(pedidoHoyEncontrado)) {
        setPedidoHoy(null);
      } else {
        setPedidoHoy(pedidoHoyEncontrado);
      }
      // Si ya hay un pedido hoy, el carrito es obsoleto — limpiar
      if (pedidoHoyEncontrado) {
        clearCart(user.id);
        setCarritoGuardado(false);
      } else {
        setCarritoGuardado(hasCart(user.id));
      }
    }).finally(() => setLoading(false));
  }, []);

  const handlePedidoActualizado = useCallback((p) => {
    setPedidoHoy((prev) => {
      if (!prev) return prev;
      return prev.id === p.id ? p : prev;
    });
    // Si el pedido fue cancelado o rechazado remotamente, limpiar el carrito
    if (["cancelado", "rechazado"].includes(p.estado)) {
      clearCart(user.id);
      setCarritoGuardado(false);
    }
  }, [user.id]);
  useSocketEvent("pedido_actualizado", handlePedidoActualizado);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
      <div className="spinner-border text-brand" />
    </div>
  );

  return (
    <div className="p-4" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Saludo */}
      <div className="mb-4">
        <h1 className="fw-bold mb-0" style={{ fontSize: "1.8rem" }}>
          {saludo()},<br />{nombre}!
        </h1>
        <p className="text-muted small mb-0 mt-1">
          {hoy.format("dddd D [de] MMMM")}
        </p>
      </div>

      {/* Fin de semana */}
      {esFinDeSemana && (
        <div className="rounded-3 p-4 text-center" style={{ background: "#f5f5f5" }}>
          <span style={{ fontSize: "2.5rem" }}>🛋️</span>
          <p className="fw-semibold mt-2 mb-0">Hoy no hay servicio</p>
          <p className="text-muted small">Descansa, nos vemos el lunes</p>
        </div>
      )}

      {/* Banner: carrito en progreso — solo si no hay pedido activo/cancelado hoy */}
      {!esFinDeSemana && carritoGuardado && !pedidoHoy && !loading && (
        <div className="rounded-3 p-3 mb-4 d-flex align-items-center gap-3" style={{ background: "#fff5f5", border: "1px solid #fecaca" }}>
          <i className="bi bi-bag text-brand" style={{ fontSize: "1.4rem", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fw-semibold small">Tienes un pedido en progreso</div>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>Continúa donde lo dejaste</div>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary rounded-pill"
              onClick={() => { clearCart(user.id); setCarritoGuardado(false); }}
            >
              Descartar
            </button>
            <button
              className="btn btn-sm btn-brand rounded-pill"
              onClick={() => navigate("/cliente/ordenar")}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Pedido ya hecho hoy */}
      {!esFinDeSemana && pedidoHoy && <TrackerPedido pedido={pedidoHoy} onDismiss={() => dismissPedido(pedidoHoy)} />}

      {/* Menú del día */}
      {!esFinDeSemana && dia && (
        <div>
          <h2 className="fw-bold mb-3" style={{ fontSize: "1.1rem" }}>El menú de hoy</h2>
          <div className="rounded-3 p-3 bg-white border">
            <ItemMenu icono="🥗" label="Entrada" valor={dia.entrada?.nombre} />
            <ItemMenu icono="🍽️" label="Plato fuerte" valor={dia.platos_fuertes?.map(p => p.nombre).join(" / ")} />
            {dia.alternativa_plato_disponible && dia.alternativas_plato?.length > 0 && (
              <ItemMenu icono="🔄" label={`Alternativa (+$${dia.alternativa_plato_costo_extra})`} valor={dia.alternativas_plato.map(p => p.nombre).join(" o ")} />
            )}
            <ItemMenu icono="🥦" label="Guarnición" valor={dia.guarniciones?.map(p => p.nombre).join(" / ")} />
            <ItemMenu icono="🥤" label="Bebida" valor={dia.bebida?.nombre} />
            {dia.alternativa_bebida_disponible && dia.alternativas_bebida?.length > 0 && (
              <ItemMenu icono="🥤" label={`Alt. bebida (+$${dia.alternativa_bebida_costo_extra})`} valor={dia.alternativas_bebida.map(p => p.nombre).join(" o ")} />
            )}
            <ItemMenu icono="🍮" label="Postre" valor={dia.postre?.nombre} />
          </div>

          {/* Botón ordenar con contador */}
          {!pedidoHoy && puedeOrdenar && (
            <div className="mt-4">
              {/* Contador */}
              <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                <span className="fw-semibold">¿Cuántas comidas?</span>
                <div className="d-flex align-items-center gap-3">
                  <button
                    className="btn rounded-circle fw-bold d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, background: cantidad <= 1 ? "#f0f0f0" : "#ED4137", color: cantidad <= 1 ? "#aaa" : "#fff", border: "none", fontSize: "1.2rem" }}
                    onClick={() => setCantidad(c => Math.max(1, c - 1))}
                    disabled={cantidad <= 1}
                  >−</button>
                  <span className="fw-bold fs-5">{cantidad}</span>
                  <button
                    className="btn rounded-circle fw-bold d-flex align-items-center justify-content-center"
                    style={{ width: 36, height: 36, background: cantidad >= 4 ? "#f0f0f0" : "#ED4137", color: cantidad >= 4 ? "#aaa" : "#fff", border: "none", fontSize: "1.2rem" }}
                    onClick={() => setCantidad(c => Math.min(4, c + 1))}
                    disabled={cantidad >= 4}
                  >+</button>
                </div>
              </div>
              <button
                className="btn btn-brand w-100 py-3 fw-bold rounded-3"
                style={{ fontSize: "1rem" }}
                onClick={() => navigate("/cliente/ordenar", { state: { cantidad } })}
              >
                Ordenar {cantidad > 1 ? `${cantidad} comidas` : "mi comida"} · ${130 * cantidad}
              </button>
            </div>
          )}
          {!pedidoHoy && !puedeOrdenar && (
            <p className="text-center text-muted small mt-4">
              El tiempo para ordenar hoy ya pasó (límite 3:40 PM)
            </p>
          )}
        </div>
      )}

      {/* Sin menú */}
      {!esFinDeSemana && !dia && (
        <div className="text-center py-5 text-muted">
          <span style={{ fontSize: "2.5rem" }}>🍽️</span>
          <p className="mt-2">No hay menú publicado para hoy</p>
        </div>
      )}
    </div>
  );
}
