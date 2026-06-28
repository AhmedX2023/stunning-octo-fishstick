/* ===================================================
   Layout — حقن الهيدر، الفوتر، أدراج السلة والقائمة
=================================================== */

function logoSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 5H20V15H4V5Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <path d="M2 17H22L20.5 20H3.5L2 17Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <path d="M9 17.5H15" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function renderHeader(activePage = "") {
  const root = document.getElementById("site-header-root");
  if (!root) return;

  const links = [
    { href: "index.html", label: "الرئيسية", key: "home" },
    { href: "shop.html", label: "المتجر", key: "shop" },
    { href: "track-order.html", label: "تتبع طلبك", key: "track" },
  ];

  const isLoggedIn = Auth.isLoggedIn();
  const user = Auth.getUser();

  root.innerHTML = `
    <header class="site-header">
      <div class="container header-inner">
        <a href="index.html" class="logo">
          <span class="logo-mark">${logoSvg()}</span>
          <span class="logo-text">لابك <span>عندنا</span></span>
        </a>

        <nav class="main-nav">
          ${links.map(l => `<a href="${l.href}" class="${activePage === l.key ? 'active' : ''}">${l.label}</a>`).join("")}
        </nav>

        <div class="header-actions">
          <button class="icon-btn" id="cart-toggle-btn" aria-label="السلة">
            <svg viewBox="0 0 24 24" fill="none"><path d="M3 3H5L5.4 5M5.4 5H21L18 13H7M5.4 5L7 13M7 13L5 17H19M9 21C9.55 21 10 20.55 10 20C10 19.45 9.55 19 9 19C8.45 19 8 19.45 8 20C8 20.55 8.45 21 9 21ZM18 21C18.55 21 19 20.55 19 20C19 19.45 18.55 19 18 19C17.45 19 17 19.45 17 20C17 20.55 17.45 21 18 21Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="cart-count" id="cart-count" style="display:none">0</span>
          </button>

          ${isLoggedIn ? `
            <div class="user-chip" id="user-menu-btn" style="cursor:pointer">
              <span class="avatar">${(user?.full_name || "؟")[0]}</span>
              <span>${(user?.full_name || "").split(" ")[0]}</span>
            </div>
          ` : `
            <a href="login.html" class="btn btn-secondary btn-sm">تسجيل الدخول</a>
          `}

          <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="القائمة">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </header>

    <div class="mobile-drawer" id="mobile-drawer">
      <div class="mobile-drawer-overlay" data-close-drawer></div>
      <div class="mobile-drawer-panel">
        <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
          <button class="icon-btn" data-close-drawer aria-label="إغلاق">✕</button>
        </div>
        ${links.map(l => `<a href="${l.href}">${l.label}</a>`).join("")}
        <div style="height:1px;background:var(--line);margin:10px 0"></div>
        ${isLoggedIn
          ? `<a href="account.html">حسابي${user?.role === 'admin' ? ' وإدارة المتجر' : ''}</a><a href="#" id="mobile-logout">تسجيل الخروج</a>`
          : `<a href="login.html">تسجيل الدخول</a><a href="register.html">إنشاء حساب جديد</a>`}
      </div>
    </div>

    <div class="cart-drawer" id="cart-drawer">
      <div class="cart-drawer-overlay" data-close-cart></div>
      <div class="cart-drawer-panel">
        <div class="cart-header">
          <h3 style="font-size:18px">سلة المشتريات</h3>
          <button class="icon-btn" data-close-cart aria-label="إغلاق">✕</button>
        </div>
        <div class="cart-items" id="cart-items-container"></div>
        <div class="cart-footer" id="cart-footer"></div>
      </div>
    </div>
  `;

  bindLayoutEvents();
  renderCartDrawer();
}

function bindLayoutEvents() {
  const mobileBtn = document.getElementById("mobile-menu-btn");
  const mobileDrawer = document.getElementById("mobile-drawer");
  if (mobileBtn && mobileDrawer) {
    mobileBtn.addEventListener("click", () => mobileDrawer.classList.add("open"));
    mobileDrawer.querySelectorAll("[data-close-drawer]").forEach(el =>
      el.addEventListener("click", () => mobileDrawer.classList.remove("open"))
    );
  }

  const mobileLogout = document.getElementById("mobile-logout");
  if (mobileLogout) {
    mobileLogout.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.clearSession();
      window.location.href = "index.html";
    });
  }

  const userMenuBtn = document.getElementById("user-menu-btn");
  if (userMenuBtn) {
    userMenuBtn.addEventListener("click", () => { window.location.href = "account.html"; });
  }

  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const cartDrawer = document.getElementById("cart-drawer");
  if (cartToggleBtn && cartDrawer) {
    cartToggleBtn.addEventListener("click", () => {
      renderCartDrawer();
      cartDrawer.classList.add("open");
    });
    cartDrawer.querySelectorAll("[data-close-cart]").forEach(el =>
      el.addEventListener("click", () => cartDrawer.classList.remove("open"))
    );
  }

  document.addEventListener("cart:changed", renderCartDrawer);
}

