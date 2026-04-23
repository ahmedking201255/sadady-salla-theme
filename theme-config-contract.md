# Theme Config Contract

هذا الملف يوضح الحد الأدنى من بيانات `theme-config` التي يحتاجها `Salla Theme` الحالي.

المسار المتوقع:

- `GET /api/v1/public/theme-config`

الصيغة المتوقعة:

```json
{
  "data": {
    "brand_name": "Sadady",
    "brand_subtitle": "منصة سداد وتقسيط الفواتير",
    "brand_logo_url": "https://sadady.com/assets/logo.png",
    "favicon_url": "https://sadady.com/favicon.ico",
    "home_url": "/",
    "hero_title": "سدادي تسدد عنك فواتير سداد فورًا<br>وأنت قسّطها على راحتك",
    "hero_subtitle": "أدخل رقم فاتورة سداد… ونحن نسددها فورًا وأنت قسّطها براحتك.",
    "support_phone": "966500000000",
    "support_email": "care@sadady.com",
    "primary_color": "#f97316",
    "primary_color_alt": "#fb923c",
    "success_color": "#10b981",
    "surface_start": "#fff7ed",
    "surface_mid": "#ffffff",
    "surface_end": "#fffaf5"
  }
}
```

الاستخدام داخل الثيم:

- `brand_name`, `brand_subtitle`: نصوص الهيدر والفوتر
- `brand_logo_url`: شعار الهيدر
- `favicon_url`: أيقونة المتصفح
- `home_url`: رابط الشعار
- `hero_title`, `hero_subtitle`: نصوص الهيرو
- `support_phone`, `support_email`: بيانات التواصل في الفوتر
- `primary_color`, `primary_color_alt`, `success_color`: ألوان الأزرار والحالات
- `surface_start`, `surface_mid`, `surface_end`: تدرج خلفية الموقع

مهم:

- إذا لم ترجع الـ API أي قيمة، الثيم يستخدم القيم الافتراضية الحالية المطابقة تقريبًا لـ `sadady.com`.
- هذه الطبقة هي التي تسمح لاحقًا لـ `admin.sadady.com` بتغيير الشعار والألوان والنصوص بدون إعادة بناء الثيم.
