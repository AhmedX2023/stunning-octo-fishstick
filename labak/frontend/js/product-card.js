/* ===================================================
   Product Card Component — العنصر المميز بشكل "ملصق المواصفات"
=================================================== */

function renderProductCard(p) {
  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const outOfStock = p.stock_quantity <= 0;
  const lowStock = !outOfStock && p.stock_quantity <= 3;

  return `
    <div class="product-card" data-product-id="${p.id}">
      <a href="product.html?id=${p.id}" class="product-card-media">
        <div class="product-card-tags">
          ${hasDiscount ? `<span class="tag tag-pink">خصم ${Math.round((1 - p.discount_price / p.price) * 100)}%</span>` : ""}
          ${p.is_featured ? `<span class="tag tag-amber">مميز</span>` : ""}
          ${outOfStock ? `<span class="tag tag-red">نفذت الكمية</span>` : lowStock ? `<span class="tag tag-cyan">باقي ${p.stock_quantity}</span>` : ""}
        </div>
        <img src="${resolveImageUrl(p.image_url) || placeholderImage()}" alt="${escapeHtml(p.name)}" loading="lazy">
      </a>
      <div class="product-card-body">
        <div class="product-card-brand">${escapeHtml(p.brand)}</div>
        <a href="product.html?id=${p.id}"><h3 class="product-card-name">${escapeHtml(p.name)}</h3></a>

        <div class="spec-ticket">
          <div><span class="sv">${escapeHtml(shortSpec(p.cpu))}</span><span class="sl">المعالج</span></div>
          <div><span class="sv">${escapeHtml(p.ram || "—")}</span><span class="sl">رام</span></div>
          <div><span class="sv">${escapeHtml(shortSpec(p.gpu))}</span><span class="sl">جرافيك</span></div>
        </div>

        <div class="product-card-footer">
          <div class="product-price-block">
            ${hasDiscount ? `<span class="price-old price">${formatPrice(p.price)}</span>` : ""}
            <span class="price-current price">${formatPrice(hasDiscount ? p.discount_price : p.price)}</span>
          </div>
          <button class="add-cart-btn" data-add-to-cart="${p.id}" ${outOfStock ? "disabled" : ""} aria-label="أضف للسلة">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function shortSpec(text) {
  if (!text) return "—";
  return text.split(" ").slice(0, 2).join(" ");
}

function bindProductCardEvents(container, productsData) {
  container.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = parseInt(btn.dataset.addToCart);
      const product = productsData.find((p) => p.id === id);
      if (product) {
        Cart.add(product, 1);
        showToast(`تمت إضافة "${product.name}" للسلة`, "success");
      }
    });
  });
}

function skeletonCards(count = 8) {
  return Array.from({ length: count }).map(() => `<div class="skel skeleton-card"></div>`).join("");
}