function renderCartDrawer() {
  const container = document.getElementById("cart-items-container");
  const footer = document.getElementById("cart-footer");
  if (!container || !footer) return;

  const items = Cart.get();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div style="font-size:42px;margin-bottom:14px">🛒</div>
        <p style="font-weight:700;margin-bottom:6px">السلة فاضية لسه</p>
        <p style="font-size:13px">دور على لابتوب يعجبك وابدأ التسوق</p>
      </div>`;
    footer.innerHTML = "";
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="cart-item">
      <img src="${resolveImageUrl(item.image) || placeholderImage()}" alt="${escapeHtml(item.name)}">
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
        <div class="qty-control">
          <button data-qty-down="${item.id}">−</button>
          <span class="font-num">${item.qty}</span>
          <button data-qty-up="${item.id}">+</button>
          <button class="cart-item-remove" data-remove="${item.id}" style="margin-right:auto">إزالة</button>
        </div>
      </div>
    </div>
  `).join("");

  footer.innerHTML = `
    <div class="cart-total-row">
      <span>الإجمالي</span>
      <span class="price">${formatPrice(Cart.total())}</span>
    </div>
    <a href="checkout.html" class="btn btn-primary btn-block">إتمام الطلب</a>
  `;

  container.querySelectorAll("[data-qty-up]").forEach(btn =>
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.qtyUp);
      const item = Cart.get().find(i => i.id === id);
      Cart.updateQty(id, item.qty + 1);
    })
  );
  container.querySelectorAll("[data-qty-down]").forEach(btn =>
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.qtyDown);
      const item = Cart.get().find(i => i.id === id);
      Cart.updateQty(id, item.qty - 1);
    })
  );
  container.querySelectorAll("[data-remove]").forEach(btn =>
    btn.addEventListener("click", () => Cart.remove(parseInt(btn.dataset.remove)))
  );
}

function renderFooter() {
  const root = document.getElementById("site-footer-root");
  if (!root) return;
  root.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <div class="logo" style="margin-bottom:16px">
              <span class="logo-mark">${logoSvg()}</span>
              <span class="logo-text">لابك <span>عندنا</span></span>
            </div>
            <p style="max-width:280px">وجهتك لأجهزة اللابتوب الأصلية بضمان حقيقي وأسعار منافسة، من أول جهاز الألعاب لحد ورك ستيشن المحترفين.</p>
            <div class="social-row" style="margin-top:18px">
              <a href="#" aria-label="فيسبوك">f</a>
              <a href="#" aria-label="إنستجرام">ig</a>
              <a href="#" aria-label="تيك توك">tt</a>
            </div>
          </div>
          <div class="footer-col">
            <h4>تسوق</h4>
            <a href="shop.html">كل اللابتوبات</a>
            <a href="shop.html?featured=1">العروض المميزة</a>
            <a href="track-order.html">تتبع طلبك</a>
          </div>
          <div class="footer-col">
            <h4>حسابي</h4>
            <a href="login.html">تسجيل الدخول</a>
            <a href="register.html">إنشاء حساب</a>
            <a href="account.html">طلباتي</a>
          </div>
          <div class="footer-col">
            <h4>تواصل معنا</h4>
            <p>واتساب: 01000000000</p>
            <p>support@labak.com</p>
            <p>القاهرة، مصر</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 لابك عندنا. جميع الحقوق محفوظة.</span>
          <span>صُنع بشغف لعشاق التكنولوجيا 💜</span>
        </div>
      </div>
    </footer>
  `;
}

function placeholderImage() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#211a38"/>
      <text x="50%" y="50%" font-size="14" fill="#8A82A8" text-anchor="middle" dy=".3em">لا توجد صورة</text>
    </svg>`);
}

function formatPrice(value) {
  const n = Math.round(value);
  return n.toLocaleString("en-US") + " ج.م";
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "";
  renderHeader(page);
  renderFooter();
});
