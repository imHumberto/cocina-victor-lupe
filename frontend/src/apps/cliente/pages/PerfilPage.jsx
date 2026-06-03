import { useEffect, useRef, useState } from "react";

const TIPOS_VIVIENDA = [
  { value: "casa",         icon: "bi-house",       label: "Casa" },
  { value: "departamento", icon: "bi-building",    label: "Departamento" },
  { value: "oficina",      icon: "bi-briefcase",   label: "Oficina" },
  { value: "empresa",      icon: "bi-building-gear", label: "Empresa" },
  { value: "otro",         icon: "bi-geo-alt",     label: "Otro" },
];
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import BottomSheet from "../../../components/shared/BottomSheet";
import PasswordInput from "../../../components/shared/PasswordInput";
import PhoneInput from "../../../components/shared/PhoneInput";
import { formatTelefono } from "../../../utils/format";

const FOTO_KEY = (id) => `perfil_foto_${id}`;

function Avatar({ nombre, userId, editable, onFotoChange }) {
  const fotoRef = useRef();
  const foto = userId ? localStorage.getItem(FOTO_KEY(userId)) : null;
  const partes = (nombre ?? "").trim().split(" ");
  const letras = (partes.length >= 2 ? partes[0][0] + partes[1][0] : partes[0]?.[0] ?? "?").toUpperCase();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      localStorage.setItem(FOTO_KEY(userId), ev.target.result);
      onFotoChange?.(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="position-relative d-inline-block mx-auto" style={{ width: 88 }}>
      {foto
        ? <img src={foto} alt="foto" className="rounded-circle" style={{ width: 88, height: 88, objectFit: "cover" }} />
        : (
          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
            style={{ width: 88, height: 88, background: "#ED4137", fontSize: "2rem" }}>
            {letras}
          </div>
        )
      }
      {editable && (
        <>
          <button
            type="button"
            className="btn btn-sm rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{ width: 28, height: 28, bottom: 0, right: 0, background: "#fff", border: "2px solid #eee", padding: 0 }}
            onClick={() => fotoRef.current.click()}
          >
            <i className="bi bi-camera-fill" style={{ fontSize: "0.75rem", color: "#ED4137" }} />
          </button>
          <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        </>
      )}
    </div>
  );
}

