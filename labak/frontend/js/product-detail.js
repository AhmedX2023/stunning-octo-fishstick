/* ===================================================
   Product detail page logic
=================================================== */

let currentProduct = null;
let selectedQty = 1;

async function initProductDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"));

  if (!id) {
    document.getElementById("product-detail-root").innerHTML = `<div class="empty-state"><div class="icon">😕</div><h3>المنتج غير موجود</h3></div>`;
    return;
  }

  try {
    currentProduct = await Api.getProduct(id);
    renderProductDetail(currentProduct);
    loadRelatedProducts(currentProduct);
  } catch (err) {
    document.getElementById("product-detail-root").innerHTML = `
      <div class="empty-state"><div class="icon">😕</div><h3>المنتج غير موجود أو تم إزالته</h3>
      <a href="shop.html" class="btn btn-primary" style="margin-top:20px">رجوع للمتجر</a></div>`;
  }
}

function renderProductDetail(p) {
  document.title = `${p.name} — لابك عندنا`;
  document.getElementById("breadcrumb-name").textContent = p.name;

  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const outOfStock = p.stock_quantity <= 0;

  const specs = [
    ["المعالج", p.cpu], ["كرت الشاشة", p.gpu], ["الذاكرة العشوائية", p.ram],
    ["التخزين", p.storage], ["الشاشة", p.screen], ["البطارية", p.battery],
    ["الوزن", p.weight], ["نظام التشغيل", p.os],
  ].filter(([, v]) => v);

  document.getElementById("product-detail-root").innerHTML = `
    <div class="breadcrumb">
      <a href="index.html">الرئيسية</a> / <a href="shop.html">المتجر</a> / ${escapeHtml(p.name)}
    </div>
    <div class="detail-grid">
      <div class="detail-media">
        <img src="${resolveImageUrl(p.image_url) || placeholderImage()}" alt="${escapeHtml(p.name)}">
      </div>
      <div>
        <div class="detail-brand">${escapeHtml(p.brand)}</div>
        <h1 class="detail-title">${escapeHtml(p.name)}</h1>

        <div class="detail-rating">
          <span class="stars">${"★".repeat(Math.round(p.rating))}${"☆".repeat(5 - Math.round(p.rating))}</span>
          <span class="text-faint" style="font-size:13px">(${p.rating.toFixed(1)} من 5)</span>
        </div>

        <div class="detail-price-row">
          <span class="detail-price-current price">${formatPrice(hasDiscount ? p.discount_price : p.price)}</span>
          ${hasDiscount ? `<span class="detail-price-old price">${formatPrice(p.price)}</span><span class="tag tag-pink">وفّر ${formatPrice(p.price - p.discount_price)}</span>` : ""}
        </div>

        <div class="stock-badge" style="color:${outOfStock ? "#f87171" : "var(--lime)"}">
          <span class="dot" style="background:${outOfStock ? "#f87171" : "var(--lime)"}"></span>
          ${outOfStock ? "نفذت الكمية حالياً" : `متوفر — ${p.stock_quantity} قطعة`}
        </div>

        <div class="detail-actions">
          <div class="qty-stepper">
            <button id="qty-minus" aria-label="تقليل">−</button>
            <span id="qty-display" class="font-num">1</span>
            <button id="qty-plus" aria-label="زيادة">+</button>
          </div>
          <button class="btn btn-primary" id="add-to-cart-detail" style="flex:1" ${outOfStock ? "disabled" : ""}>
            ${outOfStock ? "غير متوفر" : "أضف للسلة"}
          </button>
        </div>

        <div class="detail-tabs">
          <button class="detail-tab-btn active" data-tab="specs">المواصفات</button>
          <button class="detail-tab-btn" data-tab="desc">الوصف</button>
        </div>

        <div id="tab-specs">
          <table class="specs-table">
            ${specs.map(([label, val]) => `<tr><td>${label}</td><td>${escapeHtml(val)}</td></tr>`).join("")}
          </table>
        </div>
        <div id="tab-desc" class="hidden">
          <p class="detail-desc">${escapeHtml(p.description || "لا يوجد وصف إضافي لهذا المنتج حالياً.")}</p>
        </div>

        <div class="trust-row">
          <div class="trust-item"><span class="ic">🛡️</span> ضمان موثق</div>
          <div class="trust-item"><span class="ic">🚚</span> شحن لكل المحافظات</div>
          <div class="trust-item"><span class="ic">💬</span> دعم فوري واتساب</div>
        </div>
      </div>
    </div>
  `;

  bindProductDetailEvents(p, outOfStock);
}

function bindProductDetailEvents(p, outOfStock) {
  selectedQty = 1;
  const qtyDisplay = document.getElementById("qty-display");

  document.getElementById("qty-plus").addEventListener("click", () => {
    selectedQty = Math.min(selectedQty + 1, p.stock_quantity || 20);
    qtyDisplay.textContent = selectedQty;
  });
  document.getElementById("qty-minus").addEventListener("click", () => {
    selectedQty = Math.max(selectedQty - 1, 1);
    qtyDisplay.textContent = selectedQty;
  });

  if (!outOfStock) {
    document.getElementById("add-to-cart-detail").addEventListener("click", () => {
      Cart.add(p, selectedQty);
      showToast(`تمت إضافة ${selectedQty} × "${p.name}" للسلة`, "success");
    });
  }

  document.querySelectorAll(".detail-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".detail-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-specs").classList.toggle("hidden", btn.dataset.tab !== "specs");
      document.getElementById("tab-desc").classList.toggle("hidden", btn.dataset.tab !== "desc");
    });
  });
}

async function loadRelatedProducts(p) {
  try {
    const related = await Api.listProducts({ category_id: p.category?.id, page_size: 5 });
    const filtered = related.filter(r => r.id !== p.id).slice(0, 4);
    if (filtered.length === 0) return;

    document.getElementById("related-section").classList.remove("hidden");
    const grid = document.getElementById("related-grid");
    grid.innerHTML = filtered.map(renderProductCard).join("");
    bindProductCardEvents(grid, filtered);
  } catch (e) { /* تجاهل بصمت */ }
}

document.addEventListener("DOMContentLoaded", initProductDetailPage);
