/**
 * Formatea un número mexicano almacenado como +523310542404
 * → +52 (33) 1054 2404
 */
export function formatTelefono(tel) {
  const digits = (tel ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("52")) {
    const local = digits.slice(2); // 10 dígitos locales
    return `+52 (${local.slice(0, 2)}) ${local.slice(2, 6)} ${local.slice(6)}`;
  }
  return tel ?? "";
}
