import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../../services/api";
import EstadoBadge from "../../../components/shared/EstadoBadge";
import { useSocketEvent } from "../../../hooks/useSocket";
import { getSocket } from "../../../services/socket";
import { formatTelefono } from "../../../utils/format";

// ── Constantes ──────────────────────────────────────────────────────────────

// ⏱️ Minutos de anticipación para la alerta de entrega próxima.
// Cambia este número para ajustar cuándo se dispara la notificación.
const MINUTOS_ALERTA_ENTREGA = 15;

// Estados que se consideran "activos" para la alerta de entrega
const ESTADOS_ALERTA = ["pendiente", "confirmado", "en_preparacion"];

const TABS = [
  { key: "pendiente",      label: "Nuevos",         estados: ["pendiente"] },
  { key: "en_preparacion", label: "En preparación", estados: ["confirmado", "en_preparacion"] },
  { key: "listo",          label: "Listo",           estados: ["listo"] },
  { key: "en_camino",      label: "Enviado",         estados: ["en_camino"] },
  { key: "cerrado",        label: "Finalizado",      estados: ["entregado", "rechazado", "cancelado"] },
];

const MOTIVOS_RAPIDOS = [
  "Se acabó el plato del día",
  "No hay suficiente stock",
  "Pedido fuera de horario",
  "Problema con el pago",
];

// ── Helpers de tiempo ────────────────────────────────────────────────────────

function horaEntregaSeconds(horaStr) {
  if (!horaStr) return null;
  const [h, m] = horaStr.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return (target - now) / 1000; // positivo = tiempo restante, negativo = demorado
}

