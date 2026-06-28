"""
سكريبت لتعبئة قاعدة البيانات ببيانات تجريبية واقعية للمنتجات والتصنيفات
شغّل: python seed_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, Base, engine
from app.models.product import Product, Category
import re
import uuid

Base.metadata.create_all(bind=engine)


def make_slug(name: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9\u0600-\u06FF]+", "-", name.strip().lower()).strip("-")
    return f"{base}-{uuid.uuid4().hex[:6]}"


CATEGORIES = [
    {"name": "لابتوبات الألعاب", "slug": "gaming"},
    {"name": "لابتوبات الأعمال", "slug": "business"},
    {"name": "لابتوبات الطلاب", "slug": "students"},
    {"name": "ورك ستيشن واجهزة تصميم", "slug": "workstation"},
]

PRODUCTS = [
    dict(name="ASUS ROG Strix G16", brand="ASUS", category="gaming",
         cpu="Intel Core i7-13650HX", gpu="RTX 4060 8GB", ram="16GB DDR5",
         storage="512GB NVMe SSD", screen="16 بوصة QHD+ 165Hz", battery="90Wh", weight="2.5 كجم", os="Windows 11",
         price=58000, discount_price=52900, stock_quantity=6, is_featured=True, rating=4.7,
         description="جهاز ألعاب قوي بمعالج رسومي RTX 4060 وشاشة 165Hz لتجربة لعب سلسة بدون تقطيع."),
    dict(name="Lenovo Legion Pro 5", brand="Lenovo", category="gaming",
         cpu="AMD Ryzen 7 7745HX", gpu="RTX 4070 8GB", ram="32GB DDR5",
         storage="1TB NVMe SSD", screen="16 بوصة WQXGA 165Hz", battery="80Wh", weight="2.6 كجم", os="Windows 11",
         price=72000, discount_price=None, stock_quantity=4, is_featured=True, rating=4.8,
         description="أداء جبار في الألعاب الحديثة مع نظام تبريد متطور وذاكرة 32 جيجا."),
    dict(name="MacBook Air M3", brand="Apple", category="business",
         cpu="Apple M3 8-core", gpu="GPU 10-core مدمج", ram="16GB",
         storage="512GB SSD", screen="13.6 بوصة Liquid Retina", battery="حتى 18 ساعة", weight="1.24 كجم", os="macOS",
         price=64000, discount_price=59900, stock_quantity=10, is_featured=True, rating=4.9,
         description="خفيف جداً، بطارية تدوم طوال اليوم، وأداء استثنائي بدون مروحة تبريد."),
    dict(name="MacBook Pro 14 M3 Pro", brand="Apple", category="workstation",
         cpu="Apple M3 Pro 11-core", gpu="GPU 14-core مدمج", ram="18GB",
         storage="512GB SSD", screen="14.2 بوصة Liquid Retina XDR", battery="حتى 18 ساعة", weight="1.6 كجم", os="macOS",
         price=98000, discount_price=None, stock_quantity=3, is_featured=False, rating=4.9,
         description="للمحترفين في المونتاج والتصميم ثلاثي الأبعاد، أداء بدون منافس في فئته."),
    dict(name="Dell XPS 13 Plus", brand="Dell", category="business",
         cpu="Intel Core i7-1360P", gpu="Intel Iris Xe", ram="16GB LPDDR5",
         storage="512GB SSD", screen="13.4 بوصة OLED 3.5K", battery="55Wh", weight="1.26 كجم", os="Windows 11",
         price=52000, discount_price=47500, stock_quantity=7, is_featured=True, rating=4.6,
         description="تصميم بريميوم بحواف رفيعة جداً وشاشة OLED بدقة عالية تناسب رجال الأعمال."),
    dict(name="HP Pavilion 15", brand="HP", category="students",
         cpu="Intel Core i5-1235U", gpu="Intel Iris Xe", ram="8GB DDR4",
         storage="512GB SSD", screen="15.6 بوصة FHD", battery="41Wh", weight="1.75 كجم", os="Windows 11",
         price=24500, discount_price=21900, stock_quantity=15, is_featured=False, rating=4.3,
         description="خيار اقتصادي ممتاز للطلاب، خفيف ومناسب للاستخدام اليومي والدراسة."),
    dict(name="Lenovo IdeaPad Slim 3", brand="Lenovo", category="students",
         cpu="AMD Ryzen 5 7530U", gpu="AMD Radeon Graphics", ram="8GB DDR4",
         storage="256GB SSD", screen="15.6 بوصة FHD", battery="45Wh", weight="1.65 كجم", os="Windows 11",
         price=19900, discount_price=None, stock_quantity=20, is_featured=False, rating=4.2,
         description="جهاز عملي بسعر مناسب، يكفي تماماً لمهام الدراسة والتصفح والأوفيس."),
    dict(name="ASUS TUF Gaming A15", brand="ASUS", category="gaming",
         cpu="AMD Ryzen 7 7435HS", gpu="RTX 4050 6GB", ram="16GB DDR5",
         storage="512GB NVMe SSD", screen="15.6 بوصة FHD 144Hz", battery="56Wh", weight="2.2 كجم", os="Windows 11",
         price=38500, discount_price=35900, stock_quantity=9, is_featured=True, rating=4.5,
         description="جهاز ألعاب متين بمعايير عسكرية للمتانة وسعر تنافسي للفئة المتوسطة."),
    dict(name="MSI Creator Z16", brand="MSI", category="workstation",
         cpu="Intel Core i9-13900H", gpu="RTX 4070 8GB", ram="32GB DDR5",
         storage="1TB NVMe SSD", screen="16 بوصة QHD+ Touch", battery="90Wh", weight="2.4 كجم", os="Windows 11",
         price=89000, discount_price=None, stock_quantity=2, is_featured=False, rating=4.7,
         description="مصمم خصيصاً للمبدعين: مونتاج فيديو، رندرنج ثلاثي الأبعاد، وتصميم جرافيك احترافي."),
    dict(name="Acer Aspire 5", brand="Acer", category="students",
         cpu="Intel Core i5-1335U", gpu="Intel Iris Xe", ram="8GB DDR4",
         storage="512GB SSD", screen="15.6 بوصة FHD IPS", battery="50Wh", weight="1.78 كجم", os="Windows 11",
         price=22900, discount_price=20500, stock_quantity=12, is_featured=False, rating=4.1,
         description="توازن جيد بين السعر والأداء، مناسب للاستخدام المكتبي والدراسي."),
    dict(name="ASUS Zenbook 14 OLED", brand="ASUS", category="business",
         cpu="Intel Core i7-1355U", gpu="Intel Iris Xe", ram="16GB LPDDR5",
         storage="1TB SSD", screen="14 بوصة 2.8K OLED", battery="75Wh", weight="1.39 كجم", os="Windows 11",
         price=43500, discount_price=39900, stock_quantity=8, is_featured=True, rating=4.6,
         description="شاشة OLED مذهلة الألوان في جسم معدني أنيق وخفيف الوزن."),
    dict(name="Dell Alienware m16", brand="Dell", category="gaming",
         cpu="Intel Core i9-13900HX", gpu="RTX 4080 12GB", ram="32GB DDR5",
         storage="1TB NVMe SSD", screen="16 بوصة QHD+ 240Hz", battery="97Wh", weight="2.9 كجم", os="Windows 11",
         price=125000, discount_price=None, stock_quantity=0, is_featured=False, rating=4.8,
         description="قمة أداء الألعاب: معالج رسومي RTX 4080 وشاشة 240Hz لمحترفي الألعاب التنافسية."),
]


def seed():
    db = SessionLocal()
    try:
        category_map = {}
        for cat in CATEGORIES:
            existing = db.query(Category).filter(Category.slug == cat["slug"]).first()
            if not existing:
                existing = Category(name=cat["name"], slug=cat["slug"])
                db.add(existing)
                db.flush()
            category_map[cat["slug"]] = existing.id

        existing_count = db.query(Product).count()
        if existing_count > 0:
            print(f"[SEED] يوجد بالفعل {existing_count} منتج، تم تخطي الإضافة")
            return

        for p in PRODUCTS:
            category_slug = p.pop("category")
            product = Product(**p, slug=make_slug(p["name"]), category_id=category_map[category_slug])
            db.add(product)

        db.commit()
        print(f"[SEED] تم إضافة {len(PRODUCTS)} منتج و {len(CATEGORIES)} تصنيف بنجاح")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
