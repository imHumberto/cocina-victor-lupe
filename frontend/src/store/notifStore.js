import { create } from "zustand";
import api from "../services/api";

const useNotifStore = create((set, get) => ({
  notificaciones: [],
  noLeidas: 0,

  fetchNotificaciones: async () => {
    const { data } = await api.get("/notificaciones/");
    const noLeidas = data.filter((n) => !n.leido).length;
    set({ notificaciones: data, noLeidas });
  },

  fetchCount: async () => {
    const { data } = await api.get("/notificaciones/no-leidas");
    set({ noLeidas: data.count });
  },

  agregarNotificacion: (notif) => {
    set((s) => ({
      notificaciones: [notif, ...s.notificaciones],
      noLeidas: s.noLeidas + 1,
    }));
  },

  marcarLeida: async (id) => {
    await api.patch(`/notificaciones/${id}/leer`);
    set((s) => ({
      notificaciones: s.notificaciones.map((n) =>
        n.id === id ? { ...n, leido: true } : n
      ),
      noLeidas: Math.max(0, s.noLeidas - 1),
    }));
  },

  leerTodas: async () => {
    await api.post("/notificaciones/leer-todas");
    set((s) => ({
      notificaciones: s.notificaciones.map((n) => ({ ...n, leido: true })),
      noLeidas: 0,
    }));
  },
}));

export default useNotifStore;
