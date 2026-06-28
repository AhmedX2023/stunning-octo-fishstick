/* ===================================================
   Admin Products page logic — CRUD كامل
=================================================== */

let allProductsCache = [];
let allCategoriesCache = [];
let productToDelete = null;
let pendingImageFile = null;

async function initProductsPage() {
  bindModalCloseEvents();
  bindProductFormEvents();

  document.getElementById("open-create-product-btn").addEventListener("click", () => openProductModal(null));
  document.getElementById("manage-categories-btn").addEventListener("click", openCategoryModal);
  document.getElementById("add-category-btn").addEventListener("click", handleAddCategory);
  document.getElementById("confirm-delete-btn").addEventListener("click", handleConfirmDelete);

  document.getElementById("product-search").addEventListener("input", (e) => {
    renderProductsTable(filterProductsBySearch(e.target.value));
  });

  await loadCategories();
  await loadProducts();
}

function bindModalCloseEvents() {
  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.closeModal).classList.remove("open");
    });
  });
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });
}

async function loadCategories() {
  try {
    allCategoriesCache = await Api.listCategories();
    const select = document.getElementById("p-category");
    select.innerHTML = `<option value="">بدون فئة</option>` + allCategoriesCache.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  } catch (e) { console.error(e); }
}

async function loadProducts() {
  try {
    allProductsCache = await Api.listProducts({ page_size: 100, sort_by: "newest" });
    renderProductsTable(allProductsCache);
  } catch (err) {
    document.getElementById("products-table-body").innerHTML = `<tr><td colspan="6" class="empty-mini">تعذر تحميل المنتجات</td></tr>`;
  }
}

function filterProductsBySearch(term) {
  term = term.trim().toLowerCase();
  if (!term) return allProductsCache;
  return allProductsCache.filter(p => p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term));
}

function renderProductsTable(products) {
  const tbody = document.getElementById("products-table-body");
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-mini">لا توجد منتجات</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const hasDiscount = p.discount_price && p.discount_price < p.price;
    const stockColor = p.stock_quantity === 0 ? "#f87171" : p.stock_quantity <= 3 ? "#FBC02D" : "#A3E635";
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            <img src="${resolveImageUrl(p.image_url) || placeholderImage()}" style="width:42px;height:42px;object-fit:contain;background:white;border-radius:8px;padding:4px">
            <span style="font-weight:700">${escapeHtml(p.name)}</span>
          </div>
        </td>
        <td>${escapeHtml(p.brand)}</td>
        <td class="price">${hasDiscount ? `<span style="text-decoration:line-through;color:var(--ink-faint);font-size:12px">${formatPrice(p.price)}</span><br>` : ""}${formatPrice(hasDiscount ? p.discount_price : p.price)}</td>
        <td><span class="font-num" style="color:${stockColor};font-weight:700">${p.stock_quantity}</span></td>
        <td><span class="status-pill" style="background:${p.is_active ? "#A3E63622" : "#f8717122"};color:${p.is_active ? "#A3E635" : "#f87171"}">${p.is_active ? "منشور" : "مخفي"}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" data-edit="${p.id}">تعديل</button>
            <button class="btn btn-danger btn-sm" data-delete="${p.id}">حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-edit]").forEach(btn =>
    btn.addEventListener("click", () => openProductModal(parseInt(btn.dataset.edit)))
  );
  tbody.querySelectorAll("[data-delete]").forEach(btn =>
    btn.addEventListener("click", () => {
      productToDelete = parseInt(btn.dataset.delete);
      document.getElementById("delete-modal").classList.add("open");
    })
  );
}

function openProductModal(productId) {
  pendingImageFile = null;
  const form = document.getElementById("product-form");
  form.reset();
  document.getElementById("p-image-preview").innerHTML = "";

  if (productId) {
    const p = allProductsCache.find(x => x.id === productId);
    document.getElementById("product-modal-title").textContent = "تعديل المنتج";
    document.getElementById("product-id").value = p.id;
    document.getElementById("p-name").value = p.name;
    document.getElementById("p-brand").value = p.brand;
    document.getElementById("p-category").value = p.category?.id || "";
    document.getElementById("p-description").value = p.description || "";
    document.getElementById("p-cpu").value = p.cpu || "";
    document.getElementById("p-gpu").value = p.gpu || "";
    document.getElementById("p-ram").value = p.ram || "";
    document.getElementById("p-storage").value = p.storage || "";
    document.getElementById("p-screen").value = p.screen || "";
    document.getElementById("p-battery").value = p.battery || "";
    document.getElementById("p-weight").value = p.weight || "";
    document.getElementById("p-os").value = p.os || "";
    document.getElementById("p-price").value = p.price;
    document.getElementById("p-discount").value = p.discount_price || "";
    document.getElementById("p-stock").value = p.stock_quantity;
    document.getElementById("p-featured").checked = p.is_featured;
    document.getElementById("p-active").checked = p.is_active;
    if (p.image_url) {
      document.getElementById("p-image-preview").innerHTML = `<img src="${resolveImageUrl(p.image_url)}" style="width:80px;height:80px;object-fit:contain;background:white;border-radius:10px;padding:6px">`;
    }
  } else {
    document.getElementById("product-modal-title").textContent = "منتج جديد";
    document.getElementById("product-id").value = "";
  }

  document.getElementById("product-modal").classList.add("open");
}

