/* ===================================================
   Track order page logic
=================================================== */

document.getElementById("track-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const field = document.getElementById("field-order-number");
  field.classList.remove("has-error");

  const orderNumber = document.getElementById("order-number").value.trim();
  if (!orderNumber) {
    field.classList.add("has-error");
    field.querySelector(".field-error").textContent = "رقم الطلب مطلوب";
    return;
  }

  const btn = document.getElementById("track-submit-btn");
  btn.disabled = true;
  btn.textContent = "جاري البحث...";
  document.getElementById("track-result").innerHTML = "";

  try {
    const order = await Api.trackOrder(orderNumber);
    renderTrackResult(order);
  } catch (err) {
    document.getElementById("track-result").innerHTML = `
      <div style="text-align:center;padding:20px;color:var(--ink-faint)">
        <div style="font-size:34px;margin-bottom:10px">😕</div>
        رقم الطلب غير موجود، تأكد منه وحاول تاني
      </div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "تتبع الطلب";
  }
});

function renderTrackResult(order) {
  const statusInfo = ORDER_STATUS_LABELS_TRACK[order.status] || { label: order.status, color: "var(--ink-faint)" };
  const steps = ["pending", "confirmed", "processing", "shipped", "delivered"];
  const currentIndex = steps.indexOf(order.status);

  document.getElementById("track-result").innerHTML = `
    <div style="background:var(--bg-surface-2);border-radius:18px;padding:22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <span class="font-num" style="font-weight:700">${order.order_number}</span>
        <span class="order-status-badge" style="background:${statusInfo.color}22;color:${statusInfo.color}">${statusInfo.label}</span>
      </div>

      ${order.status !== "cancelled" ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:24px;position:relative">
          <div style="position:absolute;top:9px;right:0;left:0;height:2px;background:var(--line);z-index:0"></div>
          <div style="position:absolute;top:9px;right:0;height:2px;background:var(--lime);z-index:0;width:${(currentIndex / (steps.length - 1)) * 100}%;transition:width .5s"></div>
          ${steps.map((s, i) => `
            <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:6px">
              <div style="width:20px;height:20px;border-radius:50%;background:${i <= currentIndex ? "var(--lime)" : "var(--bg-card)"};border:2px solid ${i <= currentIndex ? "var(--lime)" : "var(--line-bright)"}"></div>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <div style="font-size:13px;color:var(--ink-dim);margin-bottom:6px">المنتجات:</div>
      ${order.items.map(i => `<div style="font-size:13.5px;margin-bottom:4px">${escapeHtml(i.product_name_snapshot)} ×${i.quantity}</div>`).join("")}

      <div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:16px;border-top:1px dashed var(--line-bright);font-weight:800">
        <span>الإجمالي</span>
        <span class="price">${formatPrice(order.total_amount)}</span>
      </div>
    </div>
  `;
}

const ORDER_STATUS_LABELS_TRACK = {
  pending: { label: "في الانتظار", color: "var(--amber)" },
  confirmed: { label: "تم التأكيد", color: "var(--cyan)" },
  processing: { label: "جاري التجهيز", color: "var(--violet-bright)" },
  shipped: { label: "تم الشحن", color: "var(--lime)" },
  delivered: { label: "تم التسليم", color: "var(--lime)" },
  cancelled: { label: "ملغي", color: "#f87171" },
};
