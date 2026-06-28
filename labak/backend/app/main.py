"""
نقطة الدخول الرئيسية لتطبيق لابك عندنا
"""
import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.limiter import limiter
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.routers import auth_router, product_router, order_router, report_router, user_router

# إنشاء الجداول
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="منصة لابك عندنا لبيع أجهزة اللابتوب والكمبيوتر",
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,  # إخفاء التوثيق في الإنتاج
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------------- Security headers middleware ----------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Process-Time"] = str(round(time.time() - start, 4))
    return response


# ---------------- معالج أخطاء موحد (عدم تسريب تفاصيل داخلية) ----------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [{"field": ".".join(str(x) for x in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": "بيانات غير صالحة", "errors": errors})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        raise exc
    return JSONResponse(status_code=500, content={"detail": "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً"})


# ---------------- الملفات الثابتة (صور المنتجات) ----------------
import os as _os
_STATIC_DIR = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "static")
_os.makedirs(_STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=_STATIC_DIR), name="static")

# ---------------- الراوترز ----------------
app.include_router(auth_router.router)
app.include_router(product_router.router)
app.include_router(order_router.router)
app.include_router(report_router.router)
app.include_router(user_router.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}


@app.on_event("startup")
def create_first_admin():
    """إنشاء حساب أدمن افتراضي عند أول تشغيل لو مفيش أي أدمن"""
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not existing_admin:
            admin = User(
                full_name="مدير المنصة",
                email=settings.FIRST_ADMIN_EMAIL.lower(),
                hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print(f"[INIT] تم إنشاء حساب أدمن افتراضي: {settings.FIRST_ADMIN_EMAIL}")
    finally:
        db.close()
