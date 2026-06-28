/* ===================================================
   Admin Reports page logic
=================================================== */

let currentRange = 14;
const BRAND_PALETTE = ["#7C3AED", "#F0339B", "#FBC02D", "#22D3EE", "#A3E635", "#9D5CFF", "#34D399"];

async function initReportsPage() {
  document.querySelectorAll("[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      currentRange = parseInt(btn.dataset.range);
      document.querySelectorAll("[data-range]").forEach(b => b.className = "btn btn-secondary btn-sm");
      btn.className = "btn btn-primary btn-sm";
      document.getElementById("sales-chart-title").textContent = `اتجاه المبيعات (آخر ${currentRange} يوم)`;
      loadSalesTrend();
    });
  });

  await Promise.all([loadOverview(), loadSalesTrend(), loadTopProducts(), loadBrandDistribution()]);
}

async function loadOverview() {
  try {
    const o = await Api.adminOverview();
    document.getElementById("reports-kpi-grid").innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(124,58,237,0.18)">💰</div>
        <div class="kpi-value price">${formatPrice(o.total_revenue)}</div>
        <div class="kpi-label">إجمالي الإيرادات (كل الوقت)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(240,51,155,0.18)">📅</div>
        <div class="kpi-value price">${formatPrice(o.today_revenue)}</div>
        <div class="kpi-label">إيرادات اليوم</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(251,192,45,0.18)">💻</div>
        <div class="kpi-value font-num">${o.total_products}</div>
        <div class="kpi-label">منتجات منشورة</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:rgba(239,68,68,0.18)">⚠️</div>
        <div class="kpi-value font-num">${o.out_of_stock_count}</div>
        <div class="kpi-label">منتج نفذت كميته</div>
      </div>
    `;
  } catch (err) { console.error(err); }
}

async function loadSalesTrend() {
  const container = document.getElementById("reports-sales-chart");
  container.innerHTML = `<div class="empty-mini">جاري التحميل...</div>`;
  try {
    const trend = await Api.adminSalesTrend(currentRange);
    const max = Math.max(...trend.map(d => d.revenue), 1);
    container.innerHTML = trend.map(d => {
      const heightPct = Math.max((d.revenue / max) * 100, 2);
      const dateLabel = new Date(d.date).toLocaleDateString("ar-EG", { day: "numeric", month: "numeric" });
      return `
        <div class="bar-chart-col" title="${formatPrice(d.revenue)} — ${d.orders_count} طلب">
          <div class="bar-chart-bar" style="height:${heightPct}%"></div>
          <div class="bar-chart-label font-num">${dateLabel}</div>
        </div>`;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div class="empty-mini">تعذر تحميل البيانات</div>`;
  }
}

async function loadTopProducts() {
  try {
    const products = await Api.adminTopProducts(10);
    const tbody = document.getElementById("reports-top-products");
    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-mini">لا توجد مبيعات بعد</td></tr>`;
      return;
    }
    tbody.innerHTML = products.map((p, i) => `
      <tr>
        <td class="font-num text-faint">${i + 1}</td>
        <td>${escapeHtml(p.name)}</td>
        <td class="font-num">${p.total_sold}</td>
        <td class="price">${formatPrice(p.total_revenue)}</td>
      </tr>
    `).join("");
  } catch (err) { console.error(err); }
}

async function loadBrandDistribution() {
  const container = document.getElementById("brand-distribution-chart");
  try {
    const data = await Api.adminBrandDistribution();
    if (data.length === 0) {
      container.innerHTML = `<div class="empty-mini">لا توجد منتجات بعد</div>`;
      return;
    }
    const total = data.reduce((sum, d) => sum + d.count, 0);
    container.innerHTML = data.map((d, i) => {
      const pct = Math.round((d.count / total) * 100);
      const color = BRAND_PALETTE[i % BRAND_PALETTE.length];
      return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
            <span style="font-weight:700">${escapeHtml(d.brand)}</span>
            <span class="font-num text-faint">${d.count} (${pct}%)</span>
          </div>
          <div style="height:8px;background:var(--bg-surface-2);border-radius:6px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:6px"></div>
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div class="empty-mini">تعذر تحميل البيانات</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!guardAdminAccess()) return;
  initReportsPage();
});
