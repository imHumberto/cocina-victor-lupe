import { useEffect, useState } from "react";
import api from "../../../services/api";
import PhoneInput from "../../../components/shared/PhoneInput";
import PasswordInput from "../../../components/shared/PasswordInput";
import { formatTelefono } from "../../../utils/format";

const ROLES = [
  { valor: "todos",      label: "Todos" },
  { valor: "cliente",    label: "Clientes" },
  { valor: "repartidor", label: "Repartidores" },
  { valor: "admin",      label: "Admins" },
];

const ROL_CHIP = {
  cliente:    { bg: "#dbeafe", color: "#1e40af" },
  repartidor: { bg: "#d1fae5", color: "#065f46" },
  admin:      { bg: "#fef3c7", color: "#92400e" },
};

const FORM_VACIO     = { nombre: "", telefono_whatsapp: "", password: "", rol: "cliente", direccion_entrega: "", tipo_vivienda: "", referencias_entrega: "", empresa: "" };
const EDIT_VACIO     = { nombre: "", telefono_whatsapp: "", password: "", rol: "cliente", direccion_entrega: "", tipo_vivienda: "", referencias_entrega: "", empresa: "", activo: true };
const POR_PAGINA     = 10;

export default function UsuariosPage() {
  const [usuarios, setUsuarios]   = useState([]);
  const [filtroRol, setFiltroRol] = useState("todos");
  const [busqueda, setBusqueda]   = useState("");
  const [sortDir, setSortDir]     = useState("asc");
  const [pagina, setPagina]       = useState(1);

  // Drawer
  const [drawer, setDrawer]   = useState(null); // null | "nuevo" | "editar"
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(FORM_VACIO);
  const [msg, setMsg]         = useState("");

  // Modal invitar
  const [modalInvite, setModalInvite]   = useState(false);
  const [inviteGenerado, setInviteGenerado] = useState(null);
  const [copiado, setCopiado]           = useState(false);

  useEffect(() => {
    api.get("/admin/usuarios").then(({ data }) => setUsuarios(data));
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setEditId(null);
    setMsg("");
    setDrawer("nuevo");
  };

  const abrirEditar = (u) => {
    setForm({ nombre: u.nombre, telefono_whatsapp: u.telefono_whatsapp, password: "", rol: u.rol, direccion_entrega: u.direccion_entrega ?? "", tipo_vivienda: u.tipo_vivienda ?? "", referencias_entrega: u.referencias_entrega ?? "", empresa: u.empresa ?? "", activo: u.activo });
    setEditId(u.id);
    setMsg("");
    setDrawer("editar");
  };

  const cerrar = () => { setDrawer(null); setEditId(null); setForm(FORM_VACIO); setMsg(""); };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (drawer === "editar") {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        const { data } = await api.patch(`/admin/usuarios/${editId}`, payload);
        setUsuarios(us => us.map(u => u.id === data.id ? data : u));
        setMsg("✓ Usuario actualizado");
      } else {
        if (form.rol === "cliente" && !form.direccion_entrega.trim()) {
          setMsg("La dirección es requerida para clientes");
          return;
        }
        const { data } = await api.post("/admin/usuarios", form);
        setUsuarios(us => [...us, data]);
        setMsg("✓ Usuario creado");
      }
      setTimeout(cerrar, 800);
    } catch (err) {
      setMsg(err.response?.data?.error ?? "Error al guardar");
    }
  };

  const eliminar = async () => {
    const u = usuarios.find(x => x.id === editId);
    if (!u || !confirm(`¿Eliminar a "${u.nombre}"?`)) return;
    try {
      await api.delete(`/admin/usuarios/${editId}`);
      setUsuarios(us => us.filter(x => x.id !== editId));
      cerrar();
    } catch (err) { setMsg(err.response?.data?.error ?? "Error al eliminar"); }
  };

  // Invite
  const abrirInvite = () => { setInviteGenerado(null); setCopiado(false); setModalInvite(true); };
  const generarInvite = async () => {
    const { data } = await api.post("/admin/invites");
    setInviteGenerado(`${window.location.origin}/registro/${data.token}`);
    setCopiado(false);
  };
  const copiarInvite = () => { navigator.clipboard.writeText(inviteGenerado); setCopiado(true); };

  // Lista filtrada + paginada
  const filtrados = usuarios
    .filter(u => filtroRol === "todos" || u.rol === filtroRol)
    .filter(u => !busqueda.trim() || u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (u.telefono_whatsapp ?? "").includes(busqueda))
    .sort((a, b) => sortDir === "asc" ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre));

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visible = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const esCliente = form.rol === "cliente";

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#F9FBFC", position: "relative" }}>

      {/* Overlay */}
      {drawer && <div onClick={cerrar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 40 }} />}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
        background: "#fff", zIndex: 50,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
        transform: drawer ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#17181A" }}>
            {drawer === "editar" ? `Editar — ${usuarios.find(u => u.id === editId)?.nombre ?? ""}` : "Nuevo usuario"}
          </h3>
          <button onClick={cerrar} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1.2rem" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {msg && (
            <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 500, background: msg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", color: msg.startsWith("✓") ? "#15803d" : "#ef4444", border: `1px solid ${msg.startsWith("✓") ? "#bbf7d0" : "#fca5a5"}` }}>
              {msg}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input type="text" value={form.nombre} onChange={set("nombre")} required placeholder="Nombre completo" style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#1255F0"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
          </div>

          {/* Teléfono */}
          <div>
            <label style={labelStyle}>Teléfono *</label>
            <PhoneInput value={form.telefono_whatsapp} onChange={v => setForm(f => ({ ...f, telefono_whatsapp: v }))} required />
          </div>

          {/* Contraseña */}
          <div>
            <label style={labelStyle}>
              Contraseña {drawer === "editar" && <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>(vacío = no cambiar)</span>}
              {drawer === "nuevo" && " *"}
            </label>
            <PasswordInput value={form.password} onChange={set("password")} required={drawer === "nuevo"} autoComplete="new-password"
              style={{ ...inputStyle, display: "block" }} />
          </div>

          {/* Rol */}
          <div>
            <label style={labelStyle}>Rol *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["cliente", "repartidor", "admin"].map(r => {
                const active = form.rol === r;
                const cfg = ROL_CHIP[r];
                return (
                  <button key={r} type="button" onClick={() => setForm(f => ({ ...f, rol: r }))}
                    style={{ background: active ? cfg.bg : "#F1F4F9", color: active ? cfg.color : "#6b7280", border: active ? `1.5px solid ${cfg.color}` : "1.5px solid transparent", borderRadius: 999, padding: "6px 14px", fontSize: "0.8rem", fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.12s", textTransform: "capitalize" }}
                  >{r}</button>
                );
              })}
            </div>
          </div>

          {/* Activo (solo editar) */}
          {drawer === "editar" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#17181A" }}>Usuario activo</div>
                <div style={{ fontSize: "0.75rem", color: "#809FB8", marginTop: 2 }}>Si se desactiva no podrá iniciar sesión</div>
              </div>
              <div onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                style={{ width: 44, height: 24, borderRadius: 999, cursor: "pointer", background: form.activo ? "#1255F0" : "#e5e7eb", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", left: form.activo ? 23 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          )}

          {/* Campos de cliente */}
          {esCliente && (
            <>
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
                <label style={labelStyle}>Dirección de entrega *</label>
                <input type="text" value={form.direccion_entrega} onChange={set("direccion_entrega")} placeholder="Calle, número, colonia..." style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#1255F0"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div>
                <label style={labelStyle}>Tipo de vivienda <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>(opcional)</span></label>
                <input type="text" value={form.tipo_vivienda} onChange={set("tipo_vivienda")} placeholder="Casa, depto, oficina..." style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#1255F0"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div>
                <label style={labelStyle}>Referencias <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>(opcional)</span></label>
                <textarea value={form.referencias_entrega} onChange={set("referencias_entrega")} rows={2} placeholder="Casa color rosa, frente al parque..." style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "#1255F0"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
              <div>
                <label style={labelStyle}>Empresa <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>(opcional)</span></label>
                <input type="text" value={form.empresa} onChange={set("empresa")} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#1255F0"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, flexShrink: 0 }}>
          {drawer === "editar" && (
            <button type="button" onClick={eliminar}
              style={{ background: "#fef2f2", color: "#ef4444", border: "none", borderRadius: 10, padding: "12px 16px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
              Eliminar
            </button>
          )}
          <button type="button" onClick={cerrar}
            style={{ flex: 1, background: "#F1F4F9", color: "#545454", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={guardar}
            style={{ flex: 2, background: "#094D40", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
            {drawer === "editar" ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div style={{ padding: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#17181A", margin: 0 }}>Usuarios</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={abrirInvite}
              style={{ background: "#F1F4F9", color: "#545454", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
              <i className="bi bi-link-45deg me-1" />Invitar cliente
            </button>
            <button onClick={abrirNuevo}
              style={{ background: "#094D40", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
              + Nuevo usuario
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <i className="bi bi-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: "0.85rem" }} />
          <input type="text" placeholder="Buscar por nombre o teléfono..." value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: "0.875rem", color: "#17181A", outline: "none", background: "#fff", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = "#1255F0"} onBlur={e => e.target.style.borderColor = "#e5e7eb"} />
          {busqueda && (
            <button onClick={() => { setBusqueda(""); setPagina(1); }}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "1rem" }}>✕</button>
          )}
        </div>

        {/* Filtros por rol */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {ROLES.map(r => {
            const active = filtroRol === r.valor;
            const count = r.valor === "todos" ? usuarios.length : usuarios.filter(u => u.rol === r.valor).length;
            return (
              <button key={r.valor} onClick={() => { setFiltroRol(r.valor); setPagina(1); }}
                style={{ background: active ? "#2563eb" : "#fff", color: active ? "#fff" : "#6b7280", border: "1px solid #e5e7eb", borderRadius: 999, padding: "6px 16px", fontSize: "0.82rem", fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.12s" }}>
                {r.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Tabla */}
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>

          {/* Header tabla */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1.5fr 120px", columnGap: 24, padding: "12px 20px", background: "#F9FBFC", borderBottom: "1px solid #e5e7eb" }}>
            <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={thStyle}>Nombre</span>
              <i className={`bi bi-arrow-${sortDir === "asc" ? "up" : "down"}`} style={{ fontSize: "0.7rem", color: "#2563eb" }} />
            </button>
            {["Rol", "Dirección", "Tipo", "Teléfono", ""].map((h, i) => (
              <span key={i} style={thStyle}>{h}</span>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>Sin usuarios</div>
          )}

          {visible.map((u, idx) => {
            const rolCfg = ROL_CHIP[u.rol] ?? { bg: "#f3f4f6", color: "#374151" };
            return (
              <div key={u.id} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 2fr 1fr 1.5fr 120px", columnGap: 24,
                padding: "14px 20px",
                borderBottom: idx < visible.length - 1 ? "1px solid #f3f4f6" : "none",
                background: editId === u.id ? "#f0f5ff" : "#fff",
                borderLeft: editId === u.id ? "3px solid #1255F0" : "3px solid transparent",
                transition: "background 0.12s",
              }}
                onMouseEnter={e => { if (editId !== u.id) e.currentTarget.style.background = "#F9FBFC"; }}
                onMouseLeave={e => { if (editId !== u.id) e.currentTarget.style.background = "#fff"; }}
              >
                {/* Nombre */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#094D40", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0 }}>
                    {u.nombre?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#17181A" }}>{u.nombre}</div>
                    {!u.activo && <span style={{ fontSize: "0.65rem", fontWeight: 600, background: "#f3f4f6", color: "#9ca3af", borderRadius: 999, padding: "1px 6px" }}>Inactivo</span>}
                  </div>
                </div>

                {/* Rol */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ background: rolCfg.bg, color: rolCfg.color, borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize" }}>{u.rol}</span>
                </div>

                {/* Dirección */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {u.rol === "cliente" ? (
                    <div style={{ fontSize: "0.78rem", color: "#545454", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {u.direccion_entrega || "—"}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "#d1d5db" }}>—</span>
                  )}
                </div>

                {/* Tipo de vivienda */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {u.rol === "cliente" && u.tipo_vivienda ? (
                    <span style={{ background: "#f1f5f9", color: "#545454", borderRadius: 999, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 500 }}>
                      {u.tipo_vivienda}
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "#d1d5db" }}>—</span>
                  )}
                </div>

                {/* Teléfono */}
                <div style={{ display: "flex", alignItems: "center", fontSize: "0.82rem", color: "#545454" }}>
                  {formatTelefono(u.telefono_whatsapp)}
                </div>

                {/* Acciones */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                  <button onClick={() => abrirEditar(u)}
                    style={{ background: "#F1F4F9", border: "none", borderRadius: 8, padding: "6px 14px", color: "#545454", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                    Editar
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`¿Eliminar a "${u.nombre}"?`)) return;
                    await api.delete(`/admin/usuarios/${u.id}`);
                    setUsuarios(us => us.filter(x => x.id !== u.id));
                  }}
                    style={{ background: "transparent", border: "none", borderRadius: 8, padding: "6px 8px", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem" }}
                    title="Eliminar">
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

      {/* ── Modal invitar ── */}
      {modalInvite && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)", zIndex: 60 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0">
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title fw-bold">Invitar nuevo cliente</h6>
                <button className="btn-close" onClick={() => setModalInvite(false)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">Genera un link de un solo uso. Cuando el cliente lo use para registrarse, el link queda inválido automáticamente.</p>
                {!inviteGenerado ? (
                  <div className="text-center py-3">
                    <button className="btn btn-brand px-4" onClick={generarInvite}>
                      <i className="bi bi-link-45deg me-2" />Generar link
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="form-label small fw-semibold">Link de invitación</label>
                    <div className="input-group mb-2">
                      <input type="text" className="form-control form-control-sm" value={inviteGenerado} readOnly onClick={e => e.target.select()} />
                      <button className="btn btn-outline-secondary btn-sm" onClick={copiarInvite}>
                        <i className={`bi ${copiado ? "bi-check-lg text-success" : "bi-clipboard"}`} />
                      </button>
                    </div>
                    {copiado && <div className="text-success small mb-2">¡Copiado!</div>}
                    <div className="alert alert-warning py-2 small mb-0">
                      <i className="bi bi-exclamation-triangle me-1" />Este link solo funciona <strong>una vez</strong>.
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer border-0">
                {inviteGenerado && (
                  <button className="btn btn-sm btn-outline-brand me-auto" onClick={generarInvite}>
                    <i className="bi bi-arrow-clockwise me-1" />Generar otro
                  </button>
                )}
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setModalInvite(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
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

const thStyle = {
  fontSize: "0.72rem", fontWeight: 600, color: "#809FB8",
  textTransform: "uppercase", letterSpacing: "0.05em",
};
