/* ===================================================
   Shop page logic
=================================================== */

const shopState = {
  search: "",
  category_id: null,
  brand: null,
  min_price: null,
  max_price: null,
  sort_by: "newest",
  featured_only: false,
};

let allCategories = [];
let allBrands = [];
let debounceTimer = null;

async function initShopPage() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("featured")) shopState.featured_only = true;
  if (urlParams.get("category")) shopState.category_id = parseInt(urlParams.get("category"));

  try {
    [allCategories, allBrands] = await Promise.all([Api.listCategories(), Api.listBrands()]);
    renderCategoryFilters();
    renderBrandFilters();
  } catch (e) { console.error(e); }

  bindShopEvents();
  await loadProducts();
}

function renderCategoryFilters() {
  const el = document.getElementById("category-filters");
  el.innerHTML = allCategories.map(c => `
    <button class="filter-chip ${shopState.category_id === c.id ? "active" : ""}" data-category="${c.id}">${escapeHtml(c.name)}</button>
  `).join("");
  el.querySelectorAll("[data-category]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.category);
      shopState.category_id = shopState.category_id === id ? null : id;
      renderCategoryFilters();
      loadProducts();
    });
  });
}

function renderBrandFilters() {
  const el = document.getElementById("brand-filters");
  el.innerHTML = allBrands.map(b => `
    <button class="filter-chip ${shopState.brand === b ? "active" : ""}" data-brand="${escapeHtml(b)}">${escapeHtml(b)}</button>
  `).join("");
  el.querySelectorAll("[data-brand]").forEach(btn => {
    btn.addEventListener("click", () => {
      const b = btn.dataset.brand;
      shopState.brand = shopState.brand === b ? null : b;
      renderBrandFilters();
      loadProducts();
    });
  });
}

function bindShopEvents() {
  document.getElementById("search-input").addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      shopState.search = e.target.value.trim();
      loadProducts();
    }, 400);
  });

  document.getElementById("sort-select").addEventListener("change", (e) => {
    shopState.sort_by = e.target.value;
    loadProducts();
  });

  document.getElementById("min-price").addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      shopState.min_price = e.target.value ? parseFloat(e.target.value) : null;
      loadProducts();
    }, 400);
  });
  document.getElementById("max-price").addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      shopState.max_price = e.target.value ? parseFloat(e.target.value) : null;
      loadProducts();
    }, 400);
  });

  document.getElementById("clear-filters-btn").addEventListener("click", () => {
    shopState.search = ""; shopState.category_id = null; shopState.brand = null;
    shopState.min_price = null; shopState.max_price = null; shopState.featured_only = false;
    document.getElementById("search-input").value = "";
    document.getElementById("min-price").value = "";
    document.getElementById("max-price").value = "";
    renderCategoryFilters(); renderBrandFilters();
    loadProducts();
  });
}

async function loadProducts() {
  const grid = document.getElementById("shop-grid");
  const emptyState = document.getElementById("empty-state");
  grid.innerHTML = skeletonCards(8);
  emptyState.classList.add("hidden");

  try {
    const products = await Api.listProducts({
      search: shopState.search || undefined,
      brand: shopState.brand || undefined,
      category_id: shopState.category_id || undefined,
      min_price: shopState.min_price || undefined,
      max_price: shopState.max_price || undefined,
      featured_only: shopState.featured_only || undefined,
      sort_by: shopState.sort_by,
      page_size: 60,
    });

    document.getElementById("results-count").textContent = `${products.length} جهاز متاح`;

    if (products.length === 0) {
      grid.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    grid.innerHTML = products.map(renderProductCard).join("");
    bindProductCardEvents(grid, products);
  } catch (err) {
    console.error(err);
    showToast("تعذر تحميل المنتجات", "error");
    grid.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", initShopPage);
