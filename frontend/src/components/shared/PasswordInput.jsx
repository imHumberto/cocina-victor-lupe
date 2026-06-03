import { useState } from "react";

export default function PasswordInput({ value, onChange, placeholder, className = "form-control", required, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group">
      <input
        type={visible ? "text" : "password"}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
      />
      <button type="button" className="btn btn-outline-secondary" onClick={() => setVisible((v) => !v)} tabIndex={-1}>
        <i className={`bi ${visible ? "bi-eye-slash" : "bi-eye"}`} />
      </button>
    </div>
  );
}
