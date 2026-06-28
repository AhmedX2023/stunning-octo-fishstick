/* ===================================================
   Admin Dashboard logic
=================================================== */

const STATUS_COLORS = {
  pending: "#FBC02D", confirmed: "#22D3EE", processing: "#9D5CFF",
  shipped: "#A3E635", delivered: "#34D399", cancelled: "#f87171",
};
const STATUS_LABELS = {
  pending: "في الانتظار", confirmed: "تم التأكيد", processing: "جاري التجهيز",
  shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي",
};

async function initDashboard() {
  document.getElementById("today-date").textContent = new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  try {
    const [overview, trend, topProducts, statusBreakdown, lowStock] = await Promise.all([
      Api.adminOverview(),
      Api.adminSalesTrend(14),
      Api.adminTopProducts(6),
      Api.adminOrdersByStatus(),
      Api.adminLowStock(3),
    ]);

    renderKpis(overview);
    renderSalesChart(trend);
    renderStatusDonut(statusBreakdown);
    renderTopProductsTable(topProducts);
    renderLowStockList(lowStock);
  } catch (err) {
    console.error(err);
    showToast(err.message || "تعذر تحميل بيانات اللوحة", "error");
  }
}

function renderKpis(o) {
  const grid = document.getElementById("kpi-grid");
  grid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-icon" style="background:rgba(124,58,237,0.18)">💰</div>
      <div class="kpi-value price">${formatPrice(o.month_revenue)}</div>
      <div class="kpi-label">إيرادات الشهر الحالي</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:rgba(240,51,155,0.18)">📦</div>
      <div class="kpi-value font-num">${o.total_orders}</div>
      <div class="kpi-label">إجمالي الطلبات</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:rgba(251,192,45,0.18)">⏳</div>
      <div class="kpi-value font-num">${o.pending_orders}</div>
      <div class="kpi-label">طلبات بانتظار المراجعة</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:rgba(34,211,238,0.18)">👥</div>
      <div class="kpi-value font-num">${o.total_customers}</div>
      <div class="kpi-label">إجمالي العملاء</div>
    </div>
  `;

  if (o.out_of_stock_count > 0 || o.low_stock_count > 0) {
    showToast(`تنبيه: ${o.out_of_stock_count} منتج نفذ و ${o.low_stock_count} على وشك النفاد`, "error", 5000);
  }
}

function renderSalesChart(trend) {
  const max = Math.max(...trend.map(d => d.revenue), 1);
  const container = document.getElementById("sales-chart");
  container.innerHTML = trend.map(d => {
    const heightPct = Math.max((d.revenue / max) * 100, 2);
    const dateLabel = new Date(d.date).toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" });
    return `
      <div class="bar-chart-col" title="${formatPrice(d.revenue)} — ${d.orders_count} طلب">
        <div class="bar-chart-bar" style="height:${heightPct}%"></div>
        <div class="bar-chart-label font-num">${dateLabel}</div>
      </div>
    `;
  }).join("");
}

function renderStatusDonut(breakdown) {
  const container = document.getElementById("status-donut");
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  if (total === 0) {
    container.innerHTML = `<div class="empty-mini">لا توجد طلبات بعد</div>`;
    return;
  }

  let cumulative = 0;
  const gradientParts = [];
  Object.entries(breakdown).forEach(([status, count]) => {
    const pct = (count / total) * 100;
    const color = STATUS_COLORS[status] || "#999";
    gradientParts.push(`${color} ${cumulative}% ${cumulative + pct}%`);
    cumulative += pct;
  });

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <div style="width:140px;height:140px;border-radius:50%;background:conic-gradient(${gradientParts.join(",")});flex-shrink:0;position:relative">
        <div style="position:absolute;inset:18px;background:var(--bg-surface);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column">
          <span class="font-num" style="font-size:20px;font-weight:800">${total}</span>
          <span style="font-size:10px;color:var(--ink-faint)">إجمالي</span>
        </div>
      </div>
      <div class="donut-legend">
        ${Object.entries(breakdown).map(([status, count]) => `
          <div class="donut-legend-item">
            <span class="donut-legend-dot" style="background:${STATUS_COLORS[status] || "#999"}"></span>
            <span>${STATUS_LABELS[status] || status}</span>
            <span class="font-num text-faint" style="margin-right:auto">${count}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderTopProductsTable(products) {
  const tbody = document.querySelector("#top-products-table tbody");
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-mini">لا توجد مبيعات بعد</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td class="font-num">${p.total_sold}</td>
      <td class="price">${formatPrice(p.total_revenue)}</td>
    </tr>
  `).join("");
}

function renderLowStockList(items) {
  const container = document.getElementById("low-stock-list");
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-mini">كل المنتجات بكمية جيدة 👍</div>`;
    return;
  }
  container.innerHTML = items.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)">
      <div>
        <div style="font-weight:700;font-size:13.5px">${escapeHtml(p.name)}</div>
        <div style="font-size:11.5px;color:var(--ink-faint)">${escapeHtml(p.brand)}</div>
      </div>
      <span class="status-pill" style="background:${p.stock_quantity === 0 ? "#f8717122" : "#FBC02D22"};color:${p.stock_quantity === 0 ? "#f87171" : "#FBC02D"}">
        ${p.stock_quantity === 0 ? "نفذت" : `${p.stock_quantity} قطعة`}
      </span>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!guardAdminAccess()) return;
  initDashboard();
});
