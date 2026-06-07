// Página temporal de preview — borrar después de aprobar el diseño
import { useState } from "react";

const TIPOS = [
  { valor: "entrada",      label: "Entrada" },
  { valor: "plato_fuerte", label: "Plato Fuerte" },
  { valor: "guarnicion",   label: "Guarnición" },
  { valor: "postre",       label: "Postre" },
  { valor: "bebida",       label: "Bebida" },
];

const MOCK = [
  { id: 1, nombre: "Sopa de lima",       tipo: "entrada",      descripcion: "Caldo de pollo con tortilla", activo: true,  es_alternativa: false },
  { id: 2, nombre: "Pollo en mole",       tipo: "plato_fuerte", descripcion: "Mole negro con arroz",        activo: true,  es_alternativa: false },
  { id: 3, nombre: "Milanesa empanizada", tipo: "plato_fuerte", descripcion: "Carne de res empanizada",     activo: true,  es_alternativa: true  },
  { id: 4, nombre: "Arroz rojo",          tipo: "guarnicion",   descripcion: null,                          activo: true,  es_alternativa: false },
  { id: 5, nombre: "Flan napolitano",     tipo: "postre",       descripcion: "Con cajeta",                  activo: false, es_alternativa: false },
  { id: 6, nombre: "Agua de jamaica",     tipo: "bebida",       descripcion: null,                          activo: true,  es_alternativa: false },
  { id: 7, nombre: "Coca cola zero",      tipo: "bebida",       descripcion: "Refresco de cola sin azúcar", activo: true,  es_alternativa: true  },
];

const TIPO_COLORS = {
  entrada:      { bg: "#fef3c7", color: "#92400e" },
  plato_fuerte: { bg: "#dbeafe", color: "#1e40af" },
  guarnicion:   { bg: "#d1fae5", color: "#065f46" },
  postre:       { bg: "#ede9fe", color: "#4c1d95" },
  bebida:       { bg: "#e0f2fe", color: "#075985" },
};

const FORM_VACIO = { nombre: "", tipo: "", descripcion: "", foto_url: "", es_alternativa: false };

