import { useEffect, useState } from "react";
import api from "../../../services/api";
import PhoneInput from "../../../components/shared/PhoneInput";
import PasswordInput from "../../../components/shared/PasswordInput";

const FORM_VACIO = { nombre: "", telefono_whatsapp: "", password: "", rol: "cliente", direccion_entrega: "", empresa: "" };
const EDIT_VACIO = { nombre: "", telefono_whatsapp: "", password: "", rol: "cliente", direccion_entrega: "", empresa: "", activo: true };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [msg, setMsg] = useState({ texto: "", tipo: "info" });

  // Modal invitar
  const [modalInvite, setModalInvite] = useState(false);
  const [inviteGenerado, setInviteGenerado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // Modal editar
  const [editando, setEditando] = useState(null); // usuario completo
  const [editForm, setEditForm] = useState(EDIT_VACIO);
  const [editMsg, setEditMsg] = useState({ texto: "", tipo: "info" });

  useEffect(() => {
    api.get("/admin/usuarios").then(({ data }) => setUsuarios(data));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setEdit = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // ── Crear ──
  const crear = async (e) => {
    e.preventDefault();
    setMsg({ texto: "", tipo: "info" });
    if (form.rol === "cliente" && !form.direccion_entrega.trim()) {
      setMsg({ texto: "La dirección es requerida para clientes", tipo: "danger" });
      return;
    }
    try {
      const { data } = await api.post("/admin/usuarios", form);
      setUsuarios((us) => [...us, data]);
      setForm(FORM_VACIO);
      setMsg({ texto: `Usuario "${data.nombre}" creado`, tipo: "success" });
    } catch (err) {
      setMsg({ texto: err.response?.data?.error ?? "Error", tipo: "danger" });
    }
  };

  // ── Editar ──
  const abrirEditar = (u) => {
    setEditando(u);
    setEditForm({ nombre: u.nombre, telefono_whatsapp: u.telefono_whatsapp, password: "", rol: u.rol, direccion_entrega: u.direccion_entrega ?? "", empresa: u.empresa ?? "", activo: u.activo });
    setEditMsg({ texto: "", tipo: "info" });
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setEditMsg({ texto: "", tipo: "info" });
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      const { data } = await api.patch(`/admin/usuarios/${editando.id}`, payload);
      setUsuarios((us) => us.map((u) => u.id === data.id ? data : u));
      setEditMsg({ texto: "Guardado", tipo: "success" });
      setTimeout(() => setEditando(null), 800);
    } catch (err) {
      setEditMsg({ texto: err.response?.data?.error ?? "Error", tipo: "danger" });
    }
  };

  // ── Eliminar ──
  const eliminar = async (u) => {
    if (!confirm(`¿Eliminar a "${u.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/admin/usuarios/${u.id}`);
      setUsuarios((us) => us.filter((x) => x.id !== u.id));
    } catch (err) {
      alert(err.response?.data?.error ?? "Error al eliminar");
    }
  };

  // ── Invitar ──
  const abrirModalInvite = () => { setInviteGenerado(null); setCopiado(false); setModalInvite(true); };
  const generarInvite = async () => {
    const { data } = await api.post("/admin/invites");
    setInviteGenerado(`${window.location.origin}/registro/${data.token}`);
    setCopiado(false);
  };
  const copiarInvite = () => { navigator.clipboard.writeText(inviteGenerado); setCopiado(true); };

  const clientes = usuarios.filter((u) => u.rol === "cliente");
  const repartidores = usuarios.filter((u) => u.rol === "repartidor");
  const admins = usuarios.filter((u) => u.rol === "admin");

  const FilasUsuario = ({ lista, conDireccion }) => (
    <>
      {lista.map((u) => (
        <tr key={u.id}>
          <td>
            <div>{u.nombre}</div>
            {!u.activo && <span className="badge bg-secondary small">Inactivo</span>}
          </td>
          <td className="small">{u.telefono_whatsapp}</td>
          {conDireccion && (
            <td className="small">
              <div>{u.direccion_entrega ?? "—"}</div>
              {u.empresa && <div className="text-muted">{u.empresa}</div>}
            </td>
          )}
          <td>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-brand" onClick={() => abrirEditar(u)}>
                <i className="bi bi-pencil" />
              </button>
              <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(u)}>
                <i className="bi bi-trash" />
              </button>
            </div>
          </td>
        </tr>
      ))}
      {lista.length === 0 && (
        <tr><td colSpan="5" className="text-muted text-center py-2">Sin registros</td></tr>
      )}
    </>
  );

  return (
    <div className="p-4" style={{ height: "100%", overflowY: "auto" }}>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h5 fw-bold mb-0">Usuarios</h2>
        <button className="btn btn-sm btn-brand" onClick={abrirModalInvite}>
          <i className="bi bi-person-plus me-1" /> Invitar cliente
        </button>
      </div>

      <div className="row g-4">
        {/* Formulario crear */}
        <div className="col-md-4">
          <div className="card card-sazon p-3">
            <h6 className="fw-bold text-brand mb-3">Nuevo usuario</h6>
            {msg.texto && <div className={`alert alert-${msg.tipo} py-2`}>{msg.texto}</div>}
            <form onSubmit={crear}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Nombre</label>
                <input type="text" className="form-control form-control-sm" value={form.nombre} onChange={set("nombre")} required />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Número de teléfono</label>
                <PhoneInput value={form.telefono_whatsapp} onChange={(v) => setForm((f) => ({ ...f, telefono_whatsapp: v }))} required />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Contraseña</label>
                <PasswordInput className="form-control form-control-sm" value={form.password} onChange={set("password")} required autoComplete="new-password" />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Rol</label>
                <select className="form-select form-select-sm" value={form.rol} onChange={set("rol")}>
                  <option value="cliente">Cliente</option>
                  <option value="repartidor">Repartidor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.rol === "cliente" && (
                <>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Dirección de entrega</label>
                    <input type="text" className="form-control form-control-sm" value={form.direccion_entrega} onChange={set("direccion_entrega")} placeholder="Calle, número, colonia..." required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Empresa <span className="text-muted fw-normal">(opcional)</span></label>
                    <input type="text" className="form-control form-control-sm" value={form.empresa} onChange={set("empresa")} />
                  </div>
                </>
              )}
              <button type="submit" className="btn btn-sm btn-brand mt-1">Crear</button>
            </form>
          </div>
        </div>

        {/* Tablas */}
        <div className="col-md-8">
          {[
            { label: "Clientes", lista: clientes, conDireccion: true },
            { label: "Repartidores", lista: repartidores, conDireccion: false },
            { label: "Admins", lista: admins, conDireccion: false },
          ].map(({ label, lista, conDireccion }) => (
            <div key={label} className="mb-4">
              <h6 className="fw-bold text-muted mb-2">{label} ({lista.length})</h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      {conDireccion && <th>Dirección / Empresa</th>}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <FilasUsuario lista={lista} conDireccion={conDireccion} />
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal editar usuario */}
      {editando && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Editar — {editando.nombre}</h6>
                <button className="btn-close" onClick={() => setEditando(null)} />
              </div>
              <form onSubmit={guardarEdicion}>
                <div className="modal-body">
                  {editMsg.texto && <div className={`alert alert-${editMsg.tipo} py-2`}>{editMsg.texto}</div>}
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Nombre</label>
                      <input type="text" className="form-control form-control-sm" value={editForm.nombre} onChange={setEdit("nombre")} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Teléfono</label>
                      <input type="tel" className="form-control form-control-sm" value={editForm.telefono_whatsapp} onChange={setEdit("telefono_whatsapp")} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Nueva contraseña <span className="text-muted fw-normal">(dejar vacío para no cambiar)</span></label>
                      <PasswordInput className="form-control form-control-sm" value={editForm.password} onChange={setEdit("password")} autoComplete="new-password" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Rol</label>
                      <select className="form-select form-select-sm" value={editForm.rol} onChange={setEdit("rol")}>
                        <option value="cliente">Cliente</option>
                        <option value="repartidor">Repartidor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="col-md-6 d-flex align-items-end pb-1">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="editActivo" checked={editForm.activo} onChange={setEdit("activo")} />
                        <label className="form-check-label small" htmlFor="editActivo">Activo</label>
                      </div>
                    </div>
                    {editForm.rol === "cliente" && (
                      <>
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Dirección de entrega</label>
                          <input type="text" className="form-control form-control-sm" value={editForm.direccion_entrega} onChange={setEdit("direccion_entrega")} />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-semibold">Empresa <span className="text-muted fw-normal">(opcional)</span></label>
                          <input type="text" className="form-control form-control-sm" value={editForm.empresa} onChange={setEdit("empresa")} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditando(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-sm btn-brand">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal invitar */}
      {modalInvite && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Invitar nuevo cliente</h6>
                <button className="btn-close" onClick={() => setModalInvite(false)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  Genera un link de un solo uso. Cuando el cliente lo use para registrarse, el link queda inválido automáticamente.
                </p>
                {!inviteGenerado ? (
                  <div className="text-center py-3">
                    <button className="btn btn-brand px-4" onClick={generarInvite}>
                      <i className="bi bi-link-45deg me-2" /> Generar link
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="form-label small fw-semibold">Link de invitación</label>
                    <div className="input-group mb-2">
                      <input type="text" className="form-control form-control-sm" value={inviteGenerado} readOnly onClick={(e) => e.target.select()} />
                      <button className="btn btn-outline-secondary btn-sm" onClick={copiarInvite}>
                        <i className={`bi ${copiado ? "bi-check-lg text-success" : "bi-clipboard"}`} />
                      </button>
                    </div>
                    {copiado && <div className="text-success small mb-2">¡Copiado!</div>}
                    <div className="alert alert-warning py-2 small mb-0">
                      <i className="bi bi-exclamation-triangle me-1" />
                      Este link solo funciona <strong>una vez</strong>.
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                {inviteGenerado && (
                  <button className="btn btn-sm btn-outline-brand me-auto" onClick={generarInvite}>
                    <i className="bi bi-arrow-clockwise me-1" /> Generar otro
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
