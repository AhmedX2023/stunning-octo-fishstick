/* ===================================================
   Admin Orders page logic
=================================================== */

const ADMIN_STATUS_LABELS = {
  pending: "في الانتظار", confirmed: "تم التأكيد", processing: "جاري التجهيز",
  shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي",
};
const ADMIN_STATUS_COLORS = {
  pending: "#FBC02D", confirmed: "#22D3EE", processing: "#9D5CFF",
  shipped: "#A3E635", delivered: "#34D399", cancelled: "#f87171",
};

let allOrdersCache = [];
let currentStatusFilter = null;
let selectedOrderId = null;

async function initOrdersPage() {
  renderStatusFilterChips();
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => document.getElementById(btn.dataset.closeModal).classList.remove("open"));
  });
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
  });
  document.getElementById("update-order-status-btn").addEventListener("click", handleUpdateStatus);

  await loadOrders();
}

function renderStatusFilterChips() {
  const container = document.getElementById("status-filter-chips");
  const statuses = [null, "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  container.innerHTML = statuses.map(s => `
    <button class="btn ${currentStatusFilter === s ? "btn-primary" : "btn-secondary"} btn-sm" data-status-filter="${s || ""}">
      ${s ? ADMIN_STATUS_LABELS[s] : "الكل"}
    </button>
  `).join("");
  container.querySelectorAll("[data-status-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentStatusFilter = btn.dataset.statusFilter || null;
      renderStatusFilterChips();
      loadOrders();
    });
  });
}

async function loadOrders() {
  const tbody = document.getElementById("orders-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="empty-mini">جاري التحميل...</td></tr>`;
  try {
    allOrdersCache = await Api.adminListOrders({ status_filter: currentStatusFilter || undefined, page_size: 100 });
    renderOrdersTable(allOrdersCache);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-mini">تعذر تحميل الطلبات</td></tr>`;
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById("orders-table-body");
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-mini">لا توجد طلبات</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td class="font-num" style="font-weight:700">${o.order_number}</td>
      <td>${escapeHtml(o.customer_name)}</td>
      <td class="font-num" style="font-size:12.5px">${o.phone}</td>
      <td class="price">${formatPrice(o.total_amount)}</td>
      <td><span class="status-pill" style="background:${ADMIN_STATUS_COLORS[o.status]}22;color:${ADMIN_STATUS_COLORS[o.status]}">${ADMIN_STATUS_LABELS[o.status]}</span></td>
      <td style="font-size:12.5px;color:var(--ink-faint)">${new Date(o.created_at).toLocaleDateString("ar-EG")}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" data-view-order="${o.id}">عرض</button>
          <a href="https://wa.me/2${o.whatsapp.replace(/^0/, "")}" target="_blank" rel="noopener" class="btn btn-sm" style="background:#25D36622;color:#25D366">واتساب</a>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-view-order]").forEach(btn =>
    btn.addEventListener("click", () => openOrderDetail(parseInt(btn.dataset.viewOrder)))
  );
}

function openOrderDetail(orderId) {
  const order = allOrdersCache.find(o => o.id === orderId);
  if (!order) return;
  selectedOrderId = orderId;

  document.getElementById("order-detail-title").textContent = `طلب ${order.order_number}`;
  document.getElementById("order-detail-body").innerHTML = `
    <div style="margin-bottom:18px">
      <div style="font-weight:700;margin-bottom:6px">بيانات العميل</div>
      <div style="font-size:13.5px;color:var(--ink-dim);line-height:1.9">
        ${escapeHtml(order.customer_name)}<br>
        هاتف: <span class="font-num">${order.phone}</span> — واتساب: <span class="font-num">${order.whatsapp}</span><br>
        ${escapeHtml(order.city)} — ${escapeHtml(order.address)}
        ${order.notes ? `<br>ملاحظات: ${escapeHtml(order.notes)}` : ""}
      </div>
    </div>
    <div style="margin-bottom:18px">
      <div style="font-weight:700;margin-bottom:10px">المنتجات</div>
      ${order.items.map(i => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:13.5px">
          <span>${escapeHtml(i.product_name_snapshot)} × ${i.quantity}</span>
          <span class="price">${formatPrice(i.unit_price * i.quantity)}</span>
        </div>
      `).join("")}
    </div>
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px">
      <span>الإجمالي</span><span class="price">${formatPrice(order.total_amount)}</span>
    </div>
  `;

  document.getElementById("order-status-select").value = order.status;
  document.getElementById("order-detail-modal").classList.add("open");
}

async function handleUpdateStatus() {
  if (!selectedOrderId) return;
  const newStatus = document.getElementById("order-status-select").value;
  const btn = document.getElementById("update-order-status-btn");
  btn.disabled = true;
  btn.textContent = "جاري التحديث...";

  try {
    await Api.adminUpdateOrderStatus(selectedOrderId, newStatus);
    showToast("تم تحديث حالة الطلب", "success");
    document.getElementById("order-detail-modal").classList.remove("open");
    await loadOrders();
  } catch (err) {
    showToast(err.message || "تعذر تحديث الحالة", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "تحديث الحالة";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!guardAdminAccess()) return;
  initOrdersPage();
});
