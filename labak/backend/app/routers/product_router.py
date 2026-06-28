"""
راوتر المنتجات: عرض عام للمتسوقين + عمليات إدارية محمية للأدمن فقط
"""
import re
import json
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.deps import require_admin
from app.core.config import settings
from app.models.product import Product, Category
from app.models.user import User
from app.schemas.product_schema import ProductCreate, ProductUpdate, ProductOut, CategoryOut

router = APIRouter(prefix="/api/products", tags=["المنتجات"])


def make_slug(name: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9\u0600-\u06FF]+", "-", name.strip().lower()).strip("-")
    return f"{base}-{uuid.uuid4().hex[:6]}"


@router.get("", response_model=List[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    brand: Optional[str] = None,
    category_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    featured_only: bool = False,
    sort_by: str = Query("newest", pattern="^(newest|price_asc|price_desc|rating)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    query = db.query(Product).filter(Product.is_active == True)  # noqa: E712

    if search:
        like = f"%{search.strip()}%"
        query = query.filter(or_(Product.name.ilike(like), Product.brand.ilike(like), Product.description.ilike(like)))
    if brand:
        query = query.filter(Product.brand == brand)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if featured_only:
        query = query.filter(Product.is_featured == True)  # noqa: E712

    if sort_by == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort_by == "rating":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    products = query.offset((page - 1) * page_size).limit(page_size).all()
    return products


@router.get("/brands", response_model=List[str])
def list_brands(db: Session = Depends(get_db)):
    rows = db.query(Product.brand).filter(Product.is_active == True).distinct().all()  # noqa: E712
    return [r[0] for r in rows]


@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.is_active == True).first()  # noqa: E712
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    return product


# ---------------- إدارة المنتجات (أدمن فقط) ----------------

@router.post("/admin/create", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    product = Product(**payload.model_dump(), slug=make_slug(payload.name))
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/admin/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/admin/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    product.is_active = False  # soft delete للحفاظ على سجل الطلبات القديمة
    db.commit()
    return None


@router.post("/admin/{product_id}/upload-image", response_model=ProductOut)
def upload_product_image(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")

    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="نوع الملف غير مسموح، يجب أن تكون صورة JPG أو PNG أو WEBP")

    contents = file.file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(status_code=400, detail=f"حجم الصورة أكبر من {settings.MAX_UPLOAD_SIZE_MB}MB")

    import os
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[file.content_type]
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    product.image_url = f"/static/uploads/{filename}"
    db.commit()
    db.refresh(product)
    return product


@router.post("/admin/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(name: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    name = name.strip()
    if not name or len(name) > 100:
        raise HTTPException(status_code=400, detail="اسم التصنيف غير صالح")
    existing = db.query(Category).filter(Category.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="التصنيف موجود بالفعل")
    slug = re.sub(r"[^a-zA-Z0-9\u0600-\u06FF]+", "-", name.lower()).strip("-")
    category = Category(name=name, slug=slug)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category
