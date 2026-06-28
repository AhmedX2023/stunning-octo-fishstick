/* ===================================================
   Admin Customers page logic
=================================================== */

async function initCustomersPage() {
  try {
    const users = await Api.adminListUsers();
    renderCustomersTable(users);
  } catch (err) {
    document.getElementById("customers-table-body").innerHTML = `<tr><td colspan="6" class="empty-mini">تعذر تحميل العملاء</td></tr>`;
  }
}

function renderCustomersTable(users) {
  const tbody = document.getElementById("customers-table-body");
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-mini">لا يوجد عملاء مسجلين بعد</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight:700">${escapeHtml(u.full_name)}</td>
      <td style="font-size:13px">${escapeHtml(u.email)}</td>
      <td class="font-num">${u.phone ? escapeHtml(u.phone) : "—"}</td>
      <td style="font-size:12.5px;color:var(--ink-faint)">${new Date(u.created_at).toLocaleDateString("ar-EG")}</td>
      <td><span class="status-pill" style="background:${u.is_active !== false ? "#A3E63622" : "#f8717122"};color:${u.is_active !== false ? "#A3E635" : "#f87171"}">${u.is_active !== false ? "نشط" : "معطل"}</span></td>
      <td><button class="btn btn-secondary btn-sm" data-toggle="${u.id}">${u.is_active !== false ? "تعطيل" : "تفعيل"}</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await Api.adminToggleUser(parseInt(btn.dataset.toggle));
        showToast("تم تحديث حالة الحساب", "success");
        await initCustomersPage();
      } catch (err) {
        showToast(err.message || "تعذر تحديث الحالة", "error");
        btn.disabled = false;
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!guardAdminAccess()) return;
  initCustomersPage();
});
