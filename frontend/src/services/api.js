import axios from "axios";

let accessToken = null;
let refreshPromise = null;

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function setAccessToken(token) {
  accessToken = token || null;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url || "";
    const isAuthRequest = /\/auth\/(login|register|refresh|logout)/.test(url);

    if (error.response?.status !== 401 || !original || original._retried || isAuthRequest) {
      return Promise.reject(error);
    }

    original._retried = true;
    try {
      if (!refreshPromise) {
        refreshPromise = api.post("/auth/refresh", {}, { skipAuthRefresh: true })
          .then(({ data }) => {
            setAccessToken(data.accessToken);
            return data.accessToken;
          })
          .finally(() => { refreshPromise = null; });
      }
      const token = await refreshPromise;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshError) {
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent("dostidue:session-expired"));
      return Promise.reject(refreshError);
    }
  }
);

export async function registerUser({ name, email, password }) {
  const { data } = await api.post("/auth/register", { name, email, password });
  return data;
}

export async function loginUser({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function restoreSession() {
  if (!refreshPromise) {
    refreshPromise = api.post("/auth/refresh", {}, { skipAuthRefresh: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return api.get("/auth/test");
      })
      .then(({ data }) => data.user)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function logoutUser() {
  try {
    await api.post("/auth/logout", {}, { skipAuthRefresh: true });
  } finally {
    setAccessToken(null);
  }
}

export const groupsApi = {
  list: () => api.get("/groups").then(({ data }) => data.groups),
  get: (groupId) => api.get(`/groups/${groupId}`).then(({ data }) => data.group),
  create: (payload) => api.post("/groups", payload).then(({ data }) => data.group),
  update: (groupId, payload) => api.put(`/groups/${groupId}`, payload).then(({ data }) => data.group),
  remove: (groupId) => api.delete(`/groups/${groupId}`),
  addMember: (groupId, email) => api.post(`/groups/${groupId}/members`, { email }),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  expenses: (groupId) => api.get(`/groups/${groupId}/expenses`).then(({ data }) => data.expenses),
  addExpense: (groupId, payload) => api.post(`/groups/${groupId}/expenses`, payload).then(({ data }) => data.expense),
  updateExpense: (groupId, expenseId, payload) => api.put(`/groups/${groupId}/expenses/${expenseId}`, payload).then(({ data }) => data.expense),
  removeExpense: (groupId, expenseId) => api.delete(`/groups/${groupId}/expenses/${expenseId}`),
  balances: (groupId) => api.get(`/groups/${groupId}/balances`).then(({ data }) => data),
  settlements: (groupId) => api.get(`/groups/${groupId}/settlements`).then(({ data }) => data.settlements),
  recordPayment: (groupId, payeeId, amount) => api.post(`/groups/${groupId}/settlements`, { payeeId, amount }),
  removePayment: (groupId, settlementId) => api.delete(`/groups/${groupId}/settlements/${settlementId}`),
};
