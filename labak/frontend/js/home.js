/* ===================================================
   Home page logic
=================================================== */

const CATEGORY_ICONS = {
  gaming: "🎮", business: "💼", students: "🎓", workstation: "🎨",
};

async function initHomePage() {
  try {
    const [products, categories, brands] = await Promise.all([
      Api.listProducts({ featured_only: true, page_size: 8 }),
      Api.listCategories(),
      Api.listBrands(),
    ]);

    document.getElementById("stat-products").textContent = products.length >= 8 ? "+40" : products.length;

    renderHeroProduct(products);
    renderCategories(categories);
    renderBrandStrip(brands.length ? brands : ["ASUS", "Lenovo", "Apple", "Dell", "HP", "MSI", "Acer"]);
    renderFeaturedGrid(products);
  } catch (err) {
    console.error(err);
    showToast("تعذر تحميل المنتجات، تأكد من تشغيل السيرفر", "error");
  }
}

function renderHeroProduct(products) {
  if (!products.length) return;
  const p = products[0];
  document.getElementById("hero-laptop-img").src = resolveImageUrl(p.image_url) || placeholderImage();
  document.getElementById("hero-spec-cpu").textContent = shortSpec(p.cpu);
  document.getElementById("hero-spec-ram").textContent = p.ram || "—";
  document.getElementById("hero-spec-price").textContent = formatPrice(p.discount_price || p.price);
}

function renderCategories(categories) {
  const row = document.getElementById("category-row");
  if (!categories.length) {
    row.innerHTML = `<p class="text-faint">لا توجد فئات بعد</p>`;
    return;
  }
  row.innerHTML = categories.map(c => `
    <a href="shop.html?category=${c.id}" class="category-pill">
      <span>${CATEGORY_ICONS[c.slug] || "💻"}</span>
      <span>${escapeHtml(c.name)}</span>
    </a>
  `).join("");
}

function renderBrandStrip(brands) {
  const track = document.getElementById("brand-track");
  const doubled = [...brands, ...brands];
  track.innerHTML = doubled.map(b => `<span>${escapeHtml(b)}</span>`).join("");
}

function renderFeaturedGrid(products) {
  const grid = document.getElementById("featured-grid");
  if (!products.length) {
    grid.innerHTML = `<p class="text-faint">لا توجد منتجات مميزة حالياً</p>`;
    return;
  }
  grid.innerHTML = products.map(renderProductCard).join("");
  bindProductCardEvents(grid, products);
}

document.addEventListener("DOMContentLoaded", initHomePage);
