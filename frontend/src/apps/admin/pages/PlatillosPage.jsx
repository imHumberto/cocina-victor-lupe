import { useEffect, useState } from "react";
import api from "../../../services/api";

const TIPOS = [
  { valor: "entrada",      label: "Entrada" },
  { valor: "plato_fuerte", label: "Plato Fuerte" },
  { valor: "guarnicion",   label: "Guarnición" },
  { valor: "postre",       label: "Postre" },
  { valor: "bebida",       label: "Bebida" },
];

const TIPO_COLORS = {
  entrada:      { bg: "#fef3c7", color: "#92400e" },
  plato_fuerte: { bg: "#dbeafe", color: "#1e40af" },
  guarnicion:   { bg: "#d1fae5", color: "#065f46" },
  postre:       { bg: "#ede9fe", color: "#4c1d95" },
  bebida:       { bg: "#e0f2fe", color: "#075985" },
};

const FORM_VACIO = { nombre: "", tipo: "", descripcion: "", foto_url: "", es_alternativa: false };

export default function PlatillosPage() {
  const [platillos, setPlatillos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"
  const [pagina, setPagina] = useState(1);
  const [form, setForm] = useState(FORM_VACIO);
  const POR_PAGINA = 10;
  const [editId, setEditId] = useState(null);
  const [drawer, setDrawer] = useState(null); // null | "nuevo" | "editar"
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/admin/platillos").then(({ data }) => setPlatillos(data));
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setEditId(null);
    setMsg("");
    setDrawer("nuevo");
  };

  const abrirEditar = (p) => {
    setForm({ nombre: p.nombre, tipo: p.tipo, descripcion: p.descripcion ?? "", foto_url: p.foto_url ?? "", es_alternativa: p.es_alternativa ?? false });
    setEditId(p.id);
    setMsg("");
    setDrawer("editar");
  };

  const cerrar = () => {
    setDrawer(null);
    setEditId(null);
    setForm(FORM_VACIO);
    setMsg("");
  };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editId) {
        const { data } = await api.patch(`/admin/platillos/${editId}`, form);
        setPlatillos((ps) => ps.map((p) => p.id === editId ? data : p));
        setMsg("✓ Platillo actualizado");
      } else {
        const { data } = await api.post("/admin/platillos", form);
        setPlatillos((ps) => [...ps, data]);
        setMsg("✓ Platillo creado");
      }
      setTimeout(cerrar, 800);
    } catch (err) {
      setMsg(err.response?.data?.error ?? "Error al guardar");
    }
  };

  const eliminar = async () => {
    const p = platillos.find(x => x.id === editId);
    if (!p) return;
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/admin/platillos/${editId}`);
    setPlatillos((ps) => ps.filter((x) => x.id !== editId));
    cerrar();
  };

  const labelTipo = (valor) => TIPOS.find((t) => t.valor === valor)?.label ?? valor;

  const filtrados = platillos
    .filter(p => filtroTipo === "todos" || p.tipo === filtroTipo)
    .filter(p => !busqueda.trim() || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => sortDir === "asc"
      ? a.nombre.localeCompare(b.nombre)
      : b.nombre.localeCompare(a.nombre)
    );

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visible = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F9FBFC", position: "relative" }}>

      {/* Overlay */}
      {drawer && (
        <div
          onClick={cerrar}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 40 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 420,
        background: "#fff",
        zIndex: 50,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
        transform: drawer ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#17181A" }}>
            {drawer === "editar"
              ? `Editar — ${platillos.find(p => p.id === editId)?.nombre ?? ""}`
              : "Nuevo platillo"}
          </h3>
          <button onClick={cerrar} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.2rem", lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <form onSubmit={guardar} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {msg && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 500,
              background: msg.startsWith("✓") ? "#f0fdf4" : "#fef2f2",
              color: msg.startsWith("✓") ? "#15803d" : "#ef4444",
              border: `1px solid ${msg.startsWith("✓") ? "#bbf7d0" : "#fca5a5"}`,
            }}>{msg}</div>
          )}

          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={set("nombre")}
              required
              placeholder="Ej. Pollo en mole"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#1255F0"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
          </div>

          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo *</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TIPOS.map(t => {
                const active = form.tipo === t.valor;
                const cfg = TIPO_COLORS[t.valor];
                return (
                  <button
                    key={t.valor}
                    type="button"
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
          <div>
            <label style={labelStyle}>Descripción <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>(opcional)</span></label>
            <textarea
              value={form.descripcion}
              onChange={set("descripcion")}
              rows={3}
              placeholder="Ingredientes, modo de preparación, alérgenos..."
              style={{ ...inputStyle, resize: "none" }}
              onFocus={e => e.target.style.borderColor = "#1255F0"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
          </div>

          {/* Foto URL */}
          <div>
            <label style={labelStyle}>Foto <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>(opcional)</span></label>
            <div style={{ border: "2px dashed #e5e7eb", borderRadius: 12, padding: "20px 16px", textAlign: "center", background: "#F9FBFC" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>🖼️</div>
              <div style={{ fontSize: "0.82rem", color: "#809FB8", marginBottom: 4 }}>Arrastra una imagen aquí</div>
              <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 8 }}>JPG, PNG o WEBP · máx. 5 MB</div>
              <input
                type="url"
                value={form.foto_url}
                onChange={set("foto_url")}
                placeholder="O pega una URL de imagen"
                style={{ ...inputStyle, fontSize: "0.78rem", padding: "7px 10px", marginTop: 8 }}
                onFocus={e => e.target.style.borderColor = "#1255F0"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
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
                position: "absolute", top: 3,
                width: 18, height: 18, borderRadius: "50%",
                background: "#fff", transition: "left 0.15s",
                left: form.es_alternativa ? 23 : 3,
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, flexShrink: 0 }}>
          {drawer === "editar" && (
            <button
              type="button"
              onClick={eliminar}
              style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
            >Eliminar</button>
          )}
          <button
            type="button"
            onClick={cerrar}
            style={{ flex: 1, background: "#F1F4F9", color: "#545454", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >Cancelar</button>
          <button
            type="submit"
            form="form-platillo"
            onClick={guardar}
            style={{ flex: 2, background: "#ED4137", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >
            {drawer === "editar" ? "Guardar cambios" : "Crear platillo"}
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ padding: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#17181A", margin: 0 }}>Platillos</h2>
          <button
            onClick={abrirNuevo}
            style={{ background: "#ED4137", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
          >+ Nuevo platillo</button>
        </div>

        {/* Buscador */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "0.85rem" }} />
          <input
            type="text"
            placeholder="Buscar platillo..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.875rem", color: "#17181A", outline: "none", background: "#fff", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = "#1255F0"}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1rem" }}
            >✕</button>
          )}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {[{ valor: "todos", label: "Todos" }, ...TIPOS].map(t => {
            const active = filtroTipo === t.valor;
            return (
              <button
                key={t.valor}
                onClick={() => { setFiltroTipo(t.valor); setPagina(1); }}
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

          {/* Header tabla */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr 150px", columnGap: 24, padding: "12px 20px", background: "#F9FBFC", borderBottom: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, textAlign: "left" }}
            >
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#809FB8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nombre</span>
              <i className={`bi bi-arrow-${sortDir === "asc" ? "up" : "down"}`} style={{ fontSize: "0.7rem", color: "#2563eb" }} />
            </button>
            {["Tipo", ""].map((h, i) => (
              <span key={i} style={{ fontSize: "0.72rem", fontWeight: 600, color: "#809FB8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>Sin platillos</div>
          )}

          {visible.map((p, idx) => {
            const tipoCfg = TIPO_COLORS[p.tipo] ?? { bg: "#f3f4f6", color: "#374151" };
            return (
              <div
                key={p.id}
                style={{
                  display: "grid", gridTemplateColumns: "3fr 1.5fr 150px", columnGap: 24,
                  padding: "14px 20px",
                  borderBottom: idx < visible.length - 1 ? "1px solid #f3f4f6" : "none",
                  background: editId === p.id ? "#f0f5ff" : "#fff",
                  borderLeft: editId === p.id ? "3px solid #1255F0" : "3px solid transparent",
                  transition: "background 0.12s",
                  cursor: "default",
                }}
                onMouseEnter={e => { if (editId !== p.id) e.currentTarget.style.background = "#F9FBFC"; }}
                onMouseLeave={e => { if (editId !== p.id) e.currentTarget.style.background = "#fff"; }}
              >
                {/* Nombre */}
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#17181A", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {p.nombre}
                    {p.es_alternativa && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#e0e7ff", color: "#4338ca", borderRadius: 999, padding: "2px 7px" }}>Alternativa</span>
                    )}
                    {!p.activo && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#f3f4f6", color: "#9ca3af", borderRadius: 999, padding: "2px 7px" }}>Inactivo</span>
                    )}
                  </div>
                  {p.descripcion && (
                    <div style={{ fontSize: "0.75rem", color: "#809FB8", marginTop: 2 }}>{p.descripcion}</div>
                  )}
                </div>

                {/* Tipo */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ background: tipoCfg.bg, color: tipoCfg.color, borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
                    {labelTipo(p.tipo)}
                  </span>
                </div>

                {/* Acciones */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <button
                    onClick={() => abrirEditar(p)}
                    style={{ background: "#F1F4F9", border: "none", borderRadius: 8, padding: "6px 14px", color: "#545454", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >Editar</button>
                  <button
                    onClick={async () => {
                      if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
                      await api.delete(`/admin/platillos/${p.id}`);
                      setPlatillos(ps => ps.filter(x => x.id !== p.id));
                    }}
                    style={{ background: "transparent", border: "none", borderRadius: 8, padding: "6px 8px", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem" }}
                    title="Eliminar"
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <Paginacion pagina={paginaActual} total={totalPaginas} onChange={setPagina} />
        )}
      </div>
    </div>
  );
}

function Paginacion({ pagina, total, onChange }) {
  const btnBase = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "12px 0" }}>
      <button onClick={() => onChange(p => Math.max(1, p - 1))} disabled={pagina === 1}
        style={{ ...btnBase, color: pagina === 1 ? "#d1d5db" : "#545454", cursor: pagina === 1 ? "not-allowed" : "pointer" }}>
        <i className="bi bi-arrow-left" /> Anterior
      </button>
      <span style={{ fontSize: "0.82rem", color: "#809FB8", fontWeight: 500 }}>
        Página {pagina} de {total}
      </span>
      <button onClick={() => onChange(p => Math.min(total, p + 1))} disabled={pagina === total}
        style={{ ...btnBase, color: pagina === total ? "#d1d5db" : "#545454", cursor: pagina === total ? "not-allowed" : "pointer" }}>
        Siguiente <i className="bi bi-arrow-right" />
      </button>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: "0.78rem", fontWeight: 600,
  color: "#809FB8", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.04em",
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: "0.9rem",
  color: "#17181A", outline: "none", boxSizing: "border-box",
  background: "#fff", transition: "border-color 0.12s",
};
