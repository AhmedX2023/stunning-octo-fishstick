/* ===================================================
   Account page logic
=================================================== */

const ORDER_STATUS_LABELS = {
  pending: { label: "في الانتظار", color: "var(--amber)" },
  confirmed: { label: "تم التأكيد", color: "var(--cyan)" },
  processing: { label: "جاري التجهيز", color: "var(--violet-bright)" },
  shipped: { label: "تم الشحن", color: "var(--lime)" },
  delivered: { label: "تم التسليم", color: "var(--lime)" },
  cancelled: { label: "ملغي", color: "#f87171" },
};

async function initAccountPage() {
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html?redirect=" + encodeURIComponent("account.html");
    return;
  }

  const user = Auth.getUser();
  document.getElementById("account-avatar").textContent = (user.full_name || "؟")[0];
  document.getElementById("account-name").textContent = user.full_name;
  document.getElementById("account-email").textContent = user.email;

  if (user.role === "admin") {
    document.getElementById("admin-link").classList.remove("hidden");
  }

  document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    Auth.clearSession();
    window.location.href = "index.html";
  });

  try {
    const orders = await Api.myOrders();
    renderOrdersList(orders);
  } catch (err) {
    document.getElementById("orders-list").innerHTML = `<p class="text-faint">تعذر تحميل الطلبات</p>`;
  }
}

function renderOrdersList(orders) {
  const container = document.getElementById("orders-list");
  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📦</div>
        <h3 style="margin-bottom:8px">لسه معملتش أي طلب</h3>
        <p class="text-faint" style="margin-bottom:20px">دور على لابتوب يعجبك وابدأ أول طلب ليك</p>
        <a href="shop.html" class="btn btn-primary">تصفح المتجر</a>
      </div>`;
    return;
  }

  container.innerHTML = orders.map(order => {
    const statusInfo = ORDER_STATUS_LABELS[order.status] || { label: order.status, color: "var(--ink-faint)" };
    const itemsSummary = order.items.map(i => `${i.product_name_snapshot} ×${i.quantity}`).join("، ");
    return `
      <div class="order-row">
        <div class="order-row-head">
          <span class="order-num">${order.order_number}</span>
          <span class="order-status-badge" style="background:${statusInfo.color}22;color:${statusInfo.color}">${statusInfo.label}</span>
        </div>
        <div class="order-items-mini">${escapeHtml(itemsSummary)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
          <span class="text-faint" style="font-size:12px">${new Date(order.created_at).toLocaleDateString("ar-EG")}</span>
          <span class="price" style="font-weight:800">${formatPrice(order.total_amount)}</span>
        </div>
      </div>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", initAccountPage);
