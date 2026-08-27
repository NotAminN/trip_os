# استقرار Trip OS روی Vercel (Deployment Guide)

معماری پروژه: **Backend Django 5.2 + DRF** در `backend/` و **Frontend Vite (Vanilla JS)** در `front/`.
این دو بخش روی Vercel به‌صورت **دو پروژهٔ مستقل از یک ریپو** دیپلوی می‌شوند.

```text
Browser → Vercel (Frontend Static) → fetch /api → Vercel Serverless (Django) → PostgreSQL
```

> **توجه:** Deploy انجام نشده؛ این راهنما فقط مراحل آماده‌سازی شده را توضیح می‌دهد.

---

## گام ۱ — دیتابیس PostgreSQL (Production)

پروژه در حال حاضر DB_* env variables را می‌خواند (`backend/config/settings/base.py`).
یکی از سرویس‌های زیر را تهیه کنید:
- Vercel Marketplace → Neon / Supabase / Prisma Postgres
- یا Neon/Supabase مستقیم

مقادیر لازم برای گرفتن: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` (default `5432`).

---

## گام ۲ — Backend روی Vercel

1. در Vercel یک Project جدید بسازید، ریپو را انتخاب کنید.
2. **Root Directory** را روی `backend` تنظیم کنید (Other Framework).
3. فایل `backend/api/index.py` به‌صورت خودکار Serverless Function می‌شود
   و `backend/vercel.json` تمام مسیرها (`/(.*)`) را به آن rewrite می‌کند
   و `collectstatic --noinput` را در مرحلهٔ Build اجرا می‌کند (WhiteNoise برای Admin Static).
4. Environment Variables زیر را در تنظیمات پروژه Backend وارد کنید:

| Variable | Example |
|---|---|
| SECRET_KEY | (یک مقدار تصادفی طولانی — هرگز داخل کد نباشد) |
| DEBUG | False |
| ALLOWED_HOSTS | trip-os-backend.vercel.app , your-domain.com |
| DB_NAME | postgres |
| DB_USER | postgres |
| DB_PASSWORD | … |
| DB_HOST | …neon.tech |
| DB_PORT | 5432 |
| CORS_ALLOWED_ORIGINS | https://trip-os-frontend.vercel.app , https://your-domain.com |
| CSRF_TRUSTED_ORIGINS | https://trip-os-backend.vercel.app , https://your-domain.com |
| SECURE_SSL_REDIRECT | True |

> نکته: هنگام اجرا روی Vercel (`VERCEL=1`) دامنه‌های `*.vercel.app` به‌صورت خودکار هم مجاز می‌شوند.

5. بعد از اولین Deploy، یک‌بار Migrations را روی Production DB اجرا کنید:

```bash
cd backend
python manage.py migrate   # با متغیرهای DB_* مربوط به دیتابیس Production
```

### Health Check
پس از دیپلوینگ بک‌اند: `https://<backend>.vercel.app/api/health/`
خروجی مورد انتظار: `{"status":"ok","database":"ok"}`

---

## گام ۳ — Frontend روی Vercel

1. پروژهٔ دوم را بسازید، Root Directory = `front` (Framework: Vite خودکار شناسایی می‌شود).
2. اگر API روی origin دیگر است، Environment Variable زیر را ست کنید
   (برای Cross-origin بودن، سه متغیر `CORS_ALLOWED_ORIGINS` و `CSRF_TRUSTED_ORIGINS` بک‌اند هم باید این دامنه فرانت را داشته باشند):

```env
VITE_API_URL=https://trip-os-backend.vercel.app/api
```

3. Build Command: `npm run build` (پیشفرض) — خروجی: `dist`.

### جایگزین Same-origin (اختیاری)
اگر بخواهید `/api` بدون CORS مستقیماً از همان دامنهٔ فرانت به بک‌اند proxied شود، فایل `front/vercel.json` اضافه کنید:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<backend-host>/api/:path*" }
  ]
}
```

در این حالت نیازی به ست کردن `VITE_API_URL` نیست.

---

## گام ۴ — Media Files (مهم)

مدل `Trip.covers` و آواتار کاربران روی دیسک محلی ذخیره می‌شوند که در Vercel Serverless **ماندگار نیست** (Ephemeral). تا زمان انتقال به Object Storage (Cloudinary/S3)، نمایش منابع Media در Production تضمینی نیست و `SERVE_MEDIA_IN_PROD=False` پیشنهاد می‌شود. تغییر به Cloudinary باید طی یک PR جدا انجام شود.

## محدودیت‌ها / Next Steps

- [ ] اتصال به Cloudinary/S3 برای Media (تغییر Storage Backend)
- [ ] URLهای `dashboard/` و سایر لیست‌های API بر مبنای همان prefix فعلی `/api` ثابت مانده‌اند.
