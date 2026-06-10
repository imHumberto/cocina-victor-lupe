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
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 24px 40px",
    }}>
      {/* Logo */}
      <img
        src="/logo.svg"
        alt="La Cocina de Víctor y Lupe"
        style={{ width: 120, marginBottom: 32 }}
      />

      {/* Título */}
      <h1 style={{
        fontWeight: 900,
        fontSize: "2rem",
        letterSpacing: "0.04em",
        color: "var(--color-navy)",
        textTransform: "uppercase",
        marginBottom: 32,
        textAlign: "center",
      }}>
        Ingresar
      </h1>

      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 360 }}>
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "10px 14px",
            color: "#dc2626", fontSize: "0.85rem", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Teléfono */}
        <div style={{ marginBottom: 12 }}>
          <PhoneInput
            value={form.telefono_whatsapp}
            onChange={(v) => setForm({ ...form, telefono_whatsapp: v })}
            required
            style={{
              borderRadius: 10,
              border: "1.5px solid #d1d5db",
              background: "#fff",
              fontSize: "0.95rem",
            }}
          />
        </div>

        {/* Contraseña */}
        <div style={{ marginBottom: 24 }}>
          <PasswordInput
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete="current-password"
            placeholder="Contraseña"
            style={{
              borderRadius: 10,
              border: "1.5px solid #d1d5db",
              background: "#fff",
              fontSize: "0.95rem",
            }}
          />
        </div>

        {/* Botón */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 0",
            background: "var(--color-brand)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
        >
          {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
          Ingresar
        </button>
      </form>

      {/* Link solicitar cuenta */}
      <p style={{ marginTop: 24, fontSize: "0.85rem", color: "var(--color-muted)", textAlign: "center" }}>
        Si no cuentas con cuenta, puedes solicitar una{" "}
        <Link to="/registro" style={{ color: "var(--color-navy)", fontWeight: 700 }}>aquí.</Link>
      </p>
    </div>
  );
}
