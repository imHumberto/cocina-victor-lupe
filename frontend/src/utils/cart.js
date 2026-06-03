import dayjs from "dayjs";

const KEY = (userId) => `cart_${userId}_${dayjs().format("YYYY-MM-DD")}`;

export function saveCart(userId, data) {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(data));
  } catch {}
}

export function loadCart(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearCart(userId) {
  try {
    localStorage.removeItem(KEY(userId));
  } catch {}
}

export function hasCart(userId) {
  return !!loadCart(userId);
}
