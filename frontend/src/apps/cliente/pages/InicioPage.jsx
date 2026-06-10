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
            height: 4, borderRadius: 2, background: "var(--color-brand)",
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
                  background: i <= idxActual ? "var(--color-brand)" : "#e5e7eb",
                  fontSize: "0.75rem",
                }}
              >
                {i <= idxActual
                  ? <span style={{ fontSize: "0.85rem" }}>{p.icon}</span>
                  : <span style={{ color: "#ccc", fontSize: "0.7rem" }}>●</span>
                }
              </div>
              <div style={{ fontSize: "0.65rem", color: i <= idxActual ? "var(--color-brand)" : "#bbb", fontWeight: i === idxActual ? 700 : 400 }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center mt-3">
        <span className="fw-semibold" style={{ color: "var(--color-brand)" }}>{PASOS[idxActual]?.label}</span>
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
  const [pedidosPausados, setPedidosPausados] = useState(false);
  const navigate = useNavigate();

  const nombre = user?.nombre?.split(" ")[0] ?? "";
  const hoy = dayjs();
  const esFinDeSemana = hoy.day() === 0 || hoy.day() === 6;
  const puedeOrdenar = !esFinDeSemana && !pedidosPausados; // TODO: descomentar horario para producción
  // const puedeOrdenar = !esFinDeSemana && !pedidosPausados && (hoy.hour() * 60 + hoy.minute()) < (15 * 60 + 40);

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
    api.get("/config/estado").then(({ data }) => setPedidosPausados(data.pedidos_pausados)).catch(() => {});
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
      <div className="spinner-border" style={{ color: "var(--color-brand)" }} />
    </div>
  );

  // Descripción corta del menú para mostrar bajo el platillo
  const descripcionMenu = dia ? [
    dia.entrada?.nombre,
    dia.guarniciones?.map(g => g.nombre).join(", "),
    dia.bebida?.nombre,
    dia.postre?.nombre,
  ].filter(Boolean).join(", ") : "";

  const platilloDia = dia?.platos_fuertes?.[0]?.nombre ?? "";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 20px 100px" }}>

      {/* Saludo */}
      <h1 style={{
        fontWeight: 900, fontSize: "1.9rem", lineHeight: 1.15,
        textTransform: "uppercase", color: "var(--color-navy)",
        letterSpacing: "0.02em", marginBottom: 20,
      }}>
        {saludo()},<br />{nombre}
      </h1>

      {/* Banner: pedidos pausados */}
      {pedidosPausados && !esFinDeSemana && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <i className="bi bi-pause-circle-fill" style={{ fontSize: "1.4rem", color: "#ea580c", flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: "#9a3412", fontSize: "0.9rem" }}>No estamos aceptando pedidos</div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.78rem" }}>Por el momento el servicio está en pausa. Intenta más tarde.</div>
          </div>
        </div>
      )}

      {/* Banner: carrito en progreso */}
      {!esFinDeSemana && carritoGuardado && !pedidoHoy && (
        <div style={{ background: "var(--color-brand-light)", border: "1px solid #a7c4be", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <i className="bi bi-bag" style={{ fontSize: "1.3rem", color: "var(--color-brand)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Tienes un pedido en progreso</div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>Continúa donde lo dejaste</div>
          </div>
          <div className="d-flex gap-2">
            <button
              style={{ border: "1px solid #ccc", background: "transparent", borderRadius: 20, padding: "4px 12px", fontSize: "0.8rem", cursor: "pointer" }}
              onClick={() => { clearCart(user.id); setCarritoGuardado(false); }}
            >Descartar</button>
            <button
              style={{ border: "none", background: "var(--color-brand)", color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
              onClick={() => navigate("/cliente/ordenar")}
            >Continuar</button>
          </div>
        </div>
      )}

      {/* Tracker de pedido */}
      {!esFinDeSemana && pedidoHoy && (
        <TrackerPedido pedido={pedidoHoy} onDismiss={() => dismissPedido(pedidoHoy)} />
      )}

      {/* Fin de semana */}
      {esFinDeSemana && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
          <span style={{ fontSize: "2.5rem" }}>🛋️</span>
          <p style={{ fontWeight: 700, marginTop: 12, marginBottom: 4 }}>Hoy no hay servicio</p>
          <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", margin: 0 }}>Descansa, nos vemos el lunes</p>
        </div>
      )}

      {/* Hero menú del día */}
      {!esFinDeSemana && dia && !pedidoHoy && (
        <>
          {/* Imagen hero */}
          <div style={{
            width: "100%", aspectRatio: "4/3",
            background: "#e0e0e0", borderRadius: 16,
            marginBottom: 16, overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {dia.imagen_url
              ? <img src={dia.imagen_url} alt={platilloDia} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#aaa", fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>IMG Placeholder</span>
            }
          </div>

          {/* Info platillo */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-brand)", marginBottom: 4 }}>
              Platillo del día
            </div>
            <h2 style={{ fontWeight: 900, fontSize: "1.5rem", textTransform: "uppercase", color: "var(--color-navy)", marginBottom: 4, letterSpacing: "0.02em" }}>
              {platilloDia}
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: "0.88rem", margin: 0 }}>
              {descripcionMenu}
            </p>
          </div>

          {/* Botón + contador */}
          {puedeOrdenar && (
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <button
                style={{
                  flex: 1, padding: "14px 0",
                  background: "var(--color-brand)", color: "#fff",
                  border: "none", borderRadius: 12,
                  fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                }}
                onClick={() => navigate("/cliente/ordenar", { state: { cantidad } })}
              >
                Ordenar · ${130 * cantidad}
              </button>
              <button
                style={{ width: 48, background: "#fff", border: "1.5px solid #d1d5db", borderRadius: 12, fontSize: "1.2rem", fontWeight: 700, cursor: "pointer", color: cantidad <= 1 ? "#ccc" : "var(--color-navy)" }}
                onClick={() => setCantidad(c => Math.max(1, c - 1))}
                disabled={cantidad <= 1}
              >−</button>
              <span style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-navy)" }}>
                {cantidad}
              </span>
              <button
                style={{ width: 48, background: cantidad >= 4 ? "#e5e7eb" : "var(--color-brand)", border: "none", borderRadius: 12, fontSize: "1.2rem", fontWeight: 700, cursor: "pointer", color: cantidad >= 4 ? "#aaa" : "#fff" }}
                onClick={() => setCantidad(c => Math.min(4, c + 1))}
                disabled={cantidad >= 4}
              >+</button>
            </div>
          )}
          {!puedeOrdenar && !pedidosPausados && (
            <p style={{ textAlign: "center", color: "var(--color-muted)", fontSize: "0.85rem", marginTop: 16 }}>
              El tiempo para ordenar hoy ya pasó (límite 3:40 PM)
            </p>
          )}
        </>
      )}

      {/* Sin menú */}
      {!esFinDeSemana && !dia && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-muted)" }}>
          <span style={{ fontSize: "2.5rem" }}>🍽️</span>
          <p style={{ marginTop: 12 }}>No hay menú publicado para hoy</p>
        </div>
      )}
    </div>
  );
}
