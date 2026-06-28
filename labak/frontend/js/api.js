/* ===================================================
   API Client — التواصل مع الباك إند FastAPI
=================================================== */

const API_BASE = (() => {
  // اضبط هذا الرابط ليطابق عنوان السيرفر الفعلي عند النشر
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return "http://localhost:8000";
  }
  return window.LABAK_API_BASE || "http://localhost:8000";
})();

const TOKEN_KEY = "labak_access_token";
const REFRESH_KEY = "labak_refresh_token";
const USER_KEY = "labak_user";

const Auth = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
  isAdmin: () => {
    const u = Auth.getUser();
    return u && u.role === "admin";
  },
  setSession: (data) => {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/**
 * استدعاء عام للـ API مع تجديد تلقائي للتوكن عند انتهاء الصلاحية
 */
async function apiFetch(path, options = {}, _retried = false) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = Auth.getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // لو فيه FormData، نشيل content-type عشان المتصفح يحطه صح مع boundary
  if (options.body instanceof FormData) delete headers["Content-Type"];

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    throw new ApiError("تعذر الاتصال بالسيرفر. تأكد من تشغيل الباك إند.", 0, {});
  }

  if (response.status === 401 && !_retried && Auth.getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return apiFetch(path, options, true);
    Auth.clearSession();
  }

  let data = null;
  try { data = await response.json(); } catch (e) { /* بدون محتوى */ }

  if (!response.ok) {
    const message = (data && (data.detail || (data.errors && data.errors[0]?.message))) || "حدث خطأ غير متوقع";
    throw new ApiError(message, response.status, data);
  }

  return data;
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function tryRefreshToken() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: Auth.getRefreshToken() }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    Auth.setSession(data);
    return true;
  } catch (e) {
    return false;
  }
}

/* ===================== API نهايات الخدمة ===================== */

const Api = {
  // ---- Auth ----
  register: (payload) => apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => apiFetch("/api/auth/me"),

  // ---- Products ----
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    return apiFetch(`/api/products?${qs.toString()}`);
  },
  getProduct: (id) => apiFetch(`/api/products/${id}`),
  listBrands: () => apiFetch("/api/products/brands"),
  listCategories: () => apiFetch("/api/products/categories"),

  // ---- Orders ----
  createOrder: (payload) => apiFetch("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  myOrders: () => apiFetch("/api/orders/my-orders"),
  trackOrder: (orderNumber) => apiFetch(`/api/orders/track/${encodeURIComponent(orderNumber)}`),

  // ---- Admin: Products ----
  adminCreateProduct: (payload) => apiFetch("/api/products/admin/create", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateProduct: (id, payload) => apiFetch(`/api/products/admin/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  adminDeleteProduct: (id) => apiFetch(`/api/products/admin/${id}`, { method: "DELETE" }),
  adminUploadImage: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch(`/api/products/admin/${id}/upload-image`, { method: "POST", body: fd });
  },
  adminCreateCategory: (name) => apiFetch(`/api/products/admin/categories?name=${encodeURIComponent(name)}`, { method: "POST" }),

  // ---- Admin: Orders ----
  adminListOrders: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    return apiFetch(`/api/orders/admin/all?${qs.toString()}`);
  },
  adminUpdateOrderStatus: (id, status) => apiFetch(`/api/orders/admin/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // ---- Admin: Users ----
  adminListUsers: () => apiFetch("/api/admin/users"),
  adminToggleUser: (id) => apiFetch(`/api/admin/users/${id}/toggle-active`, { method: "PUT" }),

  // ---- Admin: Reports ----
  adminOverview: () => apiFetch("/api/admin/reports/overview"),
  adminSalesTrend: (days = 14) => apiFetch(`/api/admin/reports/sales-trend?days=${days}`),
  adminTopProducts: (limit = 10) => apiFetch(`/api/admin/reports/top-products?limit=${limit}`),
  adminOrdersByStatus: () => apiFetch("/api/admin/reports/orders-by-status"),
  adminLowStock: (threshold = 3) => apiFetch(`/api/admin/reports/low-stock?threshold=${threshold}`),
  adminSecurityLogs: (onlyFailures = false) => apiFetch(`/api/admin/reports/security-logs?only_failures=${onlyFailures}`),
  adminBrandDistribution: () => apiFetch("/api/admin/reports/brand-distribution"),
};

function resolveImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}
