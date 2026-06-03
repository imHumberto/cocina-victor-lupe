import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../../../store/authStore";
import PhoneInput from "../../../components/shared/PhoneInput";
import PasswordInput from "../../../components/shared/PasswordInput";

export default function LoginPage() {
  const [form, setForm] = useState({ telefono_whatsapp: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.telefono_whatsapp, form.password);
      if (user.rol === "admin") navigate("/admin/pedidos");
      else if (user.rol === "repartidor") navigate("/repartidor/pedidos");
      else navigate("/cliente/inicio");
    } catch (err) {
      setError(err.response?.data?.error ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-brand-light p-3" style={{ background: "var(--color-brand-light)" }}>
      <div className="card card-sazon p-4 w-100" style={{ maxWidth: 400 }}>
        <div className="text-center mb-4">
          <h1 className="h4 fw-bold text-brand">La Cocina de Víctor y Lupe 🍽️</h1>
          <p className="text-muted small">Comida corrida a domicilio</p>
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Número de teléfono</label>
            <PhoneInput
              value={form.telefono_whatsapp}
              onChange={(v) => setForm({ ...form, telefono_whatsapp: v })}
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">Contraseña</label>
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-brand w-100 py-2 fw-semibold" disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