function bindProductFormEvents() {
  document.getElementById("p-image").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("حجم الصورة أكبر من 5MB", "error");
      e.target.value = "";
      return;
    }
    pendingImageFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("p-image-preview").innerHTML = `<img src="${ev.target.result}" style="width:80px;height:80px;object-fit:contain;background:white;border-radius:10px;padding:6px">`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("save-product-btn").addEventListener("click", handleSaveProduct);
}

async function handleSaveProduct() {
  const id = document.getElementById("product-id").value;
  const name = document.getElementById("p-name").value.trim();
  const brand = document.getElementById("p-brand").value.trim();
  const price = parseFloat(document.getElementById("p-price").value);
  const stock_quantity = parseInt(document.getElementById("p-stock").value);

  if (!name || !brand) return showToast("اسم المنتج والبراند مطلوبين", "error");
  if (!price || price <= 0) return showToast("السعر غير صالح", "error");
  if (isNaN(stock_quantity) || stock_quantity < 0) return showToast("الكمية غير صالحة", "error");

  const discountVal = document.getElementById("p-discount").value;
  const categoryVal = document.getElementById("p-category").value;

  const payload = {
    name, brand,
    category_id: categoryVal ? parseInt(categoryVal) : null,
    description: document.getElementById("p-description").value.trim() || null,
    cpu: document.getElementById("p-cpu").value.trim() || null,
    gpu: document.getElementById("p-gpu").value.trim() || null,
    ram: document.getElementById("p-ram").value.trim() || null,
    storage: document.getElementById("p-storage").value.trim() || null,
    screen: document.getElementById("p-screen").value.trim() || null,
    battery: document.getElementById("p-battery").value.trim() || null,
    weight: document.getElementById("p-weight").value.trim() || null,
    os: document.getElementById("p-os").value.trim() || null,
    price,
    discount_price: discountVal ? parseFloat(discountVal) : null,
    stock_quantity,
    is_featured: document.getElementById("p-featured").checked,
    is_active: document.getElementById("p-active").checked,
  };

  const btn = document.getElementById("save-product-btn");
  btn.disabled = true;
  btn.textContent = "جاري الحفظ...";

  try {
    let savedProduct;
    if (id) {
      savedProduct = await Api.adminUpdateProduct(parseInt(id), payload);
    } else {
      savedProduct = await Api.adminCreateProduct(payload);
    }

    if (pendingImageFile) {
      savedProduct = await Api.adminUploadImage(savedProduct.id, pendingImageFile);
    }

    showToast(id ? "تم تحديث المنتج بنجاح" : "تم إضافة المنتج بنجاح", "success");
    document.getElementById("product-modal").classList.remove("open");
    await loadProducts();
  } catch (err) {
    showToast(err.message || "حصل خطأ أثناء الحفظ", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "حفظ المنتج";
  }
}

async function handleConfirmDelete() {
  if (!productToDelete) return;
  const btn = document.getElementById("confirm-delete-btn");
  btn.disabled = true;
  try {
    await Api.adminDeleteProduct(productToDelete);
    showToast("تم حذف المنتج", "success");
    document.getElementById("delete-modal").classList.remove("open");
    await loadProducts();
  } catch (err) {
    showToast(err.message || "تعذر حذف المنتج", "error");
  } finally {
    btn.disabled = false;
    productToDelete = null;
  }
}

function openCategoryModal() {
  renderCategoryList();
  document.getElementById("category-modal").classList.add("open");
}

function renderCategoryList() {
  const container = document.getElementById("category-list");
  if (allCategoriesCache.length === 0) {
    container.innerHTML = `<div class="empty-mini">لا توجد فئات بعد</div>`;
    return;
  }
  container.innerHTML = allCategoriesCache.map(c => `
    <div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px">
      <span>${escapeHtml(c.name)}</span>
      <span class="text-faint" style="font-size:12px">${c.slug}</span>
    </div>
  `).join("");
}

async function handleAddCategory() {
  const input = document.getElementById("new-category-name");
  const name = input.value.trim();
  if (!name) return showToast("اكتب اسم الفئة أولاً", "error");

  try {
    await Api.adminCreateCategory(name);
    showToast("تمت إضافة الفئة", "success");
    input.value = "";
    await loadCategories();
    renderCategoryList();
  } catch (err) {
    showToast(err.message || "تعذر إضافة الفئة", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!guardAdminAccess()) return;
  initProductsPage();
});
