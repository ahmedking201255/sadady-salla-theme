# Sadady Salla Theme

ثيم خاص بسدادي داخل سلة، مبني على واجهة `sadady.com` الحالية مع ربط مباشر بواجهات `api.sadady.com`.

## الفصل المعماري

- مشروع سدادي الأساسي يبقى خارج الثيم: API، منطق الأعمال، وقاعدة البيانات.
- ثيم سلة يبقى طبقة واجهة فقط داخل Twilight.
- الربط يتم عبر إعدادات الثيم في [twilight.json](/C:/Users/ha_91/Downloads/سدادي%20سله/theme/twilight.json)، خصوصًا `api_base_url` و`support_email`.

## الهدف

- إبقاء الصفحة الرئيسية Static داخل الثيم
- تشغيل مسار الطلب والتتبع وصفحات العميل داخل سلة
- الاعتماد على الباك إند كمصدر الحقيقة
- منع حقن بيانات العميل الحساسة داخل Twig أو JavaScript inline
- فصل هوية سلة عن جلسة سدادي الداخلية عبر exchange endpoint آمن نسبيًا

## أهم الملفات

- `src/views/pages/index.twig`
- `src/views/pages/tracking.twig`
- `src/views/pages/thank-you.twig`
- `src/views/pages/customer/orders/index.twig`
- `src/views/pages/customer/orders/single.twig`
- `src/views/pages/customer/profile.twig`
- `src/views/pages/customer/notifications.twig`
- `src/views/layouts/master.twig`
- `assets/js/sadady/api-client.js`
- `assets/js/sadady/theme-api.js`
- `assets/js/sadady/quote-flow.js`
- `assets/js/sadady/checkout-flow.js`
- `assets/js/sadady/customer-orders.js`

## قواعد التنفيذ

- الصفحة الرئيسية لا تعتمد على Salla home components الديناميكية
- `theme-config` يبقى المصدر الوحيد للنصوص/الألوان/الشعار القابلة للتغيير
- تسجيل الدخول وOTP يتمان عبر سلة فقط، وليس عبر mock flow داخل الثيم
- أي Session في الواجهة يجب أن تأتي من جلسة حقيقية مخزنة محليًا أو من تكامل لاحق آمن، وليس من حقن `customer.*` داخل الصفحة

## التحقق المحلي

```bash
npm run validate
npm run release:check
```

هذا الفحص يتأكد من وجود الملفات الأساسية وربط السكربتات والمقاطع الحساسة المطلوبة للنسخة الحالية.

## عقد المصادقة الحالي

- الثيم يقرأ هوية العميل من Twilight JS SDK فقط.
- عند أول طلب إلى صفحات العميل، ينفذ exchange إلى:

```text
/api/v1/public/auth/salla/exchange
```

- الخادم يتحقق من العميل عبر Salla Admin API ثم يصدر جلسة Sadady داخلية.
- بعد ذلك فقط تُستخدم جلسة Sadady الداخلية للوصول إلى:

```text
/api/customer/*
```

## التشغيل عبر Salla CLI

المسار المعتمد لهذا الثيم هو الاستيراد من GitHub ثم المعاينة على متجر تجريبي.

1. سجّل الدخول:

```bash
salla login
```

2. استورد الثيم من GitHub:

```bash
salla theme create
```

ثم اختر:

- `Store Theme`
- `Import a theme`
- الحساب `hmadaloba-droid`
- المستودع `sadady-salla-theme`

3. اعرض متاجر الديمو:

```bash
salla store list
```

4. قبل أي معاينة جديدة نظّف حالة الـ draft المحلية إذا ظهرت لك حالة ربط قديمة:

```bash
npm run salla:reset-state
```

5. شغّل المعاينة من جذر الثيم:

```bash
salla theme preview --store=<demo_store> --with-editor --browser=chrome
```

ملاحظات:

- هذا الثيم يعتمد `Static Home`، لذلك من الطبيعي أن تظهر رسالة عدم وجود عناصر Home قابلة للتخصيص داخل المحرر.
- إذا ظهرت معاينة قديمة أو draft غير متوقع، امسح `node_modules/.salla-cli` عبر `npm run salla:reset-state` ثم أعد `preview`.
- النشر يعتمد الآن سياسة إصدار موحدة: `package.json` و`twilight.json` وGit tag التالي يجب أن يحملوا نفس النسخة.

## ملاحظات

- مجلد `src/locales` موجود الآن كبداية بسيطة ويمكن توسيعه لاحقًا.
- هذا الثيم خاص بسدادي، لذلك صفحات Marketplace العامة ليست أولوية في النسخة الحالية.
- تفاصيل النشر والتراجع موجودة في [PRODUCTION_RUNBOOK.md](/C:/Users/ha_91/Downloads/سدادي%20سله/theme/PRODUCTION_RUNBOOK.md).
