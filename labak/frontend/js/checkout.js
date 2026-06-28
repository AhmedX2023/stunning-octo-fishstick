/* ===================================================
   Checkout page logic — أهم صفحة: تأكيد الطلب + رابط واتساب تلقائي
=================================================== */

function initCheckoutPage() {
  const items = Cart.get();

  if (items.length === 0) {
    document.getElementById("checkout-active").classList.add("hidden");
    document.getElementById("checkout-empty").classList.remove("hidden");
    return;
  }

  renderSummary(items);
  prefillUserData();
  bindCheckoutEvents();
}

function renderSummary(items) {
  document.getElementById("summary-items").innerHTML = items.map(item => `
    <div class="summary-item">
      <img src="${resolveImageUrl(item.image) || placeholderImage()}" alt="${escapeHtml(item.name)}">
      <div class="summary-item-info">
        <div class="summary-item-name">${escapeHtml(item.name)}</div>
        <div class="summary-item-meta">${item.qty} × ${formatPrice(item.price)}</div>
      </div>
      <div class="summary-item-total price">${formatPrice(item.qty * item.price)}</div>
    </div>
  `).join("");

  document.getElementById("summary-count").textContent = Cart.count();
  document.getElementById("summary-total").textContent = formatPrice(Cart.total());
}

function prefillUserData() {
  const user = Auth.getUser();
  if (!user) return;
  document.getElementById("customer_name").value = user.full_name || "";
  if (user.phone) {
    document.getElementById("phone").value = user.phone;
    document.getElementById("whatsapp").value = user.phone;
  }
}

function bindCheckoutEvents() {
  document.getElementById("same-as-phone").addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("whatsapp").value = document.getElementById("phone").value;
    }
  });
  document.getElementById("phone").addEventListener("input", (e) => {
    if (document.getElementById("same-as-phone").checked) {
      document.getElementById("whatsapp").value = e.target.value;
    }
  });

  document.getElementById("checkout-form").addEventListener("submit", handleCheckoutSubmit);
}

function validateEgyptianPhone(value) {
  const cleaned = value.replace(/[\s\-()]/g, "");
  return /^(\+?20|0)?1[0125][0-9]{8}$/.test(cleaned);
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();

  const form = e.target;
  form.querySelectorAll(".field").forEach(f => {
    f.classList.remove("has-error");
    const errEl = f.querySelector(".field-error");
    if (errEl) errEl.textContent = "";
  });

  const customer_name = document.getElementById("customer_name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const city = document.getElementById("city").value.trim();
  const address = document.getElementById("address").value.trim();
  const notes = document.getElementById("notes").value.trim();

  let valid = true;
  const fail = (id, msg) => {
    const field = document.getElementById(`field-${id}`);
    if (!field) { valid = false; return; }
    field.classList.add("has-error");
    const errEl = field.querySelector(".field-error");
    if (errEl) errEl.textContent = msg;
    valid = false;
  };

  if (customer_name.length < 2) fail("customer_name", "الاسم مطلوب");
  if (!validateEgyptianPhone(phone)) fail("phone", "رقم هاتف مصري غير صالح");
  if (!validateEgyptianPhone(whatsapp)) fail("whatsapp", "رقم واتساب مصري غير صالح");
  if (city.length < 2) fail("city", "المدينة مطلوبة");
  if (address.length < 5) fail("address", "العنوان مطلوب بالتفصيل");

  if (!valid) return;

  const items = Cart.get();
  const payload = {
    customer_name, phone, whatsapp, city, address, notes: notes || null,
    items: items.map(i => ({ product_id: i.id, quantity: i.qty })),
  };

  const btn = document.getElementById("checkout-submit-btn");
  btn.disabled = true;
  btn.textContent = "جاري تأكيد الطلب...";

  try {
    const result = await Api.createOrder(payload);
    Cart.clear();
    showOrderSuccess(result);
  } catch (err) {
    showToast(err.message || "حصل خطأ أثناء تأكيد الطلب", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "تأكيد الطلب والتواصل عبر واتساب";
  }
}

function showOrderSuccess(result) {
  document.getElementById("checkout-active").classList.add("hidden");
  document.getElementById("checkout-success").classList.remove("hidden");
  document.getElementById("success-order-num").textContent = result.order.order_number;

  const waLink = document.getElementById("success-whatsapp-link");
  waLink.href = result.whatsapp_link;

  // فتح واتساب تلقائياً في تبويب جديد
  window.open(result.whatsapp_link, "_blank", "noopener");
}

document.addEventListener("DOMContentLoaded", initCheckoutPage);