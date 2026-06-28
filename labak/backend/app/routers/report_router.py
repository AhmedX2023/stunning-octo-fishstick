"""
راوتر التقارير: إحصائيات شاملة للوحة تحكم الأدمن
- مبيعات، طلبات، أكثر المنتجات مبيعاً، حالة المخزون، سجل الأمان
"""
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.models.security_log import SecurityLog

router = APIRouter(prefix="/api/admin/reports", tags=["تقارير الأدمن"])


@router.get("/overview")
def overview(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_orders = db.query(func.count(Order.id)).scalar() or 0
    pending_orders = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.PENDING).scalar() or 0

    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
        Order.status != OrderStatus.CANCELLED
    ).scalar() or 0

    today_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
        Order.status != OrderStatus.CANCELLED, Order.created_at >= today_start
    ).scalar() or 0

    month_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(
        Order.status != OrderStatus.CANCELLED, Order.created_at >= month_start
    ).scalar() or 0

    today_orders_count = db.query(func.count(Order.id)).filter(Order.created_at >= today_start).scalar() or 0

    total_customers = db.query(func.count(User.id)).filter(User.role == "customer").scalar() or 0
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0  # noqa: E712
    low_stock_count = db.query(func.count(Product.id)).filter(
        Product.is_active == True, Product.stock_quantity <= 3, Product.stock_quantity > 0  # noqa: E712
    ).scalar() or 0
    out_of_stock_count = db.query(func.count(Product.id)).filter(
        Product.is_active == True, Product.stock_quantity == 0  # noqa: E712
    ).scalar() or 0

    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "today_orders_count": today_orders_count,
        "total_revenue": round(total_revenue, 2),
        "today_revenue": round(today_revenue, 2),
        "month_revenue": round(month_revenue, 2),
        "total_customers": total_customers,
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
    }


@router.get("/sales-trend")
def sales_trend(db: Session = Depends(get_db), admin: User = Depends(require_admin), days: int = Query(14, ge=1, le=90)):
    """مبيعات آخر N يوم - لرسم بياني"""
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.date(Order.created_at).label("day"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
            func.count(Order.id).label("orders_count"),
        )
        .filter(Order.created_at >= start_date, Order.status != OrderStatus.CANCELLED)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )

    data_by_day = {str(r.day): {"revenue": float(r.revenue), "orders_count": r.orders_count} for r in rows}

    result = []
    for i in range(days):
        day = (start_date + timedelta(days=i)).date()
        key = str(day)
        entry = data_by_day.get(key, {"revenue": 0, "orders_count": 0})
        result.append({"date": key, **entry})

    return result


@router.get("/top-products")
def top_products(db: Session = Depends(get_db), admin: User = Depends(require_admin), limit: int = Query(10, ge=1, le=50)):
    rows = (
        db.query(
            OrderItem.product_id,
            OrderItem.product_name_snapshot,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.unit_price * OrderItem.quantity).label("total_revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status != OrderStatus.CANCELLED)
        .group_by(OrderItem.product_id, OrderItem.product_name_snapshot)
        .order_by(desc("total_sold"))
        .limit(limit)
        .all()
    )
    return [
        {
            "product_id": r.product_id,
            "name": r.product_name_snapshot,
            "total_sold": int(r.total_sold),
            "total_revenue": round(float(r.total_revenue), 2),
        }
        for r in rows
    ]


@router.get("/orders-by-status")
def orders_by_status(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    return {status.value: count for status, count in rows}


@router.get("/low-stock")
def low_stock_products(db: Session = Depends(get_db), admin: User = Depends(require_admin), threshold: int = Query(3, ge=0)):
    products = (
        db.query(Product)
        .filter(Product.is_active == True, Product.stock_quantity <= threshold)  # noqa: E712
        .order_by(Product.stock_quantity.asc())
        .all()
    )
    return [{"id": p.id, "name": p.name, "brand": p.brand, "stock_quantity": p.stock_quantity} for p in products]


@router.get("/security-logs")
def security_logs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
    limit: int = Query(100, ge=1, le=500),
    only_failures: bool = False,
):
    query = db.query(SecurityLog).order_by(SecurityLog.created_at.desc())
    if only_failures:
        query = query.filter(SecurityLog.success == False)  # noqa: E712
    logs = query.limit(limit).all()
    return [
        {
            "id": l.id, "event_type": l.event_type, "email": l.email,
            "ip_address": l.ip_address, "success": l.success,
            "details": l.details, "created_at": l.created_at,
        }
        for l in logs
    ]


@router.get("/brand-distribution")
def brand_distribution(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = (
        db.query(Product.brand, func.count(Product.id))
        .filter(Product.is_active == True)  # noqa: E712
        .group_by(Product.brand)
        .all()
    )
    return [{"brand": b, "count": c} for b, c in rows]
