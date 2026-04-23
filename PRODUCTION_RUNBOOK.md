# Sadady Salla Theme Production Runbook

هذا الدليل يصف الحد الأدنى المطلوب لرفع نسخة Private نظيفة من ثيم سدادي داخل سلة.

## مسار الإنشاء المعتمد

1. اربط GitHub مع Salla Partners.
2. شغّل:

```bash
salla login
salla theme create
```

3. اختر:

- `Store Theme`
- `Import a theme`
- `hmadaloba-droid`
- `sadady-salla-theme`

4. بعد الإنشاء اعرض متاجر الديمو:

```bash
salla store list
```

5. شغّل المعاينة من جذر الثيم:

```bash
salla theme preview --store=<demo_store> --with-editor --browser=chrome
```

إذا ظهرت لك حالة draft قديمة أو preview لا ينعكس عليها آخر commit:

```bash
npm run salla:reset-state
```

ثم أعد الأمر السابق.

## قبل الرفع

1. شغّل فحص الثيم:

```bash
npm run validate
npm run release:check
```

2. تأكد من ضبط `theme-config`:

- `GET /api/v1/public/theme-config`
- عند تعذر الوصول، يستخدم الثيم القيم الافتراضية المحلية

3. تأكد من أن النسخة لا تحتوي على:

- حقن `customer.*` داخل `master.twig`
- mock OTP أو mock API flows
- ملفات `submission-screenshots`

## أثناء المعاينة

اختبر الصفحات التالية:

1. `/`
2. `/tracking`
3. `/thank-you`
4. `/customer/orders`
5. `/customer/orders/single`
6. `/customer/profile`
7. `/customer/notifications`

وتأكد من التالي:

- الصفحة الرئيسية تعمل بدون أخطاء JavaScript
- `theme-config` يضبط النصوص والألوان بدون استخدام `innerHTML` لقيم خارجية
- رفع الملفات في رحلة الطلب يحول الملفات إلى payload حقيقي
- صفحة الطلبات تعرض البطاقات من الـ template الصحيح
- صفحة الشكر لا تعرض أرقامًا وهمية ثابتة

إذا ظهرت لك واجهة متجر افتراضي تجريبية بدل واجهة سدادي:

- تأكد أن الفرع المختار في الشركاء هو `main`
- تأكد أن الثيم تم استيراده من المستودع الصحيح
- نظّف حالة `node_modules/.salla-cli`
- أعد `preview` قبل اعتبارها مشكلة من Salla نفسها

## بعد التفعيل

- راقب استدعاءات `api.sadady.com`
- افحص صفحات التتبع والعميل على متجر تجريبي
- تأكد أن جلسة العميل لا تُطبع في console ولا تُحقن داخل DOM كـ debug overlay

## التراجع

إذا ظهرت مشكلة بعد النشر:

1. أوقف تفعيل النسخة الحالية داخل سلة
2. ارجع إلى آخر نسخة صالحة
3. أعد فحص `theme-config` وواجهات API والجلسة المرتبطة بالعميل

## Checklist

- [ ] `npm run validate` نجح
- [ ] `npm run release:check` نجح
- [ ] `theme-config` متاح أو fallback الافتراضي يعمل
- [ ] الصفحة الرئيسية سليمة
- [ ] التتبع يعمل
- [ ] صفحة الشكر سليمة
- [ ] صفحات العميل سليمة
- [ ] لا توجد بيانات حساسة مطبوعة في الصفحة أو console