function ItemMenu({ icono, label, sub, onClick, danger, disabled, trailing }) {
  return (
    <button
      className="btn w-100 text-start d-flex align-items-center gap-3 px-0 py-3 border-bottom"
      style={{ background: "none", border: "none", borderRadius: 0, opacity: disabled ? 0.45 : 1 }}
      onClick={onClick}
      disabled={disabled}
    >
      <i className={`bi ${icono} ${danger ? "text-danger" : "text-brand"}`} style={{ fontSize: "1.1rem", width: 24, textAlign: "center", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={`fw-semibold small ${danger ? "text-danger" : ""}`}>{label}</div>
        {sub && <div className="text-muted" style={{ fontSize: "0.75rem" }}>{sub}</div>}
      </div>
      {trailing ?? <i className="bi bi-chevron-right text-muted small" />}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div className="form-check form-switch mb-0">
      <input
        className="form-check-input"
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
        style={{ cursor: "pointer" }}
      />
    </div>
  );
}

export default function PerfilPage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  // Direcciones
  const [direcciones, setDirecciones] = useState([]);
  const [sheetDirecciones, setSheetDirecciones] = useState(false);
  const [sheetAgregarDir, setSheetAgregarDir] = useState(false);
  const [busquedaDir, setBusquedaDir] = useState("");
  const [resultadosDir, setResultadosDir] = useState([]);
  const [buscandoDir, setBuscandoDir] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState(null);
  const [nuevoPaso, setNuevoPaso] = useState("buscar"); // buscar | tipo
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoAlias, setNuevoAlias] = useState("");
  const [nuevaReferencia, setNuevaReferencia] = useState("");
  const [guardandoDir, setGuardandoDir] = useState(false);
  const debounceRef = useRef(null);

  // Avatar
  const [fotoVersion, setFotoVersion] = useState(0);

  // Sheet configuración
  const [sheetConfig, setSheetConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ nombre: user.nombre, telefono_whatsapp: user.telefono_whatsapp ?? "" });
  const [configMsg, setConfigMsg] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  // Sheet seguridad
  const [sheetSeguridad, setSheetSeguridad] = useState(false);
  const [passForm, setPassForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [passMsg, setPassMsg] = useState({ texto: "", tipo: "danger" });
  const [savingPass, setSavingPass] = useState(false);

  // Confirmar cerrar sesión
  const [sheetLogout, setSheetLogout] = useState(false);

  // Sheet eliminar cuenta
  const [sheetEliminar, setSheetEliminar] = useState(false);
  const [passEliminar, setPassEliminar] = useState("");
  const [eliminandoMsg, setEliminandoMsg] = useState("");
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    api.get("/pedidos/mis-direcciones").then(({ data }) => setDirecciones(data)).catch(() => {});
  }, []);

  const abrirAgregarDir = () => {
    setBusquedaDir(""); setResultadosDir([]); setNuevaDireccion(null);
    setNuevoPaso("buscar"); setNuevoTipo(""); setNuevoAlias(""); setNuevaReferencia("");
    setSheetAgregarDir(true);
  };

  const onBusquedaChange = (valor) => {
    setBusquedaDir(valor);
    setResultadosDir([]);
    clearTimeout(debounceRef.current);
    if (valor.trim().length >= 3) {
      debounceRef.current = setTimeout(() => buscarDir(valor), 500);
    }
  };

  const buscarDir = async (q) => {
    const query = q ?? busquedaDir;
    if (!query.trim()) return;
    setBuscandoDir(true);
    try {
      const res = await fetch(`/api/geo/buscar?q=${encodeURIComponent(query)}`);
      setResultadosDir(await res.json());
    } finally { setBuscandoDir(false); }
  };

  const seleccionarResultadoDir = async (r) => {
    let lat = r.lat, lng = r.lon;
    if (!lat) {
      const res = await fetch(`/api/geo/detalle?place_id=${r.place_id}`);
      const d = await res.json();
      lat = d.lat; lng = d.lng;
    }
    setNuevaDireccion({ ...r, lat, lng });
    setResultadosDir([]);
    setNuevoPaso("tipo");
  };

  const guardarDireccion = async () => {
    setGuardandoDir(true);
    try {
      const alias = nuevoAlias.trim() || TIPOS_VIVIENDA.find(t => t.value === nuevoTipo)?.label || "Mi dirección";
      const { data } = await api.post("/pedidos/mis-direcciones", {
        alias,
        tipo_vivienda: nuevoTipo,
        direccion: nuevaDireccion.display_name,
        referencias: nuevaReferencia,
      });
      setDirecciones(prev => [...prev, data]);
      setSheetAgregarDir(false);
    } finally { setGuardandoDir(false); }
  };

  const eliminarDireccion = async (id) => {
    try {
      await api.delete(`/pedidos/mis-direcciones/${id}`);
      setDirecciones(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert(err.response?.data?.error ?? "Error al eliminar");
    }
  };

  // ── Notificaciones — auto-guardan al toggle ──
  const toggleNotif = async (campo) => {
    const nuevo = !user[campo];
    try {
      const { data } = await api.patch("/auth/perfil", { [campo]: nuevo });
      setUser(data);
    } catch {}
  };

  // ── Configuración ──
  const guardarConfig = async () => {
    setSavingConfig(true);
    setConfigMsg("");
    try {
      const { data } = await api.patch("/auth/perfil", {
        nombre: configForm.nombre.trim(),
        telefono_whatsapp: configForm.telefono_whatsapp.trim(),
      });
      setUser(data);
      setConfigMsg("✓ Guardado");
      setTimeout(() => { setConfigMsg(""); setSheetConfig(false); }, 900);
    } catch (err) {
      setConfigMsg(err.response?.data?.error ?? "Error al guardar");
    } finally { setSavingConfig(false); }
  };

  // ── Cambiar contraseña ──
  const cambiarPassword = async () => {
    if (passForm.nueva !== passForm.confirmar) {
      setPassMsg({ texto: "Las contraseñas no coinciden", tipo: "danger" }); return;
    }
    if (passForm.nueva.length < 6) {
      setPassMsg({ texto: "Mínimo 6 caracteres", tipo: "danger" }); return;
    }
    setSavingPass(true);
    setPassMsg({ texto: "", tipo: "danger" });
    try {
      // Verificamos la contraseña actual haciendo login
      await api.post("/auth/login", { telefono_whatsapp: user.telefono_whatsapp, password: passForm.actual });
      await api.patch("/auth/perfil", { password: passForm.nueva });
      setPassMsg({ texto: "✓ Contraseña actualizada", tipo: "success" });
      setPassForm({ actual: "", nueva: "", confirmar: "" });
      setTimeout(() => { setPassMsg({ texto: "", tipo: "danger" }); setSheetSeguridad(false); }, 1200);
    } catch {
      setPassMsg({ texto: "Contraseña actual incorrecta", tipo: "danger" });
    } finally { setSavingPass(false); }
  };

  // ── Eliminar cuenta ──
  const eliminarCuenta = async () => {
    setEliminando(true);
    setEliminandoMsg("");
    try {
      await api.delete("/auth/cuenta", { data: { password: passEliminar } });
      logout();
    } catch (err) {
      setEliminandoMsg(err.response?.data?.error ?? "Error");
      setEliminando(false);
    }
  };

  const nombre = user.nombre ?? "";
  const primerNombre = nombre.split(" ")[0];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>

      {/* ── Header ── */}
      <div className="text-center px-4 pt-5 pb-4">
        <Avatar
          nombre={nombre}
          userId={user.id}
          editable
          onFotoChange={() => setFotoVersion(v => v + 1)}
        />
        <h2 className="fw-bold mt-3 mb-0" style={{ fontSize: "1.5rem" }}>{nombre}</h2>
        <p className="text-muted small mt-1 mb-0">{formatTelefono(user.telefono_whatsapp)}</p>
      </div>

      {/* ── Accesos rápidos ── */}
      <div className="d-flex gap-3 px-4 mb-4">
        {[
          { icono: "bi-heart",      label: "Favoritos",   sub: "Próximamente", disabled: true,  onClick: null },
          { icono: "bi-bag",        label: "Pedidos",     sub: "Historial",    disabled: false, onClick: () => navigate("/cliente/mis-pedidos") },
          { icono: "bi-geo-alt",    label: "Direcciones", sub: "Gestionar",    disabled: false, onClick: () => setSheetDirecciones(true) },
        ].map(({ icono, label, sub, disabled, onClick }) => (
          <button
            key={label}
            className="btn flex-fill d-flex flex-column align-items-center justify-content-center py-3 rounded-3"
            style={{ background: "#f5f5f5", border: "none", opacity: disabled ? 0.45 : 1 }}
            onClick={onClick}
            disabled={disabled}
          >
            <i className={`bi ${icono}`} style={{ fontSize: "1.4rem" }} />
            <div className="fw-semibold small mt-1">{label}</div>
            <div className="text-muted" style={{ fontSize: "0.7rem" }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* ── Secciones del menú ── */}
      <div className="px-4">

        {/* Configuración */}
        <p className="text-muted mb-1" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Configuración</p>
        <div className="mb-4">
          <ItemMenu
            icono="bi-person"
            label="Nombre, teléfono y foto"
            sub={user.nombre}
            onClick={() => { setConfigForm({ nombre: user.nombre, telefono_whatsapp: user.telefono_whatsapp ?? "" }); setConfigMsg(""); setSheetConfig(true); }}
          />
        </div>

        {/* Notificaciones */}
        <p className="text-muted mb-1" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notificaciones</p>
        <div className="mb-4">
          <ItemMenu
            icono="bi-bell" label="Notificaciones en la app" sub="Alertas de tu pedido"
            onClick={() => toggleNotif("notif_app")}
            trailing={<Toggle checked={user.notif_app} onChange={() => toggleNotif("notif_app")} />}
          />
          <ItemMenu
            icono="bi-whatsapp" label="WhatsApp" sub="Mensajes al completar pedidos"
            onClick={() => toggleNotif("notif_whatsapp")}
            trailing={<Toggle checked={user.notif_whatsapp} onChange={() => toggleNotif("notif_whatsapp")} />}
          />
        </div>

        {/* Seguridad */}
        <p className="text-muted mb-1" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seguridad</p>
        <div className="mb-4">
          <ItemMenu icono="bi-lock" label="Cambiar contraseña" onClick={() => { setPassForm({ actual: "", nueva: "", confirmar: "" }); setPassMsg({ texto: "", tipo: "danger" }); setSheetSeguridad(true); }} />
          {/* HIDDEN: eliminar cuenta — descomentar cuando esté listo */}
          {/* <ItemMenu icono="bi-trash" label="Eliminar cuenta" danger onClick={() => { setPassEliminar(""); setEliminandoMsg(""); setSheetEliminar(true); }} trailing={<i className="bi bi-chevron-right text-danger small" />} /> */}
        </div>

        {/* Log out */}
        <button
          className="btn w-100 py-3 fw-semibold rounded-3 d-flex align-items-center justify-content-center gap-2"
          style={{ background: "#f5f5f5", border: "none", color: "#333" }}
          onClick={() => setSheetLogout(true)}
        >
          <i className="bi bi-box-arrow-right" />
          Cerrar sesión
        </button>
      </div>

      {/* ── Sheet: Direcciones ── */}
      <BottomSheet abierto={sheetDirecciones} onCerrar={() => setSheetDirecciones(false)} titulo="Mis direcciones">
        {direcciones.length === 0 ? (
          <p className="text-muted text-center py-3 small">No tienes direcciones guardadas</p>
        ) : (
          direcciones.map((d) => (
            <div key={d.id} className="d-flex align-items-start gap-3 py-3 border-bottom">
              <i className="bi bi-geo-alt text-brand mt-1" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-semibold small">{d.alias}</div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>{d.direccion}</div>
                {d.referencias && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{d.referencias}</div>}
                {d.es_principal && <span className="badge mt-1" style={{ fontSize: "0.65rem", background: "#fff5f5", color: "#ED4137" }}>Principal</span>}
              </div>
              <button
                className="btn btn-sm btn-link text-danger p-0 ms-1"
                onClick={() => eliminarDireccion(d.id)}
                title="Eliminar"
              >
                <i className="bi bi-trash" />
              </button>
            </div>
          ))
        )}
        <button className="btn btn-brand w-100 py-3 fw-bold rounded-3 mt-3" onClick={abrirAgregarDir}>
          <i className="bi bi-plus me-1" /> Agregar dirección
        </button>
      </BottomSheet>

      {/* ── Sheet: Agregar dirección ── */}
      <BottomSheet
        abierto={sheetAgregarDir}
        onCerrar={() => setSheetAgregarDir(false)}
        titulo={nuevoPaso === "buscar" ? "Nueva dirección" : "Tipo de lugar"}
      >
        {nuevoPaso === "buscar" && (
          <div>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Busca tu calle, colonia..."
                value={busquedaDir}
                autoFocus
                onChange={(e) => onBusquedaChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarDir()}
              />
              <button className="btn btn-brand px-3" onClick={() => buscarDir()} disabled={buscandoDir}>
                {buscandoDir ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-search" />}
              </button>
            </div>
            {resultadosDir.map((r, i) => (
              <div
                key={i}
                className="d-flex align-items-start gap-2 p-3 border-bottom"
                style={{ cursor: "pointer" }}
                onClick={() => seleccionarResultadoDir(r)}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
              >
                <i className="bi bi-geo-alt text-brand mt-1" style={{ flexShrink: 0 }} />
                <span className="small">{r.display_name}</span>
              </div>
            ))}
          </div>
        )}

        {nuevoPaso === "tipo" && nuevaDireccion && (
          <div>
            <div className="p-3 rounded-3 mb-3" style={{ background: "#f5f5f5" }}>
              <div className="small text-muted text-truncate">{nuevaDireccion.display_name}</div>
            </div>
            <p className="fw-semibold small mb-2">Tipo de lugar</p>
            {TIPOS_VIVIENDA.map((t) => (
              <div
                key={t.value}
                className="d-flex align-items-center gap-3 p-3 border rounded-3 mb-2"
                style={{ cursor: "pointer", background: nuevoTipo === t.value ? "#fff5f5" : "#fff", borderColor: nuevoTipo === t.value ? "#ED4137" : "#dee2e6" }}
                onClick={() => setNuevoTipo(t.value)}
              >
                <i className={`bi ${t.icon} text-brand`} />
                <span className="fw-semibold small">{t.label}</span>
                {nuevoTipo === t.value && <i className="bi bi-check-circle-fill text-brand ms-auto" />}
              </div>
            ))}
            {nuevoTipo && (
              <>
                <div className="mb-3 mt-2">
                  <label className="form-label small fw-semibold">Alias <span className="text-muted fw-normal">(opcional)</span></label>
                  <input type="text" className="form-control" placeholder={`Ej. ${TIPOS_VIVIENDA.find(t => t.value === nuevoTipo)?.label} del trabajo`} value={nuevoAlias} onChange={(e) => setNuevoAlias(e.target.value)} />
                </div>
                <div className="mb-4">
                  <label className="form-label small fw-semibold">Referencias <span className="text-muted fw-normal">(opcional)</span></label>
                  <textarea className="form-control" rows={2} placeholder="Color de la fachada, referencias..." value={nuevaReferencia} onChange={(e) => setNuevaReferencia(e.target.value)} />
                </div>
                <button className="btn btn-brand w-100 py-3 fw-bold rounded-3" onClick={guardarDireccion} disabled={guardandoDir}>
                  {guardandoDir ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                  Guardar en mi perfil
                </button>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ── Sheet: Configuración ── */}
      <BottomSheet abierto={sheetConfig} onCerrar={() => setSheetConfig(false)} titulo="Configuración">
        {/* Foto */}
        <div className="text-center mb-4">
          <Avatar
            nombre={configForm.nombre || nombre}
            userId={user.id}
            editable
            onFotoChange={() => setFotoVersion(v => v + 1)}
          />
          <p className="text-muted mt-2 mb-0" style={{ fontSize: "0.75rem" }}>Toca la cámara para cambiar foto</p>
        </div>
        <div className="mb-3">
          <label className="form-label small fw-semibold">Nombre completo</label>
          <input
            type="text"
            className="form-control"
            value={configForm.nombre}
            onChange={(e) => setConfigForm((f) => ({ ...f, nombre: e.target.value }))}
          />
        </div>
        <div className="mb-4">
          <label className="form-label small fw-semibold">Teléfono WhatsApp</label>
          <PhoneInput
            value={configForm.telefono_whatsapp}
            onChange={(v) => setConfigForm((f) => ({ ...f, telefono_whatsapp: v }))}
          />
        </div>
        {configMsg && <div className={`alert py-2 small ${configMsg.startsWith("✓") ? "alert-success" : "alert-danger"}`}>{configMsg}</div>}
        <button className="btn btn-brand w-100 py-3 fw-bold rounded-3" onClick={guardarConfig} disabled={savingConfig || !configForm.nombre.trim()}>
          {savingConfig ? <span className="spinner-border spinner-border-sm me-2" /> : null}
          Guardar
        </button>
      </BottomSheet>

      {/* ── Sheet: Seguridad / Cambiar contraseña ── */}
      <BottomSheet abierto={sheetSeguridad} onCerrar={() => setSheetSeguridad(false)} titulo="Cambiar contraseña">
        {["actual", "nueva", "confirmar"].map((k) => (
          <div className="mb-3" key={k}>
            <label className="form-label small fw-semibold">
              {{ actual: "Contraseña actual", nueva: "Nueva contraseña", confirmar: "Confirmar nueva contraseña" }[k]}
            </label>
            <PasswordInput
              value={passForm[k]}
              onChange={(e) => setPassForm((f) => ({ ...f, [k]: e.target.value }))}
              autoComplete={k === "actual" ? "current-password" : "new-password"}
            />
          </div>
        ))}
        {passMsg.texto && <div className={`alert alert-${passMsg.tipo} py-2 small`}>{passMsg.texto}</div>}
        <button className="btn btn-brand w-100 py-3 fw-bold rounded-3" onClick={cambiarPassword} disabled={savingPass || !passForm.actual || !passForm.nueva || !passForm.confirmar}>
          {savingPass ? <span className="spinner-border spinner-border-sm me-2" /> : null}
          Actualizar contraseña
        </button>
      </BottomSheet>

      {/* ── Modal: Cerrar sesión ── */}
      {sheetLogout && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title fw-bold">Cerrar sesión</h6>
                <button className="btn-close" onClick={() => setSheetLogout(false)} />
              </div>
              <div className="modal-body py-2">
                <p className="text-muted small mb-0">¿Seguro que quieres cerrar sesión?</p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setSheetLogout(false)}>Cancelar</button>
                <button className="btn btn-brand btn-sm" onClick={logout}>Cerrar sesión</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: Eliminar cuenta ── */}
      <BottomSheet abierto={sheetEliminar} onCerrar={() => setSheetEliminar(false)} titulo="Eliminar cuenta">
        <div className="alert alert-danger py-2 small mb-4">
          <i className="bi bi-exclamation-triangle-fill me-1" />
          Esta acción <strong>no se puede deshacer</strong>. Tu cuenta quedará desactivada y no podrás iniciar sesión.
        </div>
        <div className="mb-4">
          <label className="form-label small fw-semibold">Confirma tu contraseña para continuar</label>
          <PasswordInput
            value={passEliminar}
            onChange={(e) => setPassEliminar(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {eliminandoMsg && <div className="alert alert-danger py-2 small">{eliminandoMsg}</div>}
        <button
          className="btn btn-danger w-100 py-3 fw-bold rounded-3"
          onClick={eliminarCuenta}
          disabled={eliminando || !passEliminar}
        >
          {eliminando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
          Eliminar mi cuenta
        </button>
      </BottomSheet>

    </div>
  );
}
