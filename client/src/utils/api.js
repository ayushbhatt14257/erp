import axios from 'axios';
import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('erp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('erp_token');
      localStorage.removeItem('erp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Issue 3 fix: authenticated file download via axios blob ──────────────────
// Plain <a href> / window.open cannot send Authorization headers.
// This function fetches the file through axios (which adds the JWT header),
// creates a temporary blob URL, clicks it, then revokes it.
export async function downloadFile(path, filename) {
  try {
    const response = await api.get(path, { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    throw new Error('Download failed: ' + (err.response?.data?.message || err.message));
  }
}

// ── Socket.IO singleton ───────────────────────────────────────────────────────
let socket = null;
export function getSocket() {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL || window.location.origin;
    socket = io(url, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}