function secondsToMMSS(sec) {
  const abs = Math.abs(Math.round(sec));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function minutesSince(isoStr) {
  if (!isoStr) return 0;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
}

// ── Badge de tiempo en cards ─────────────────────────────────────────────────

function TimeBadge({ pedido }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const { estado, hora_entrega, created_at } = pedido;

  if (estado === "pendiente") {
    const mins = minutesSince(created_at);
    if (mins < 3) return <Badge color="#2563eb" text="Nuevo" />;
    return <Badge color="#f59e0b" text={`Recibido +${mins}m`} />;
  }
  if (estado === "confirmado" || estado === "en_preparacion") {
    const rem = horaEntregaSeconds(hora_entrega);
    if (rem === null) return null;
    return rem >= 0
      ? <Badge color="#22c55e" text="En tiempo" />
      : <Badge color="#ef4444" text="Demorado" />;
  }
  if (estado === "listo") return <Badge color="#3b82f6" text="Listo" />;
  if (estado === "en_camino") return <Badge color="#ED4137" text="En camino" />;
  if (estado === "entregado") return <Badge color="#10b981" text="Entregado" />;
  if (estado === "rechazado") return <Badge color="#ef4444" text="Rechazado" />;
  if (estado === "cancelado") return <Badge color="#6b7280" text="Cancelado" />;
  return null;
}

function Badge({ color, text }) {
  return (
    <span className="rounded-pill px-2 py-1 fw-semibold" style={{
      background: color, color: "#fff", fontSize: "0.7rem", whiteSpace: "nowrap",
    }}>{text}</span>
  );
}

// ── Timer circular ────────────────────────────────────────────────────────────

function TimerWidget({ pedido }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const R = 24;
  const CIRCUM = 2 * Math.PI * R;

  let color = "#ef4444";
  let progress = 0;
  let titulo = "";
  let tiempo = "";
  let subtitulo = "";

  const { estado, hora_entrega, created_at, updated_at } = pedido;

  if (estado === "pendiente") {
    const elapsed = (Date.now() - new Date(created_at).getTime()) / 1000;
    const window = 1800; // 30 min = una vuelta completa
    progress = Math.min(elapsed / window, 1);
    color = elapsed < 180 ? "#22c55e" : "#ef4444"; // verde 0-3 min, rojo después
    titulo = "Nuevo pedido entrante";
    tiempo = secondsToMMSS(elapsed);
    subtitulo = "El pedido no se ha confirmado";
  } else if (estado === "confirmado" || estado === "en_preparacion") {
    const rem = horaEntregaSeconds(hora_entrega);
    if (rem === null) return null;
    if (rem >= 0) {
      const totalWindow = 7200; // 2 horas como ventana máxima
      progress = Math.min(1 - rem / totalWindow, 1);
      color = "#22c55e";
      titulo = "En tiempo";
      tiempo = secondsToMMSS(rem);
      subtitulo = "min para entrega";
    } else {
      progress = 1;
      color = "#ef4444";
      titulo = "Demorado";
      tiempo = secondsToMMSS(rem);
      subtitulo = "El pedido se encuentra demorado";
    }
  } else if (estado === "listo") {
    const base = updated_at || created_at;
    const elapsed = base ? (Date.now() - new Date(base).getTime()) / 1000 : 0;
    const window = 900; // 15 min
    progress = Math.min(elapsed / window, 1);
    color = elapsed > 600 ? "#f59e0b" : "#22c55e";
    titulo = "Listo para repartir";
    tiempo = secondsToMMSS(elapsed);
    subtitulo = "Estamos esperando un repartidor";
  } else if (estado === "en_camino") {
    const base = updated_at || created_at;
    const elapsed = base ? (Date.now() - new Date(base).getTime()) / 1000 : 0;
    progress = Math.min(elapsed / 3600, 1);
    color = "#ED4137";
    titulo = "En camino";
    tiempo = secondsToMMSS(elapsed);
    subtitulo = `Con ${pedido.repartidor?.nombre ?? "repartidor"}`;
  } else if (estado === "entregado") {
    progress = 1;
    color = "#10b981";
    titulo = "Entregado";
    tiempo = "✓";
    subtitulo = pedido.metodo_pago ? `Pagó con ${pedido.metodo_pago}` : "";
  } else {
    return null;
  }

  const offset = CIRCUM * (1 - progress);

  return (
    <div className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3" style={{ background: "#F9FBFC" }}>
      {/* SVG circle */}
      <div style={{ flexShrink: 0 }}>
        <svg width="64" height="64" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r={R} fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <circle
            cx="30" cy="30" r={R} fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={CIRCUM}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
      </div>
      <div>
        <div className="fw-bold small" style={{ color }}>{titulo}</div>
        <div className="fw-bold" style={{ fontSize: "1.6rem", lineHeight: 1, color: color === "#22c55e" ? "#15803d" : color === "#ef4444" ? "#b91c1c" : color }}>{tiempo}</div>
        <div className="text-muted" style={{ fontSize: "0.75rem" }}>{subtitulo}</div>
      </div>
    </div>
  );
}

// ── Card de pedido ────────────────────────────────────────────────────────────

function PedidoCard({ pedido, seleccionado, onClick }) {
  const nombre = pedido.receptor_nombre || pedido.cliente?.nombre || "—";
  const comidas = 1;
  return (
    <div
      onClick={onClick}
      className="rounded-3 p-3 mb-2"
      style={{
        cursor: "pointer",
        border: seleccionado ? "2px solid #1255F0" : "1px solid #e5e7eb",
        background: "#fff",
        boxShadow: seleccionado ? "0 4px 16px rgba(128,159,184,0.20)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Título + badge */}
      <div className="d-flex justify-content-between align-items-start mb-1">
        <span style={{ fontSize: "1.5rem", fontWeight: 600, color: "#17181A", lineHeight: 1.2 }}>Pedido #{pedido.id}</span>
        <TimeBadge pedido={pedido} />
      </div>

      {/* Hora de entrega — pegada al título */}
      <div className="mb-3">
        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#809FB8" }}>Hora de entrega: </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#545454" }}>{pedido.hora_entrega}</span>
      </div>

      {/* Nombre + Comidas + Ver detalles — separados del bloque anterior */}
      <div className="d-flex justify-content-between align-items-end">
        <div>
          <div style={{ lineHeight: 1.6 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#809FB8" }}>Nombre: </span>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#545454" }}>{nombre}</span>
          </div>
          <div style={{ lineHeight: 1.6 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#809FB8" }}>Comidas: </span>
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#545454" }}>{comidas}</span>
          </div>
        </div>
        <button
          className="btn btn-sm rounded-2"
          style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#64748b", border: "none" }}
          onClick={onClick}
        >
          Ver detalles
        </button>
      </div>
    </div>
  );
}

// ── Info box ─────────────────────────────────────────────────────────────────

function InfoBox({ label, value, sub }) {
  return (
    <div className="rounded-3 p-3" style={{ background: "#F9FBFC", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "#809FB8", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 600, color: "#545454", wordBreak: "break-word" }}>{value || "—"}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: "#809FB8" }}>{sub}</div>}
    </div>
  );
}

// ── Mapa estático (link) ─────────────────────────────────────────────────────

function MapaEntrega({ pedido }) {
  const dir = pedido.direccion?.direccion ?? pedido.entrega_direccion ?? pedido.cliente?.direccion_entrega;
  const alias = pedido.direccion?.alias;
  const refs = pedido.direccion?.referencias ?? pedido.entrega_referencias;
  if (!dir) return null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`;
  return (
    <div className="mb-3">
      <div className="fw-semibold mb-2" style={{ fontSize: "0.9rem" }}>Dirección de entrega</div>
      <div className="rounded-3 overflow-hidden border">
        <div className="p-3" style={{ background: "#f8fafc" }}>
          {alias && <div className="fw-semibold small">{alias}</div>}
          <div className="small text-muted">{dir}</div>
          {refs && <div className="small text-muted" style={{ fontSize: "0.75rem" }}>{refs}</div>}
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="d-flex align-items-center justify-content-center gap-2 py-2 text-decoration-none"
          style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: "0.82rem", fontWeight: 600 }}
        >
          <i className="bi bi-map" /> Ver en Google Maps
        </a>
      </div>
    </div>
  );
}

// ── Resumen del pedido ───────────────────────────────────────────────────────

function ResumenPedido({ pedido }) {
  const plato = pedido.plato_elegido === "alternativa" ? "Plato alternativo" : "Plato del día";
  const bebida = pedido.bebida_elegida === "alternativa" ? "Bebida alternativa" : "Bebida del día";
  const txt = { fontSize: "1rem", color: "#545454" };
  const sub = { fontSize: "1rem", fontWeight: 400, color: "#809FB8" };
  const bold = { fontSize: "1rem", fontWeight: 700, color: "#545454" };
  return (
    <div className="mb-3">
      <div className="fw-semibold mb-3" style={{ fontSize: "0.9rem", color: "#17181A" }}>Resumen del pedido</div>
      <div style={{ borderTop: "1px solid #e5e7eb" }}>
        {/* Item principal */}
        <div className="d-flex justify-content-between align-items-center py-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <span style={{ ...txt, fontWeight: 600 }}>1x Comida del Día</span>
        </div>
        {/* Detalle plato */}
        <div className="d-flex justify-content-between align-items-center py-1 px-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <span style={sub}>{plato}</span>
        </div>
        {/* Detalle bebida */}
        <div className="d-flex justify-content-between align-items-center py-1 px-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <span style={sub}>{bebida}</span>
        </div>
        {/* Notas */}
        {pedido.notas && (
          <div className="py-2 px-2" style={{ borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ ...sub, color: "#92400e" }}>📝 {pedido.notas}</span>
          </div>
        )}
        {/* Total / método de pago */}
        <div className="d-flex justify-content-between align-items-center pt-3 mt-1" style={{ borderTop: "2px solid #e5e7eb" }}>
          <span style={bold}>Total</span>
          <span style={{ ...bold, color: "#809FB8", fontWeight: 500, fontSize: "0.9rem" }}>
            {pedido.metodo_pago ? `Pago con ${pedido.metodo_pago}` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Tabs con scroll ──────────────────────────────────────────────────────────

const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

function animateScroll(el, to, animRef) {
  if (animRef.current) cancelAnimationFrame(animRef.current);
  const from = el.scrollLeft;
  const distance = to - from;
  if (Math.abs(distance) < 1) return;
  const duration = Math.min(350 + Math.abs(distance) * 0.25, 650);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    el.scrollLeft = from + distance * easeInOut(t);
    if (t < 1) animRef.current = requestAnimationFrame(step);
  };
  animRef.current = requestAnimationFrame(step);
}

function TabsScroll({ tab, setTab, counts }) {
  const scrollRef = useRef(null);
  const btnRefs = useRef({});
  const animRef = useRef(null);
  const leftBtnRef = useRef(null);
  const rightBtnRef = useRef(null);

  // Muestra u oculta flechas sin causar re-render
  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 4;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (leftBtnRef.current) {
      leftBtnRef.current.style.display = atStart ? "none" : "flex";
    }
    if (rightBtnRef.current) {
      rightBtnRef.current.style.display = atEnd ? "none" : "flex";
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    updateArrows();
    el?.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el?.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  // Al cambiar tab, scroll para que quede visible
  useEffect(() => {
    const el = scrollRef.current;
    const btn = btnRefs.current[tab];
    if (!el || !btn) return;
    const elRect = el.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    // Posición del botón dentro del contenido scrolleable
    const btnLeft = el.scrollLeft + (btnRect.left - elRect.left);
    const btnRight = btnLeft + btn.offsetWidth;
    const visLeft = el.scrollLeft + 8;
    const visRight = el.scrollLeft + el.clientWidth - 8;
    if (btnLeft < visLeft) animateScroll(el, btnLeft - 8, animRef);
    else if (btnRight > visRight) animateScroll(el, btnRight - el.clientWidth + 8, animRef);
  }, [tab]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    animateScroll(el, dir > 0 ? el.scrollWidth : 0, animRef);
  };

  const floatBtn = {
    position: "absolute", top: "50%", transform: "translateY(-60%)",
    width: 24, height: 24, border: "none", borderRadius: "50%",
    background: "rgba(100,116,139,0.75)", color: "#fff",
    fontSize: "0.7rem", cursor: "pointer",
    display: "none", alignItems: "center", justifyContent: "center",
    zIndex: 2, padding: 0,
  };

  return (
    <div style={{ position: "relative", padding: "0 0 10px", flexShrink: 0 }}>
      <div ref={scrollRef} style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            ref={el => btnRefs.current[t.key] = el}
            onClick={() => setTab(t.key)}
            style={{
              height: 44, borderRadius: 10, border: "none",
              flex: "1 0 auto", cursor: "pointer",
              minWidth: 100, padding: "0 16px",
              background: tab === t.key ? "#2563eb" : "#F1F4F9",
              color: tab === t.key ? "#fff" : "#6b7280",
              fontSize: "0.85rem", fontWeight: 600,
              whiteSpace: "nowrap",
              boxShadow: tab === t.key ? "0 1px 4px rgba(37,99,235,0.25)" : "none",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {t.label}{counts[t.key] > 0 ? ` (${counts[t.key]})` : ""}
          </button>
        ))}
      </div>

      <button ref={leftBtnRef} onClick={() => scroll(-1)} style={{ ...floatBtn, left: 4 }}>
        <i className="bi bi-chevron-left" />
      </button>
      <button ref={rightBtnRef} onClick={() => scroll(1)} style={{ ...floatBtn, right: 4 }}>
        <i className="bi bi-chevron-right" />
      </button>
    </div>
  );
}

// ── Chips de método de pago ──────────────────────────────────────────────────

const PAGO_CHIP = {
  efectivo:      { label: "Efectivo",      bg: "#dbeafe", color: "#1d4ed8" },
  tarjeta:       { label: "Tarjeta",       bg: "#ede9fe", color: "#6d28d9" },
  transferencia: { label: "Transferencia", bg: "#e0e7ff", color: "#4338ca" },
};

function PagoBadge({ metodo }) {
  const cfg = PAGO_CHIP[metodo];
  if (!cfg) return null;
  return (
    <span className="rounded-pill px-2 py-1 fw-semibold" style={{
      background: cfg.bg, color: cfg.color, fontSize: "0.7rem", whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );
}

// ── Card finalizado ──────────────────────────────────────────────────────────

function PedidoCardFinalizado({ pedido, seleccionado, onClick }) {
  const fecha = pedido.created_at
    ? new Date(pedido.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
    : "—";
  return (
    <div
      onClick={onClick}
      className="rounded-3 p-3 mb-2"
      style={{
        cursor: "pointer",
        border: seleccionado ? "2px solid #1255F0" : "1px solid #e5e7eb",
        background: "#fff",
        boxShadow: seleccionado ? "0 4px 16px rgba(128,159,184,0.20)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <div className="d-flex justify-content-between align-items-start mb-1">
        <span style={{ fontSize: "1.5rem", fontWeight: 600, color: "#17181A", lineHeight: 1.2 }}>
          Pedido #{pedido.id}
        </span>
        <button
          className="btn btn-sm rounded-2"
          style={{ fontSize: "0.75rem", fontWeight: 700, background: "#f1f5f9", color: "#64748b", border: "none", flexShrink: 0 }}
          onClick={onClick}
        >Ver detalles</button>
      </div>
      <div className="mb-2" style={{ fontSize: "0.78rem", color: "#809FB8" }}>Fecha: {fecha}</div>
      <div className="d-flex gap-2 flex-wrap">
        <EstadoBadge estado={pedido.estado} />
        {pedido.metodo_pago && <PagoBadge metodo={pedido.metodo_pago} />}
      </div>
    </div>
  );
}

// ── Panel filtros (finalizados) ──────────────────────────────────────────────

function FiltroChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-sm rounded-pill px-3 py-1"
      style={{
        background: active ? "#e8edf5" : "transparent",
        color: active ? "#2563eb" : "#6b7280",
        border: "1px solid #e5e7eb",
        fontWeight: active ? 600 : 400,
        fontSize: "0.78rem",
        transition: "all 0.12s",
      }}
    >{label}</button>
  );
}

function FiltrosPanel({ filtros, setFiltros, onClose }) {
  return (
    <div
      className="rounded-3 p-3 mb-2"
      style={{ background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="fw-semibold" style={{ fontSize: "0.9rem" }}>Por fecha</span>
        <button className="btn-close" style={{ fontSize: "0.7rem" }} onClick={onClose} />
      </div>
      <div className="d-flex gap-2 flex-wrap mb-3">
        {["hoy", "ayer", "mes"].map(v => (
          <FiltroChip key={v} label={{ hoy: "Hoy", ayer: "Ayer", mes: "Este mes" }[v]}
            active={filtros.fecha === v} onClick={() => setFiltros(f => ({ ...f, fecha: f.fecha === v ? null : v }))} />
        ))}
      </div>

      <div className="fw-semibold mb-2" style={{ fontSize: "0.9rem" }}>Estado</div>
      <div className="d-flex gap-2 flex-wrap mb-3">
        {[
          { v: "todos",     l: "Todos" },
          { v: "entregado", l: "Entregado" },
          { v: "rechazado", l: "Rechazados" },
        ].map(({ v, l }) => (
          <FiltroChip key={v} label={l} active={filtros.estado === v}
            onClick={() => setFiltros(f => ({ ...f, estado: v }))} />
        ))}
      </div>

      <div className="fw-semibold mb-2" style={{ fontSize: "0.9rem" }}>Método de pago</div>
      <div className="d-flex gap-2 flex-wrap">
        {[
          { v: "todos",        l: "Todos" },
          { v: "efectivo",     l: "Efectivo" },
          { v: "tarjeta",      l: "Tarjeta" },
          { v: "transferencia",l: "Transferencia" },
        ].map(({ v, l }) => (
          <FiltroChip key={v} label={l} active={filtros.pago === v}
            onClick={() => setFiltros(f => ({ ...f, pago: v }))} />
        ))}
      </div>
    </div>
  );
}

// ── Detalle finalizado ───────────────────────────────────────────────────────

function DetalleFinalizado({ pedido: p }) {
  const nombre = p.receptor_nombre || p.cliente?.nombre || "—";
  const telefono = formatTelefono(p.receptor_telefono || p.cliente?.telefono_whatsapp) || "—";
  const direccion = p.direccion?.direccion ?? p.entrega_direccion ?? p.cliente?.direccion_entrega;
  const alias = p.direccion?.alias;
  const refs = p.direccion?.referencias ?? p.entrega_referencias;

  const horaRecibida = p.created_at
    ? new Date(p.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : "—";
  const horaEntregada = p.estado === "entregado" && p.updated_at
    ? new Date(p.updated_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : null;

  const plato = p.plato_elegido === "alternativa" ? "Plato alternativo" : "Comida del día";
  const bebida = p.bebida_elegida === "alternativa" ? "Bebida alternativa" : "Bebida del día";

  const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f3f4f6" };
  const labelStyle = { fontSize: "0.9rem", color: "#545454" };
  const valueStyle = { fontSize: "0.9rem", fontWeight: 600, color: "#17181A" };
  const subStyle = { fontSize: "0.9rem", color: "#809FB8" };

  return (
    <>
      {/* Título */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <h3 className="fw-bold mb-0" style={{ fontSize: "1.4rem", color: "#17181A" }}>Pedido #{p.id}</h3>
        <EstadoBadge estado={p.estado} />
        {p.metodo_pago && <PagoBadge metodo={p.metodo_pago} />}
      </div>

      {/* Info boxes: recibida / entregada / contacto */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        <InfoBox label="Orden recibida" value={horaRecibida} />
        <InfoBox
          label="Orden entregada"
          value={p.estado === "entregado" ? horaEntregada : "Orden rechazada"}
        />
        <InfoBox label={nombre} value={telefono} />
      </div>

      {/* Dirección */}
      {direccion && (
        <div className="mb-4">
          <div className="fw-semibold mb-1" style={{ fontSize: "0.95rem", color: "#17181A" }}>Dirección de entrega</div>
          {alias && <div className="fw-semibold small" style={{ color: "#17181A" }}>{alias}</div>}
          <div className="small" style={{ color: "#809FB8" }}>{direccion}</div>
          {refs && <div className="small" style={{ color: "#9ca3af", fontSize: "0.75rem" }}>{refs}</div>}
        </div>
      )}

      {/* Resumen */}
      <div className="fw-semibold mb-2" style={{ fontSize: "0.95rem", color: "#17181A" }}>Resumen del pedido</div>
      <div style={{ borderTop: "1px solid #e5e7eb" }}>

        <div style={rowStyle}>
          <span style={labelStyle}>Hora de entrega solicitada</span>
          <span style={valueStyle}>{p.hora_entrega}</span>
        </div>

        {p.repartidor && (
          <div style={rowStyle}>
            <span style={labelStyle}>Entregado por</span>
            <span style={valueStyle}>{p.repartidor.nombre}</span>
          </div>
        )}

        {/* Ítem */}
        <div style={{ ...rowStyle, borderBottom: "none", paddingBottom: 4 }}>
          <span style={{ ...labelStyle, fontWeight: 600 }}>1x Comida del Día</span>
        </div>
        <div style={{ ...rowStyle, paddingTop: 2 }}>
          <span style={subStyle}>{plato}</span>
        </div>
        <div style={rowStyle}>
          <span style={subStyle}>{bebida}</span>
        </div>
        {p.notas && (
          <div style={rowStyle}>
            <span style={{ ...subStyle, fontStyle: "italic" }}>*{p.notas}*</span>
          </div>
        )}

        {/* Total */}
        <div style={{ ...rowStyle, borderTop: "2px solid #e5e7eb", borderBottom: "none", marginTop: 4 }}>
          <span style={{ ...valueStyle, fontSize: "1rem" }}>Total</span>
          <span style={{ ...valueStyle, fontSize: "1rem" }}>—</span>
        </div>

        {/* Forma de pago o motivo de rechazo */}
        {p.estado === "entregado" && p.metodo_pago && (
          <div style={rowStyle}>
            <span style={labelStyle}>Forma de pago</span>
            <span style={valueStyle}>{p.metodo_pago.charAt(0).toUpperCase() + p.metodo_pago.slice(1)}</span>
          </div>
        )}
        {p.estado === "rechazado" && p.motivo_rechazo && (
          <div style={rowStyle}>
            <span style={labelStyle}>Motivo del rechazo</span>
            <span style={{ ...valueStyle, fontStyle: "italic", color: "#ef4444" }}>*{p.motivo_rechazo}*</span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Audio ────────────────────────────────────────────────────────────────────

function beep(tipo = "nuevo") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const secuencias = tipo === "nuevo"
      ? [{ freq: 880, t: 0 }, { freq: 1100, t: 0.15 }, { freq: 880, t: 0.30 }]
      : [{ freq: 660, t: 0 }, { freq: 440, t: 0.20 }, { freq: 660, t: 0.40 }, { freq: 440, t: 0.60 }];

    secuencias.forEach(({ freq, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.13);
    });
  } catch (_) {}
}

// ── Banner de notificación ───────────────────────────────────────────────────

function NotifBanner({ notifs, onDismiss }) {
  if (!notifs.length) return null;
  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      maxWidth: 380,
    }}>
      {notifs.map(n => (
        <div key={n.id} style={{
          background: n.tipo === "nuevo" ? "#fff" : "#fffbeb",
          border: `2px solid ${n.tipo === "nuevo" ? "#ED4137" : "#f59e0b"}`,
          borderRadius: 14,
          padding: "14px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
          display: "flex", alignItems: "flex-start", gap: 12,
          animation: "slideInRight 0.25s ease",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: n.tipo === "nuevo" ? "#fef2f2" : "#fef3c7",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem",
          }}>
            {n.tipo === "nuevo" ? "🛎️" : "⏰"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#17181A", marginBottom: 2 }}>
              {n.titulo}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#545454" }}>{n.cuerpo}</div>
          </div>
          <button
            onClick={() => onDismiss(n.id)}
            style={{ border: "none", background: "transparent", color: "#9ca3af", cursor: "pointer", padding: 0, fontSize: "1.1rem", lineHeight: 1 }}
          >×</button>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function PedidosAdminPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pendiente");
  const [seleccionado, setSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [repartidores, setRepartidores] = useState([]);

  // Filtros finalizados
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [filtros, setFiltros] = useState({ fecha: "hoy", estado: "todos", pago: "todos" });

  // Modales
  const [modalRechazo, setModalRechazo] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [modalEstado, setModalEstado] = useState(null);
  const [modalRepartidor, setModalRepartidor] = useState(null);

  // Notificaciones admin
  const [notifs, setNotifs] = useState([]);
  const alertadosRef = useRef(new Set()); // IDs de pedidos ya alertados por entrega próxima

  const pushNotif = useCallback((tipo, titulo, cuerpo) => {
    const id = Date.now() + Math.random();
    setNotifs(prev => [...prev, { id, tipo, titulo, cuerpo }]);
    beep(tipo);
    // Auto-dismiss a los 12 segundos
    setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 12000);
  }, []);

  const dismissNotif = useCallback((id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  // Pausar pedidos
  const [pausado, setPausado] = useState(false);
  const [togglingPausa, setTogglingPausa] = useState(false);
  const [modalPausa, setModalPausa] = useState(false);

  const confirmarTogglePausa = () => setModalPausa(true);

  const togglePausa = async () => {
    setTogglingPausa(true);
    setModalPausa(false);
    try {
      const { data } = await api.post("/config/pedidos-pausados", { pausado: !pausado });
      setPausado(data.pedidos_pausados);
    } catch (err) {
      alert(err.response?.data?.error ?? "Error al cambiar estado");
    } finally {
      setTogglingPausa(false);
    }
  };

  const cargar = () => {
    api.get("/admin/pedidos-hoy")
      .then(({ data }) => setPedidos(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get("/admin/repartidores").then(({ data }) => setRepartidores(data)).catch(() => {});
    api.get("/config/estado").then(({ data }) => setPausado(data.pedidos_pausados)).catch(() => {});
    getSocket()?.emit("join_admin");
  }, []);

  const handleActualizado = useCallback((p) => {
    setPedidos(ps => ps.map(x => x.id === p.id ? p : x));
    setSeleccionado(s => s?.id === p.id ? p : s);
  }, []);
  useSocketEvent("pedido_actualizado", handleActualizado);

  // Notificación: pedido nuevo
  const handlePedidoNuevo = useCallback((p) => {
    setPedidos(ps => [p, ...ps]);
    const nombre = p.receptor_nombre || p.cliente?.nombre || "Cliente";
    pushNotif("nuevo", "¡Nuevo pedido!", `${nombre} · ${p.hora_entrega?.slice(0, 5)} hrs`);
  }, [pushNotif]);
  useSocketEvent("pedido_nuevo", handlePedidoNuevo);

  // Alerta: pedido próximo a entrega
  useEffect(() => {
    const intervalo = setInterval(() => {
      setPedidos(ps => {
        ps.forEach(p => {
          if (!ESTADOS_ALERTA.includes(p.estado)) return;
          if (alertadosRef.current.has(p.id)) return;
          if (!p.hora_entrega) return;
          const [h, m] = p.hora_entrega.split(":").map(Number);
          const ahora = new Date();
          const entrega = new Date(ahora);
          entrega.setHours(h, m, 0, 0);
          const diffMin = (entrega - ahora) / 60000;
          if (diffMin > 0 && diffMin <= MINUTOS_ALERTA_ENTREGA) {
            alertadosRef.current.add(p.id);
            const nombre = p.receptor_nombre || p.cliente?.nombre || "Cliente";
            pushNotif(
              "alerta",
              `Entrega en ~${Math.round(diffMin)} min`,
              `Pedido #${p.id} · ${nombre} · ${p.hora_entrega?.slice(0, 5)} hrs`
            );
          }
        });
        return ps; // no muta el estado
      });
    }, 60000); // revisa cada minuto
    return () => clearInterval(intervalo);
  }, [pushNotif]);

  // Counts per tab
  const counts = {};
  TABS.forEach(t => {
    counts[t.key] = pedidos.filter(p => t.estados.includes(p.estado)).length;
  });

  // Filtered list
  const tabActual = TABS.find(t => t.key === tab);

  const esMismaFecha = (isoStr, diasAtras) => {
    if (!isoStr) return false;
    const d = new Date(isoStr);
    const ref = new Date();
    ref.setDate(ref.getDate() - diasAtras);
    return d.toDateString() === ref.toDateString();
  };

  const lista = pedidos
    .filter(p => tabActual.estados.includes(p.estado))
    .filter(p => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return String(p.id).includes(q) ||
        (p.receptor_nombre || p.cliente?.nombre || "").toLowerCase().includes(q);
    })
    .filter(p => {
      if (tab !== "cerrado") return true;
      // filtro fecha
      if (filtros.fecha === "hoy")  return esMismaFecha(p.created_at, 0);
      if (filtros.fecha === "ayer") return esMismaFecha(p.created_at, 1);
      if (filtros.fecha === "mes") {
        const d = new Date(p.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    })
    .filter(p => {
      if (tab !== "cerrado") return true;
      if (filtros.estado !== "todos") return p.estado === filtros.estado;
      return true;
    })
    .filter(p => {
      if (tab !== "cerrado") return true;
      if (filtros.pago !== "todos") return p.metodo_pago === filtros.pago;
      return true;
    })
    .sort((a, b) => a.hora_entrega?.localeCompare(b.hora_entrega));

  // Auto-seleccionar primero al cambiar tab
  useEffect(() => {
    const filtered = pedidos.filter(p => tabActual.estados.includes(p.estado));
    if (filtered.length > 0) {
      setSeleccionado(s => {
        if (s && tabActual.estados.includes(s.estado)) return s;
        return filtered[0];
      });
    } else {
      setSeleccionado(null);
    }
  }, [tab, pedidos]);

  // ── Acciones ──────────────────────────────────────────────────────────────

  const confirmar = async (id) => {
    try {
      const { data } = await api.post(`/admin/pedidos/${id}/confirmar`);
      setPedidos(ps => ps.map(x => x.id === data.id ? data : x));
      setSeleccionado(s => s?.id === data.id ? data : s);
    } catch (err) { alert(err.response?.data?.error ?? "Error"); }
  };

  const rechazar = async () => {
    if (!motivoRechazo.trim()) return;
    try {
      const { data } = await api.post(`/admin/pedidos/${modalRechazo.id}/rechazar`, { motivo: motivoRechazo });
      setPedidos(ps => ps.map(x => x.id === data.id ? data : x));
      setSeleccionado(s => s?.id === data.id ? data : s);
      setModalRechazo(null);
      setMotivoRechazo("");
    } catch (err) { alert(err.response?.data?.error ?? "Error"); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      const { data } = await api.patch(`/admin/pedidos/${id}/estado`, { estado });
      setPedidos(ps => ps.map(x => x.id === data.id ? data : x));
      setSeleccionado(s => s?.id === data.id ? data : s);
      setModalEstado(null);
    } catch (err) { alert(err.response?.data?.error ?? "Error"); }
  };

  const asignarRepartidor = async (pedidoId, repartidorId) => {
    try {
      const { data } = await api.patch(`/admin/pedidos/${pedidoId}/asignar-repartidor`, { repartidor_id: repartidorId });
      setPedidos(ps => ps.map(x => x.id === data.id ? data : x));
      setSeleccionado(s => s?.id === data.id ? data : s);
      setModalRepartidor(null);
    } catch (err) { alert(err.response?.data?.error ?? "Error"); }
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

  // ── Botones contextuales por estado ──────────────────────────────────────

  function AccionesPanel({ p }) {
    const btnBase = { border: "none", borderRadius: 10, height: 50, fontWeight: 600, fontSize: "1rem" };
    if (p.estado === "pendiente") return (
      <div className="d-flex gap-2">
        <button
          className="btn flex-fill"
          style={{ ...btnBase, background: "#dcfce7", color: "#15803d" }}
          onClick={() => confirmar(p.id)}
        >Aceptar</button>
        <button
          className="btn flex-fill"
          style={{ ...btnBase, background: "#ef4444", color: "#fff" }}
          onClick={() => { setModalRechazo(p); setMotivoRechazo(""); }}
        >Rechazar</button>
      </div>
    );

    if (p.estado === "confirmado") return (
      <div className="d-flex gap-2">
        <button
          className="btn flex-fill"
          style={{ ...btnBase, background: "#dcfce7", color: "#15803d" }}
          onClick={() => setModalEstado({ pedido: p, estado: "en_preparacion" })}
        ><i className="bi bi-fire me-1" />En preparación</button>
        <button
          className="btn"
          style={{ ...btnBase, background: "#fef2f2", color: "#ef4444", padding: "0 20px" }}
          onClick={() => setModalEstado({ pedido: p, estado: "cancelado" })}
        >Cancelar</button>
      </div>
    );

    if (p.estado === "en_preparacion") return (
      <div className="d-flex gap-2">
        <button
          className="btn flex-fill"
          style={{ ...btnBase, background: "#dcfce7", color: "#15803d" }}
          onClick={() => setModalEstado({ pedido: p, estado: "listo" })}
        ><i className="bi bi-bag-check me-1" />Pedido listo</button>
        <button
          className="btn"
          style={{ ...btnBase, background: "#fef2f2", color: "#ef4444", padding: "0 20px" }}
          onClick={() => setModalEstado({ pedido: p, estado: "cancelado" })}
        >Cancelar</button>
      </div>
    );

    if (p.estado === "listo") return (
      <div className="d-flex flex-column gap-2">
        <button
          className="btn"
          style={{ ...btnBase, background: "#eff6ff", color: "#1d4ed8" }}
          onClick={() => setModalRepartidor(p)}
        ><i className="bi bi-person-check me-1" />Asignar repartidor</button>
        <button
          className="btn"
          style={{ ...btnBase, background: "#dcfce7", color: "#15803d" }}
          onClick={() => setModalEstado({ pedido: p, estado: "entregado" })}
        ><i className="bi bi-check-circle me-1" />Marcar entregado</button>
      </div>
    );

    if (p.estado === "en_camino") return (
      <div className="d-flex gap-2">
        <button
          className="btn flex-fill"
          style={{ ...btnBase, background: "#dcfce7", color: "#15803d" }}
          onClick={() => setModalEstado({ pedido: p, estado: "entregado" })}
        ><i className="bi bi-check-circle me-1" />Marcar entregado</button>
      </div>
    );

    return null;
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
      <div className="spinner-border text-brand" />
    </div>
  );

  const p = seleccionado;
  const nombre = p ? (p.receptor_nombre || p.cliente?.nombre) : null;
  const telefono = p ? formatTelefono(p.receptor_telefono || p.cliente?.telefono_whatsapp) : null;
  const direccion = p ? (p.direccion?.direccion ?? p.entrega_direccion ?? p.cliente?.direccion_entrega) : null;

  return (
    <div style={{ display: "flex", height: "100%", gap: 16, padding: 16, overflow: "hidden" }}>

      {/* ── Panel izquierdo ── */}
      <div style={{ width: 360, minWidth: 360, display: "flex", flexDirection: "column", background: "transparent", overflow: "hidden" }}>

        {/* Título + buscador */}
        <div style={{ padding: "20px 16px 12px", flexShrink: 0 }}>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="fw-bold mb-0" style={{ fontSize: "1.4rem" }}>Pedidos</h2>
            <button
              onClick={confirmarTogglePausa}
              disabled={togglingPausa}
              title={pausado ? "Reanudar pedidos" : "Pausar nuevos pedidos"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                border: "none", borderRadius: 20,
                padding: "5px 12px",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                background: pausado ? "#fef2f2" : "#f0fdf4",
                color: pausado ? "#dc2626" : "#16a34a",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              <i className={`bi ${pausado ? "bi-pause-circle-fill" : "bi-play-circle-fill"}`} style={{ fontSize: "1rem" }} />
              {togglingPausa ? "…" : pausado ? "Pausado" : "Activo"}
            </button>
          </div>
          {/* 🧪 BOTONES DE PRUEBA — quitar antes de producción */}
          <div className="d-flex gap-2 mb-3 p-2 rounded-2" style={{ background: "#fafafa", border: "1px dashed #d1d5db" }}>
            <span style={{ fontSize: "0.7rem", color: "#9ca3af", alignSelf: "center", whiteSpace: "nowrap" }}>🧪 test:</span>
            <button
              className="btn btn-sm"
              style={{ fontSize: "0.72rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8 }}
              onClick={() => pushNotif("nuevo", "¡Nuevo pedido!", "María García · 14:30 hrs")}
            >Pedido nuevo</button>
            <button
              className="btn btn-sm"
              style={{ fontSize: "0.72rem", background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d", borderRadius: 8 }}
              onClick={() => pushNotif("alerta", "Entrega en ~15 min", "Pedido #42 · Juan López · 14:45 hrs")}
            >Alerta entrega</button>
          </div>
          {/* fin botones de prueba */}

          <div style={{ position: "relative" }}>
            <i className="bi bi-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "0.85rem" }} />
            <input
              type="text"
              className="form-control"
              placeholder="buscar pedido"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ paddingLeft: 32, borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 12px" }}>
          {/* Encabezado con filtro (solo finalizados) */}
          {tab === "cerrado" ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2" style={{ position: "relative" }}>
                <span className="fw-semibold" style={{ fontSize: "1rem", color: "#17181A" }}>Pedidos finalizados</span>
                <button
                  className="btn btn-sm"
                  style={{ background: filtroOpen ? "#e8edf5" : "transparent", border: "none", color: filtroOpen ? "#2563eb" : "#6b7280", borderRadius: 8 }}
                  onClick={() => setFiltroOpen(o => !o)}
                >
                  <i className="bi bi-sort-down-alt" style={{ fontSize: "1.1rem" }} />
                </button>
                {filtroOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50, width: 320 }}>
                    <FiltrosPanel filtros={filtros} setFiltros={setFiltros} onClose={() => setFiltroOpen(false)} />
                  </div>
                )}
              </div>
            </>
          ) : (
            lista.length > 0 && (
              <div className="fw-semibold mb-2" style={{ fontSize: "1rem", color: "#17181A" }}>
                {tabActual.label} pedidos
              </div>
            )
          )}

          {lista.length === 0 ? (
            <p className="text-muted text-center small py-4">Sin pedidos</p>
          ) : tab === "cerrado" ? (
            lista.map(ped => (
              <PedidoCardFinalizado
                key={ped.id}
                pedido={ped}
                seleccionado={seleccionado?.id === ped.id}
                onClick={() => setSeleccionado(ped)}
              />
            ))
          ) : (
            lista.map(ped => (
              <PedidoCard
                key={ped.id}
                pedido={ped}
                seleccionado={seleccionado?.id === ped.id}
                onClick={() => setSeleccionado(ped)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div style={{ flex: 1, minWidth: 0, background: "#fff", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Tabs */}
        <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
          <TabsScroll tab={tab} setTab={setTab} counts={counts} />
        </div>

        {/* Detalle scrolleable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
        {!p ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ height: "100%" }}>
            <i className="bi bi-bag-check fs-1 mb-3" />
            <p>Selecciona un pedido para ver el detalle</p>
          </div>
        ) : tab === "cerrado" ? (
          <DetalleFinalizado pedido={p} />
        ) : (
          <>
            {/* Timer */}
            <TimerWidget pedido={p} />

            {/* Título + badge */}
            <div className="d-flex align-items-center gap-2 mb-3">
              <h3 className="fw-bold mb-0" style={{ fontSize: "1.2rem" }}>Pedido #{p.id}</h3>
              <EstadoBadge estado={p.estado} />
              <button
                className="btn btn-sm btn-outline-secondary ms-auto"
                style={{ borderRadius: 8 }}
                onClick={() => imprimir(p)}
                title="Imprimir comanda"
              >
                <i className="bi bi-printer" />
              </button>
            </div>

            {/* Info boxes */}
            <div className="d-flex gap-2 mb-3 flex-wrap">
              <InfoBox label="Hora de entrega" value={p.hora_entrega} />
              {direccion && <InfoBox label="Lugar de entrega" value={direccion} />}
              {nombre && <InfoBox label={nombre} value={telefono} />}
            </div>

            {/* Mapa (solo en listo y en_camino) */}
            {(p.estado === "listo" || p.estado === "en_camino") && (
              <MapaEntrega pedido={p} />
            )}

            {/* Resumen */}
            <ResumenPedido pedido={p} />

            {/* Acciones */}
            <AccionesPanel p={p} />
          </>
        )}
        </div>{/* fin detalle scrolleable */}
      </div>

      {/* ── Modal rechazo ── */}
      <NotifBanner notifs={notifs} onDismiss={dismissNotif} />

      {modalPausa && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 380 }}>
            <div className="modal-content" style={{ borderRadius: 14 }}>
              <div className="modal-body p-4 text-center">
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>
                  {pausado ? "▶️" : "⏸️"}
                </div>
                <h6 className="fw-bold mb-2">
                  {pausado ? "¿Reanudar pedidos?" : "¿Pausar pedidos?"}
                </h6>
                <p className="text-muted small mb-4">
                  {pausado
                    ? "Los clientes podrán volver a ordenar normalmente."
                    : "Los clientes no podrán hacer pedidos hasta que lo reactives."}
                </p>
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    className="btn btn-outline-secondary"
                    style={{ borderRadius: 10, minWidth: 100 }}
                    onClick={() => setModalPausa(false)}
                  >Cancelar</button>
                  <button
                    className="btn"
                    style={{
                      borderRadius: 10, minWidth: 100, fontWeight: 600,
                      background: pausado ? "#dcfce7" : "#fef2f2",
                      color: pausado ? "#16a34a" : "#dc2626",
                      border: "none",
                    }}
                    onClick={togglePausa}
                    disabled={togglingPausa}
                  >
                    {pausado ? "Sí, reanudar" : "Sí, pausar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {MOTIVOS_RAPIDOS.map(m => (
                    <button
                      key={m} type="button"
                      className={`btn btn-sm rounded-pill ${motivoRechazo === m ? "btn-danger" : "btn-outline-secondary"}`}
                      onClick={() => setMotivoRechazo(m)}
                    >{m}</button>
                  ))}
                </div>
                <textarea
                  className="form-control" rows={3}
                  placeholder="O escribe el motivo..."
                  value={motivoRechazo}
                  onChange={e => setMotivoRechazo(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setModalRechazo(null)}>Cancelar</button>
                <button className="btn btn-danger btn-sm" onClick={rechazar} disabled={!motivoRechazo.trim()}>Confirmar rechazo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar cambio de estado ── */}
      {modalEstado && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Confirmar cambio</h6>
                <button className="btn-close" onClick={() => setModalEstado(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-1 text-muted small">Pedido <strong>#{modalEstado.pedido.id}</strong> — {modalEstado.pedido.receptor_nombre || modalEstado.pedido.cliente?.nombre}</p>
                <p className="mb-0">¿Cambiar estado a <strong>{{
                  en_preparacion: "En preparación",
                  listo: "Pedido listo",
                  en_camino: "En camino",
                  entregado: "Entregado",
                  cancelado: "Cancelado",
                }[modalEstado.estado] ?? modalEstado.estado}</strong>?</p>
                {modalEstado.estado === "cancelado" && (
                  <div className="alert alert-warning py-2 small mt-3 mb-0">
                    <i className="bi bi-exclamation-triangle me-1" />El cliente recibirá una notificación.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setModalEstado(null)}>Cancelar</button>
                <button
                  className={`btn btn-sm ${modalEstado.estado === "cancelado" ? "btn-danger" : "btn-brand"}`}
                  onClick={() => cambiarEstado(modalEstado.pedido.id, modalEstado.estado)}
                >Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal asignar repartidor ── */}
      {modalRepartidor && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Asignar repartidor — Pedido #{modalRepartidor.id}</h6>
                <button className="btn-close" onClick={() => setModalRepartidor(null)} />
              </div>
              <div className="modal-body">
                {repartidores.length === 0 ? (
                  <p className="text-muted small text-center py-3">No hay repartidores disponibles</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {repartidores.map(r => (
                      <button
                        key={r.id}
                        className="btn text-start d-flex align-items-center gap-3 p-3 border rounded-3"
                        style={{ background: "#fff" }}
                        onClick={() => asignarRepartidor(modalRepartidor.id, r.id)}
                      >
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                          style={{ width: 36, height: 36, background: "#ED4137", fontSize: "0.8rem", flexShrink: 0 }}
                        >
                          {r.nombre?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-semibold small">{r.nombre}</div>
                          <div className="text-muted" style={{ fontSize: "0.75rem" }}>{formatTelefono(r.telefono_whatsapp)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setModalRepartidor(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
