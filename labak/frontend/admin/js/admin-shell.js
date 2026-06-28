/* ===================================================
   Admin Shell — حماية الوصول + تخطيط القائمة الجانبية المشترك
=================================================== */

const ADMIN_NAV = [
  { key: "dashboard", href: "index.html", label: "نظرة عامة", icon: "📊" },
  { key: "products", href: "products.html", label: "المنتجات", icon: "💻" },
  { key: "orders", href: "orders.html", label: "الطلبات", icon: "📦" },
  { key: "customers", href: "customers.html", label: "العملاء", icon: "👥" },
  { key: "reports", href: "reports.html", label: "التقارير", icon: "📈" },
  { key: "security", href: "security.html", label: "سجل الأمان", icon: "🔒" },
];

function guardAdminAccess() {
  if (!Auth.isLoggedIn() || !Auth.isAdmin()) {
    window.location.href = "../login.html?redirect=" + encodeURIComponent("admin/index.html");
    return false;
  }
  return true;
}

function renderAdminShell(activeKey, pageTitle) {
  const user = Auth.getUser();

  const navHtml = ADMIN_NAV.map(item => `
    <a href="${item.href}" class="${activeKey === item.key ? "active" : ""}">
      <span class="ic">${item.icon}</span><span>${item.label}</span>
    </a>
  `).join("");

  document.getElementById("admin-sidebar-root").innerHTML = `
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="admin-logo">
        <span class="mark">💻</span>
        <span>لابك عندنا <span style="color:var(--ink-faint);font-weight:600;font-size:12px">أدمن</span></span>
      </div>
      <nav class="admin-nav">
        <div class="admin-nav-label">القائمة الرئيسية</div>
        ${navHtml}
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user-chip">
          <span class="avatar">${(user?.full_name || "أ")[0]}</span>
          <div class="info">
            <div class="name">${escapeHtml(user?.full_name || "")}</div>
            <div class="role">مدير المنصة</div>
          </div>
        </div>
        <a href="../index.html" class="btn btn-ghost btn-sm" style="width:100%;margin-bottom:6px">عرض المتجر</a>
        <button class="btn btn-danger btn-sm" id="admin-logout-btn" style="width:100%">تسجيل الخروج</button>
      </div>
    </aside>
  `;

  document.getElementById("admin-topbar-title").textContent = pageTitle;

  document.getElementById("admin-logout-btn").addEventListener("click", () => {
    Auth.clearSession();
    window.location.href = "../index.html";
  });

  const mobileToggle = document.getElementById("admin-mobile-toggle");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      document.getElementById("admin-sidebar").classList.toggle("open");
    });
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function formatPrice(value) {
  const n = Math.round(value);
  return n.toLocaleString("en-US") + " ج.م";
}

function resolveImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

function placeholderImage() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" fill="#211a38"/>
      <text x="50%" y="50%" font-size="11" fill="#8A82A8" text-anchor="middle" dy=".3em">لا توجد صورة</text>
    </svg>`);
}

function ensureToastStack() {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, type = "success", duration = 3500) {
  const stack = ensureToastStack();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  toast.innerHTML = `<span style="font-weight:900">${icon}</span><span>${escapeHtml(message)}</span>`;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity .3s, transform .3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!guardAdminAccess()) return;
  const page = document.body.dataset.adminPage || "";
  const title = document.body.dataset.pageTitle || "";
  renderAdminShell(page, title);
});