export default function PreviewTabla() {
  const [filtro, setFiltro] = useState("todos");
  const [drawer, setDrawer] = useState(null); // null | { modo: "nuevo"|"editar", platillo? }
  const [form, setForm] = useState(FORM_VACIO);

  const visible = filtro === "todos" ? MOCK : MOCK.filter(p => p.tipo === filtro);
  const labelTipo = (v) => TIPOS.find(t => t.valor === v)?.label ?? v;

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setDrawer({ modo: "nuevo" });
  };

  const abrirEditar = (p) => {
    setForm({ nombre: p.nombre, tipo: p.tipo, descripcion: p.descripcion ?? "", foto_url: "", es_alternativa: p.es_alternativa });
    setDrawer({ modo: "editar", platillo: p });
  };

  const cerrar = () => setDrawer(null);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FBFC", fontFamily: "system-ui, sans-serif", position: "relative", overflow: "hidden" }}>

      {/* Overlay oscuro cuando el drawer está abierto */}
      {drawer && (
        <div
          onClick={cerrar}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 40, transition: "opacity 0.2s" }}
        />
      )}

      {/* Drawer lateral */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 400,
        background: "#fff",
        zIndex: 50,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
        transform: drawer ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Drawer header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#17181A" }}>
            {drawer?.modo === "editar" ? `Editar — ${drawer.platillo?.nombre}` : "Nuevo platillo"}
          </h3>
          <button onClick={cerrar} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.2rem", lineHeight: 1 }}>✕</button>
        </div>

        {/* Drawer body scrolleable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Nombre */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#809FB8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Nombre *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={set("nombre")}
              placeholder="Ej. Pollo en mole"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.9rem", color: "#17181A", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#1255F0"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#809FB8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Tipo *
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TIPOS.map(t => {
                const active = form.tipo === t.valor;
                const cfg = TIPO_COLORS[t.valor];
                return (
                  <button
                    key={t.valor}
                    onClick={() => setForm(f => ({ ...f, tipo: t.valor }))}
                    style={{
                      background: active ? cfg.bg : "#F1F4F9",
                      color: active ? cfg.color : "#6b7280",
                      border: active ? `1.5px solid ${cfg.color}` : "1.5px solid transparent",
                      borderRadius: 999, padding: "6px 14px",
                      fontSize: "0.8rem", fontWeight: active ? 600 : 400,
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >{t.label}</button>
                );
              })}
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#809FB8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Descripción <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span>
            </label>
            <textarea
              value={form.descripcion}
              onChange={set("descripcion")}
              rows={3}
              placeholder="Ingredientes, modo de preparación, alérgenos..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.9rem", color: "#17181A", resize: "none", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#1255F0"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
          </div>

          {/* Foto */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#809FB8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Foto <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span>
            </label>
            <div style={{ border: "2px dashed #e5e7eb", borderRadius: 12, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: "#F9FBFC" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>🖼️</div>
              <div style={{ fontSize: "0.82rem", color: "#809FB8" }}>Arrastra una imagen aquí</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>JPG, PNG o WEBP · máx. 5 MB</div>
              <button style={{ marginTop: 10, background: "#F1F4F9", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: "0.78rem", color: "#545454", cursor: "pointer", fontWeight: 600 }}>
                Buscar archivo
              </button>
            </div>
          </div>

          {/* Es alternativa */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderTop: "1px solid #f3f4f6" }}>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#17181A" }}>Es alternativa fija</div>
              <div style={{ fontSize: "0.75rem", color: "#809FB8", marginTop: 2 }}>Disponible como opción alternativa en menús</div>
            </div>
            <div
              onClick={() => setForm(f => ({ ...f, es_alternativa: !f.es_alternativa }))}
              style={{
                width: 44, height: 24, borderRadius: 999, cursor: "pointer",
                background: form.es_alternativa ? "#1255F0" : "#e5e7eb",
                position: "relative", transition: "background 0.15s", flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
                background: "#fff", transition: "left 0.15s",
                left: form.es_alternativa ? 23 : 3,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
        </div>

        {/* Drawer footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, flexShrink: 0 }}>
          {drawer?.modo === "editar" && (
            <button
              style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
            >
              Eliminar
            </button>
          )}
          <button
            onClick={cerrar}
            style={{ flex: 1, background: "#F1F4F9", color: "#545454", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >Cancelar</button>
          <button
            style={{ flex: 2, background: "#ED4137", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >
            {drawer?.modo === "editar" ? "Guardar cambios" : "Crear platillo"}
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#17181A", margin: 0 }}>Platillos</h2>
          <button
            onClick={abrirNuevo}
            style={{ background: "#ED4137", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >+ Nuevo platillo</button>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {[{ valor: "todos", label: "Todos" }, ...TIPOS].map(t => {
            const active = filtro === t.valor;
            return (
              <button
                key={t.valor}
                onClick={() => setFiltro(t.valor)}
                style={{
                  background: active ? "#2563eb" : "#fff",
                  color: active ? "#fff" : "#6b7280",
                  border: "1px solid #e5e7eb", borderRadius: 999,
                  padding: "6px 16px", fontSize: "0.82rem",
                  fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.12s",
                }}
              >{t.label}</button>
            );
          })}
        </div>

        {/* Tabla */}
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 120px", padding: "12px 20px", background: "#F9FBFC", borderBottom: "1px solid #e5e7eb" }}>
            {["Nombre", "Tipo", ""].map((h, i) => (
              <span key={i} style={{ fontSize: "0.72rem", fontWeight: 600, color: "#809FB8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>

          {visible.map((p, idx) => {
            const tipoCfg = TIPO_COLORS[p.tipo] ?? { bg: "#f3f4f6", color: "#374151" };
            return (
              <div
                key={p.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 150px 120px",
                  padding: "14px 20px",
                  borderBottom: idx < visible.length - 1 ? "1px solid #f3f4f6" : "none",
                  background: "#fff", transition: "background 0.12s", cursor: "default",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#F9FBFC"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#17181A", display: "flex", alignItems: "center", gap: 6 }}>
                    {p.nombre}
                    {p.es_alternativa && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#e0e7ff", color: "#4338ca", borderRadius: 999, padding: "2px 7px" }}>Alternativa</span>
                    )}
                    {!p.activo && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#f3f4f6", color: "#9ca3af", borderRadius: 999, padding: "2px 7px" }}>Inactivo</span>
                    )}
                  </div>
                  {p.descripcion && <div style={{ fontSize: "0.75rem", color: "#809FB8", marginTop: 2 }}>{p.descripcion}</div>}
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ background: tipoCfg.bg, color: tipoCfg.color, borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
                    {labelTipo(p.tipo)}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <button
                    onClick={() => abrirEditar(p)}
                    style={{ background: "#F1F4F9", border: "none", borderRadius: 8, padding: "6px 14px", color: "#545454", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >Editar</button>
                  <button
                    style={{ background: "transparent", border: "none", borderRadius: 8, padding: "6px 8px", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 12, fontSize: "0.72rem", color: "#9ca3af" }}>
          Preview temporal · haz clic en "Editar" o "+ Nuevo platillo" para ver el drawer
        </p>
      </div>
    </div>
  );
}
