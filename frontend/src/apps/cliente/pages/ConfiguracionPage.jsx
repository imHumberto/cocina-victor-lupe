import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import PhoneInput from "../../../components/shared/PhoneInput";

const FOTO_KEY = (id) => `perfil_foto_${id}`;

function Avatar({ nombre, userId, onFotoChange }) {
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
      onFotoChange?.();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="perfil-avatar" style={{ margin: "0 auto" }}>
      {foto
        ? <img src={foto} alt="foto" className="perfil-avatar__img" />
        : <div className="perfil-avatar__iniciales">{letras}</div>
      }
      <button
        type="button"
        className="btn btn-sm rounded-circle position-absolute d-flex align-items-center justify-content-center perfil-avatar__camara"
        onClick={() => fotoRef.current.click()}
      >
        <i className="bi bi-camera-fill perfil-avatar__camara-icon" />
      </button>
      <input ref={fotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
    </div>
  );
}

export default function ConfiguracionPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({ nombre: user.nombre, telefono_whatsapp: user.telefono_whatsapp ?? "" });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    setSaving(true);
    setMsg("");
    try {
      const { data } = await api.patch("/auth/perfil", {
        nombre: form.nombre.trim(),
        telefono_whatsapp: form.telefono_whatsapp.trim(),
      });
      setUser(data);
      setMsg("✓ Guardado");
      setTimeout(() => navigate(-1), 900);
    } catch (err) {
      setMsg(err.response?.data?.error ?? "Error al guardar");
    } finally { setSaving(false); }
  };

  return (
    <div className="cliente-page">
      {/* Header con back */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--color-navy)" }}
        >
          <i className="bi bi-chevron-left fs-5" />
        </button>
        <h2 className="fw-bold mb-0" style={{ fontSize: "1.2rem" }}>Configuración</h2>
      </div>

      {/* Avatar */}
      <div className="text-center mb-4">
        <Avatar nombre={form.nombre || user.nombre} userId={user.id} onFotoChange={() => {}} />
        <p className="text-muted mt-2 mb-0" style={{ fontSize: "0.75rem" }}>Toca la cámara para cambiar foto</p>
      </div>

      {/* Formulario */}
      <div className="mb-3">
        <label className="form-label small fw-semibold">Nombre completo</label>
        <input
          type="text"
          className="form-control"
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
        />
      </div>
      <div className="mb-4">
        <label className="form-label small fw-semibold">Teléfono WhatsApp</label>
        <PhoneInput
          value={form.telefono_whatsapp}
          onChange={(v) => setForm((f) => ({ ...f, telefono_whatsapp: v }))}
        />
      </div>

      {msg && (
        <div className={`alert py-2 small ${msg.startsWith("✓") ? "alert-success" : "alert-danger"}`}>{msg}</div>
      )}

      <button
        className="btn btn-brand w-100 py-3 fw-bold rounded-3"
        onClick={guardar}
        disabled={saving || !form.nombre.trim()}
      >
        {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
        Guardar
      </button>
    </div>
  );
}
