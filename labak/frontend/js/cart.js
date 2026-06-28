/* ===================================================
   Cart — إدارة سلة المشتريات في المتصفح (localStorage)
=================================================== */

const CART_KEY = "labak_cart";

const Cart = {
  get() {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  },
  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    Cart.renderCount();
    document.dispatchEvent(new CustomEvent("cart:changed"));
  },
  add(product, qty = 1) {
    const items = Cart.get();
    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 20);
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.discount_price || product.price,
        image: product.image_url,
        stock: product.stock_quantity,
        qty: Math.min(qty, 20),
      });
    }
    Cart.save(items);
  },
  updateQty(id, qty) {
    let items = Cart.get();
    if (qty <= 0) {
      items = items.filter((i) => i.id !== id);
    } else {
      const item = items.find((i) => i.id === id);
      if (item) item.qty = Math.min(qty, 20);
    }
    Cart.save(items);
  },
  remove(id) {
    const items = Cart.get().filter((i) => i.id !== id);
    Cart.save(items);
  },
  clear() {
    Cart.save([]);
  },
  count() {
    return Cart.get().reduce((sum, i) => sum + i.qty, 0);
  },
  total() {
    return Cart.get().reduce((sum, i) => sum + i.qty * i.price, 0);
  },
  renderCount() {
    const el = document.getElementById("cart-count");
    if (!el) return;
    const count = Cart.count();
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  },
};

document.addEventListener("DOMContentLoaded", () => Cart.renderCount());
