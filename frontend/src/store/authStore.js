import { create } from "zustand";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  loading: true,

  init: async () => {
    const token = localStorage.getItem("token");
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, loading: false });
      connectSocket(token);
    } catch {
      localStorage.removeItem("token");
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (telefono_whatsapp, password) => {
    const { data } = await api.post("/auth/login", { telefono_whatsapp, password });
    localStorage.setItem("token", data.token);
    connectSocket(data.token);
    set({ user: data.user, token: data.token });
    return data.user;
  },

  logout: () => {
    localStorage.removeItem("token");
    disconnectSocket();
    set({ user: null, token: null });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
