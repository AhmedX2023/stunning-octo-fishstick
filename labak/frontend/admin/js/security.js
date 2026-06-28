/* ===================================================
   Admin Security Log page logic
=================================================== */

const EVENT_LABELS = {
  login_success: "تسجيل دخول ناجح",
  login_failed: "محاولة دخول فاشلة",
  login_blocked_locked: "محاولة دخول لحساب مقفل",
  account_locked: "تم قفل الحساب",
  register: "تسجيل حساب جديد",
};

let onlyFailures = false;

async function loadSecurityLogs() {
  const tbody = document.getElementById("security-table-body");
  tbody.innerHTML = `<tr><td colspan="5" class="empty-mini">جاري التحميل...</td></tr>`;
  try {
    const logs = await Api.adminSecurityLogs(onlyFailures);
    renderSecurityTable(logs);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-mini">تعذر تحميل السجل</td></tr>`;
  }
}

function renderSecurityTable(logs) {
  const tbody = document.getElementById("security-table-body");
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-mini">لا توجد أحداث مسجلة</td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${EVENT_LABELS[l.event_type] || l.event_type}</td>
      <td style="font-size:13px">${escapeHtml(l.email || "—")}</td>
      <td class="font-num" style="font-size:12.5px;color:var(--ink-faint)">${escapeHtml(l.ip_address || "—")}</td>
      <td><span class="status-pill" style="background:${l.success ? "#A3E63622" : "#f8717122"};color:${l.success ? "#A3E635" : "#f87171"}">${l.success ? "نجاح" : "فشل"}</span></td>
      <td style="font-size:12px;color:var(--ink-faint)">${new Date(l.created_at).toLocaleString("ar-EG")}</td>
    </tr>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!guardAdminAccess()) return;

  document.getElementById("filter-all-btn").addEventListener("click", (e) => {
    onlyFailures = false;
    document.getElementById("filter-all-btn").className = "btn btn-primary btn-sm";
    document.getElementById("filter-failures-btn").className = "btn btn-secondary btn-sm";
    loadSecurityLogs();
  });
  document.getElementById("filter-failures-btn").addEventListener("click", (e) => {
    onlyFailures = true;
    document.getElementById("filter-failures-btn").className = "btn btn-primary btn-sm";
    document.getElementById("filter-all-btn").className = "btn btn-secondary btn-sm";
    loadSecurityLogs();
  });

  loadSecurityLogs();
});
