/* ===================================================
   Auth pages logic — تسجيل الدخول والتسجيل
=================================================== */

function clearFieldErrors(form) {
  form.querySelectorAll(".field").forEach(f => {
    f.classList.remove("has-error");
    const errEl = f.querySelector(".field-error");
    if (errEl) errEl.textContent = "";
  });
  const box = document.getElementById("auth-error");
  if (box) { box.classList.remove("show"); box.textContent = ""; }
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(`field-${fieldId}`);
  if (!field) return;
  field.classList.add("has-error");
  field.querySelector(".field-error").textContent = message;
}

function showAuthError(message) {
  const box = document.getElementById("auth-error");
  if (box) { box.textContent = message; box.classList.add("show"); }
}

function redirectAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  window.location.href = redirect ? decodeURIComponent(redirect) : "index.html";
}

/* ----------------- Login ----------------- */
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(loginForm);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email) return showFieldError("email", "البريد الإلكتروني مطلوب");
    if (!password) return showFieldError("password", "كلمة المرور مطلوبة");

    const btn = document.getElementById("login-submit-btn");
    btn.disabled = true;
    btn.textContent = "جاري الدخول...";

    try {
      const data = await Api.login({ email, password });
      Auth.setSession(data);
      showToast(`أهلاً بيك يا ${data.user.full_name.split(" ")[0]}!`, "success");
      setTimeout(redirectAfterAuth, 600);
    } catch (err) {
      if (err.status === 403) showAuthError(err.message);
      else showAuthError(err.message || "حصل خطأ، حاول تاني");
    } finally {
      btn.disabled = false;
      btn.textContent = "تسجيل الدخول";
    }
  });
}

/* ----------------- Register ----------------- */
const registerForm = document.getElementById("register-form");
if (registerForm) {
  const passwordInput = document.getElementById("password");
  passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;
    const bars = document.querySelectorAll("#password-strength div");
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Za-z]/.test(val) && /[0-9]/.test(val)) score++;
    if (val.length >= 12 && /[A-Z]/.test(val) && /[^A-Za-z0-9]/.test(val)) score++;
    const colors = ["#3a3354", "#f87171", "#FBC02D", "#A3E635"];
    bars.forEach((b, i) => { b.style.background = i < score ? colors[score] : "#3a3354"; });
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(registerForm);

    const full_name = document.getElementById("full_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;

    let hasError = false;
    if (full_name.length < 2) { showFieldError("full_name", "الاسم قصير جداً"); hasError = true; }
    if (!email) { showFieldError("email", "البريد الإلكتروني مطلوب"); hasError = true; }
    if (password.length < 8) { showFieldError("password", "كلمة المرور يجب أن تكون 8 أحرف على الأقل"); hasError = true; }
    else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      showFieldError("password", "كلمة المرور يجب أن تحتوي على حروف وأرقام"); hasError = true;
    }
    if (hasError) return;

    const btn = document.getElementById("register-submit-btn");
    btn.disabled = true;
    btn.textContent = "جاري الإنشاء...";

    try {
      const data = await Api.register({ full_name, email, password, phone: phone || null });
      Auth.setSession(data);
      showToast("تم إنشاء حسابك بنجاح!", "success");
      setTimeout(redirectAfterAuth, 600);
    } catch (err) {
      if (err.data && err.data.errors) {
        err.data.errors.forEach(e => showFieldError(e.field, e.message));
      } else {
        showAuthError(err.message || "حصل خطأ، حاول تاني");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "إنشاء الحساب";
    }
  });
}
