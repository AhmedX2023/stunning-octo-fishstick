# لابك عندنا — منصة بيع أجهزة اللابتوب والكمبيوتر

مشروع متكامل: واجهة متجر إلكتروني + لوحة تحكم أدمن + باك إند FastAPI آمن.

---

## 📁 هيكل المشروع

```
labak/
├── backend/              # FastAPI — كل شيء متعلق بالسيرفر وقاعدة البيانات
│   ├── app/
│   │   ├── core/         # الإعدادات، الأمان، قاعدة البيانات
│   │   ├── models/       # موديلات SQLAlchemy
│   │   ├── schemas/      # Pydantic schemas (تحقق المدخلات)
│   │   ├── routers/      # نهايات الـ API (auth, products, orders, reports...)
│   │   └── main.py       # نقطة تشغيل التطبيق
│   ├── requirements.txt
│   ├── seed_data.py      # بيانات تجريبية (منتجات وفئات)
│   ├── run.py            # تشغيل سريع
│   └── .env.example      # مثال لمتغيرات البيئة
│
└── frontend/             # HTML / CSS / JS عادي (بدون أي build step)
    ├── index.html         # الصفحة الرئيسية
    ├── shop.html           # المتجر مع الفلاتر
    ├── product.html        # تفاصيل المنتج
    ├── checkout.html       # إتمام الطلب (يفتح واتساب تلقائياً)
    ├── login.html / register.html
    ├── account.html        # طلبات العميل
    ├── track-order.html    # تتبع طلب بدون تسجيل دخول
    ├── css/ , js/
    └── admin/              # لوحة تحكم الأدمن الكاملة
        ├── index.html      # نظرة عامة (KPIs + رسوم بيانية)
        ├── products.html   # CRUD كامل للمنتجات + رفع صور
        ├── orders.html     # إدارة الطلبات وتحديث الحالة
        ├── customers.html  # العملاء المسجلين
        ├── reports.html    # تقارير تفصيلية
        ├── security.html   # سجل محاولات الدخول
        └── css/ , js/
```

---

## 🚀 خطوات التشغيل

### 1) تشغيل الباك إند (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # على ويندوز: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# عدّل ملف .env: غيّر SECRET_KEY، وحط رقم واتساب الأدمن الحقيقي في ADMIN_WHATSAPP_NUMBER

python seed_data.py             # (اختياري) لإضافة منتجات تجريبية
python run.py                   # السيرفر هيشتغل على http://localhost:8000
```

حساب الأدمن الافتراضي بيتعمل تلقائياً أول مرة تشغل فيها السيرفر:
- **البريد الإلكتروني:** القيمة الموجودة في `FIRST_ADMIN_EMAIL` بملف `.env` (افتراضياً `admin@labak.local`)
- **كلمة المرور:** القيمة الموجودة في `FIRST_ADMIN_PASSWORD` (افتراضياً `ChangeMe123!@#`)

⚠️ **غيّر كلمة مرور الأدمن فوراً بعد أول دخول، ومتسيبش القيم الافتراضية في الإنتاج.**

### 2) تشغيل الفرونت إند

الفرونت إند ملفات HTML/CSS/JS عادية بدون أي build process. أسهل طريقة:

```bash
cd frontend
python -m http.server 5500
```

بعدين افتح المتصفح على: `http://localhost:5500`

> أو استخدم إضافة Live Server في VS Code.

### 3) الدخول للوحة الأدمن

افتح: `http://localhost:5500/login.html`
سجل دخول بحساب الأدمن، بعدين روح على: `http://localhost:5500/admin/index.html`

---

## 🔒 الجوانب الأمنية المطبقة في الباك إند

- **تشفير كلمات المرور** بـ bcrypt (one-way hash + salt تلقائي)
- **JWT** للتوثيق (access token قصير العمر + refresh token لتجديد الجلسة تلقائياً)
- **قفل الحساب التلقائي** بعد 5 محاولات دخول فاشلة لمدة 15 دقيقة (حماية من Brute Force)
- **Rate Limiting** على نهايات حساسة (تسجيل الدخول، التسجيل، إنشاء الطلبات) لمنع السبام
- **التحقق الصارم من كل المدخلات** عبر Pydantic (أرقام الهاتف، الإيميلات، الأسعار، الكميات...)
- **حساب الإجمالي على السيرفر فقط** وليس من بيانات العميل، لمنع التلاعب بالأسعار
- **RBAC**: فصل صلاحيات الأدمن عن العميل في كل نهاية حساسة
- **Soft delete** للمنتجات (مش بيتمسحوا فعلياً عشان يفضل سجل الطلبات القديمة سليم)
- **حماية ORM** ضد SQL Injection (SQLAlchemy، مفيش raw queries)
- **Security headers**: X-Frame-Options, X-Content-Type-Options, HSTS, إلخ
- **سجل أمني (Audit log)** لكل محاولات الدخول الناجحة والفاشلة — يظهر في لوحة الأدمن
- **رسائل خطأ موحدة** عند فشل الدخول (مفيش تسريب معلومة "هل الإيميل موجود؟")
- **التحقق من نوع وحجم الملفات** المرفوعة (الصور فقط، حد أقصى 5MB)
- **توثيق API مخفي** (`/api/docs`) تلقائياً في وضع الإنتاج

---

## 🛒 آلية الطلب وربطه بواتساب

1. العميل يضيف منتجات للسلة (محفوظة في `localStorage`)
2. في صفحة `checkout.html` يدخل: الاسم، الهاتف، الواتساب، المدينة، العنوان
3. عند التأكيد:
   - يتسجل الطلب في قاعدة البيانات بحالة `pending`
   - السيرفر يحسب الإجمالي الحقيقي ويتحقق من توفر الكمية
   - يتولد رابط واتساب (`wa.me/...`) فيه تفاصيل الطلب كاملة
   - يتفتح تلقائياً تاب جديد فيه محادثة واتساب جاهزة مع الأدمن
4. الطلب يظهر فوراً في `admin/orders.html` وفي تقارير `admin/reports.html`

رقم واتساب الأدمن بيتحدد من متغير البيئة `ADMIN_WHATSAPP_NUMBER` في ملف `.env`.

---

## ⚙️ إعدادات مهمة قبل النشر (Production)

في `backend/app/core/config.py` / `.env`:

1. **SECRET_KEY**: لازم يتغير لقيمة عشوائية طويلة وسرية
2. **ALLOWED_ORIGINS**: حط نطاق موقعك الحقيقي بدل localhost
3. **DATABASE_URL**: استخدم PostgreSQL في الإنتاج بدل SQLite
4. **ADMIN_WHATSAPP_NUMBER**: رقم واتساب الأدمن الحقيقي
5. **FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD**: غيّرهم وامسحهم من `.env` بعد أول تشغيل

في `frontend/js/api.js`:
- غيّر `API_BASE` ليشاور على دومين الباك إند الحقيقي بعد النشر

---

## 🎨 الهوية البصرية

تصميم Bold & Colorful مخصص بالكامل:
- خلفية بنفسجية داكنة مع تدرجات بنفسجي/وردي/أصفر كهرماني
- عنصر مميز: بطاقات المنتج بشكل "ملصق صندوق الشحن" (Spec ticket) بدل البطاقات التقليدية
- خط Tajawal للعربي + Space Grotesk للأرقام
- كل التفاعلات (سلة منزلقة، مودالز، توستس) مبنية من الصفر بدون أي مكتبة UI خارجية
"# Labtobak_andenaa" 
"# stunning-octo-fishstick" 
"# stunning-octo-fishstick"  
