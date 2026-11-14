# معماری rozetext

سه محصول، یک ریپوی خصوصی:

1. **سایت** روی دامنه پیج — مدیاکیت برای جذب تبلیغ‌دهنده
2. **داشبورد** — آمار پیج، قابل اجرا به‌صورت لوکال و روی سرور
3. **اسکیل پیج** — لحن، فرمت و قواعد تولید محتوا

## اصول

- صفر فریم‌ورک و صفر dependency در runtime؛ Node 22 و امکانات خودش کافی است.
- داده در JSON، با نوشتن اتمیک (tmp + rename)؛ git تاریخچه را نگه می‌دارد.
- هر عدد یک منبع و یک تاریخ دارد. عدد ساختگی، تخمینی یا «تا امروز» بی‌تاریخ ممنوع.
- کلید BeatAPI فقط در env سرور؛ هیچ‌وقت در مرورگر یا ریپو.
- داشبورد و سایت از یک مدل داده می‌خوانند؛ سایت فقط فیلدهای whitelist را می‌بیند.

## ساختار

```
rozetext/
├─ AGENTS.md                       قوانین کار روی ریپو
├─ DESIGN.md                       جهت بصری مشترک سایت و داشبورد
├─ .opencode/skills/rozetext/      اسکیل پیج (در همین پروژه خودکار لود می‌شود)
│  ├─ SKILL.md
│  └─ references/{voice,formats,typography}.md
│
├─ site/                           سورس سایت عمومی
│  ├─ index.html
│  ├─ styles.css
│  └─ assets/
│
├─ dashboard/                      UI داشبورد، سروشده توسط server
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
│
├─ server/                         یک پروسه Node
│  ├─ index.mjs                    static + API + auth
│  ├─ auth.mjs                     پسورد، کوکی HMAC، rate limit
│  └─ routes.mjs
│
├─ bot/
│  ├─ index.mjs                    ربات تلگرام: منوی اسکیل‌ها → opencode run
│  ├─ skills.mjs                   تنها منبع اسم فارسی و راهنمای اسکیل‌ها
│  ├─ miniapp.mjs                  سرور محلی مینی‌اپ + تونل cloudflared
│  └─ miniapp/                     صفحهٔ مینی‌اپ (HTML/CSS/JS، بدون build)
│
├─ lib/
│  ├─ beatapi.mjs                  کلاینت BeatAPI (فقط سرور)
│  ├─ normalize.mjs                پاسخ خام → مدل داخلی
│  └─ store.mjs                    خواندن/نوشتن data
│
├─ scripts/
│  ├─ sync.mjs                     گرفتن داده تازه
│  └─ build-site.mjs               data + قالب → dist/
│
├─ data/
│  ├─ profile.json                 فالوور، فالووینگ، تعداد پست، بیو، آواتار، fetched_at
│  ├─ posts.json                   هر پست: نوع، تاریخ، لایک، کامنت، ویو، کپشن، لینک
│  ├─ growth.json                  یک رکورد در روز: فالوور، تعداد پست
│  ├─ insights.json                ریچ/سیو/بازدید پروفایل — ورود دستی
│  └─ media-kit.json               تعرفه، فرمت‌های تبلیغ، مخاطب، راه تماس
│
├─ dist/                           خروجی سایت (gitignore)
├─ docs/ARCHITECTURE.md
├─ .env.example
└─ package.json
```

## جریان داده

```
BeatAPI ──sync.mjs──> data/{profile,posts,growth}.json
داشبورد ──فرم──────> data/{insights,media-kit}.json
                                │
                     build-site.mjs (whitelist)
                                │
                              dist/ ──> Cloudflare Pages ──> دامنه

server ──> dashboard  (لوکال یا VPS، پشت پسورد)
telegram ──> bot ──> opencode run --session …  (همان سشن دسکتاپ)
```

## ربات تلگرام

- یک پروسه Node، بدون dependency: `npm run bot`.
- هر اسکیل یک دکمه است؛ دکمه فقط اسکیل را انتخاب می‌کند، پیام بعدی با آن اسکیل اجرا می‌شود.
- اجرای کار از `opencode-cli run --session <id> --auto --format json` در ریشهٔ ریپو انجام می‌شود؛ سشن همان سشنی است که در اپ دسکتاپ دیده می‌شود.
- فقط یک chat id مجاز است (`TELEGRAM_ALLOWED_CHAT_ID`). خالی باشد، ربات id را چاپ می‌کند و اجرا نمی‌کند.
- ربات را می‌شود به گروه اضافه کرد؛ گروه‌ها در `runtime/telegram-groups.json` ثبت می‌شوند و صفحهٔ ربات در داشبورد از همان فهرست، عکس/ویدیو/متن را در گروه می‌فرستد. در گروه هم فقط پیام خود مالک اجرا می‌شود.
- `--auto` یعنی ابزارها بدون تأیید اجرا می‌شوند. ربات را فقط روی ماشین خودت و با allowlist نگه دار.
- مینی‌اپ: `bot/miniapp/` استاتیک است و `bot/miniapp.mjs` روی `MINIAPP_PORT` (پیش‌فرض 8787) سرو می‌کند. ربات در استارت با `cloudflared` یک تونل `trycloudflare.com` می‌گیرد و دکمهٔ منوی چت را به آن آدرس وصل می‌کند. آدرس هر ری‌استارت عوض می‌شود.
- انتخاب هر اسکیل در مینی‌اپ یک دیپ‌لینک است (`t.me/<bot>?start=sk_<name>`)، نه فراخوانی سرور. برای همین هیچ کلیدی داخل صفحه نیست.

- `sync` روزی یک رکورد در `growth.json` می‌نویسد؛ اجرای دوباره در همان روز همان رکورد را به‌روز می‌کند.
- `posts.json` با `id` پست کلید می‌خورد؛ پست حذف‌شده از اینستاگرام پاک نمی‌شود، `archived` می‌گیرد.
- `build-site.mjs` هیچ فایل داده‌ای را مستقیم کپی نمی‌کند؛ فقط فیلدهای تعریف‌شده را در HTML می‌نشاند.

## مدل داده (حداقل فیلدها)

| فایل | فیلدها |
|---|---|
| `profile.json` | `username, full_name, biography, followers, following, posts_count, profile_pic_url, fetched_at` |
| `posts.json` | `id, shortcode, url, type, caption, taken_at, likes, comments, views, archived` |
| `growth.json` | `date, followers, posts_count` |
| `insights.json` | `date, reach, impressions, profile_visits, saves, shares, audience_age, audience_city` |
| `media-kit.json` | `contact, formats[], pricing[], audience_notes, testimonials[]` |

## API

همه مسیرها به‌جز `login` پشت کوکی هستند.

| متد | مسیر | کار |
|---|---|---|
| POST | `/api/login` | پسورد → کوکی امضاشده |
| POST | `/api/logout` | پاک کردن کوکی |
| GET | `/api/overview` | کارت‌های آمار + delta ۷/۳۰ روز |
| GET | `/api/posts` | لیست پست‌ها |
| GET | `/api/growth?range=30` | سری زمانی |
| GET/PUT | `/api/media-kit` | خواندن/ذخیره مدیاکیت |
| GET/PUT | `/api/insights` | خواندن/ذخیره آمار دستی |
| POST | `/api/sync` | اجرای sync، برگرداندن diff |

## سایت

یک صفحه، بالای صفحه تا تماس:

1. هویت پیج + یک جمله راست درباره‌اش
2. اعداد کلیدی: فالوور، میانگین ویو، نرخ تعامل، ریچ ماهانه (اگر دستی وارد شده)
3. آثار منتخب (۳ تا ۶ پست)
4. چرا اینجا تبلیغ کند: مخاطب، فرمت‌ها، تعرفه
5. تماس: دایرکت، ایمیل، واتساپ/تلگرام
6. تاریخ آخرین به‌روزرسانی آمار

ساخت: `node scripts/build-site.mjs` → `dist/`. دیپلوی: Cloudflare Pages از برنچ `main`، فقط `dist/`.

## داشبورد

- یک پروسه Node، سرو کردن `dashboard/` و API.
- پروتوتایپ فعلی: Vite + React + TypeScript + Tailwind + MUI، با دادهٔ واقعی از `data/`. تصمیم نهایی دربارهٔ استک بعد از تأیید پروتوتایپ گرفته می‌شود.
- دادهٔ داشبورد با `npm run dashboard:data` از `data/` ساخته می‌شود و در `dashboard/src/data/snapshot.json` می‌نشیند.
- لوکال: `npm run dashboard:dev` روی `localhost:5173`.
- سرور: همان کد روی VPS با Caddy برای HTTPS؛ `DATA_DIR` روی دیسک پایدار.
- امنیت: پسورد از env، کوکی `HttpOnly; Secure; SameSite=Strict` در production، حداکثر ۵ تلاش ورود در ۱۵ دقیقه، بدنه JSON محدود.

## اسکیل پیج

`.opencode/skills/rozetext/SKILL.md` در همین پروژه خودکار لود می‌شود و نگه می‌دارد:

- لحن و واژگان دلنوشته؛ چیزهایی که هرگز نوشته نمی‌شوند
- ساختار کپشن، قلاب، پایان، دعوت به اقدام
- فرمت‌ها: تک‌عکس، کروسل، ریلز متنی
- قواعد هشتگ و زمان انتشار
- ارجاع به `DESIGN.md` برای تایپ، رنگ و فاصله

## دیپلوی

| بخش | مقصد | trigger |
|---|---|---|
| سایت | Cloudflare Pages | push به `main`، build: `node scripts/build-site.mjs`، output: `dist` |
| داشبورد | VPS (Node + Caddy) | `git pull` + ری‌استارت سرویس |
| داده | همان ریپو | sync از داشبورد |

## فازها

1. **P0** — معماری، قوانین ریپو، env، اسکلت
2. **P1** — sync + داده واقعی + داشبورد آماری (خواندن)
3. **P2** — سایت مدیاکیت + دیپلوی Cloudflare
4. **P3** — ویرایش مدیاکیت و آمار دستی از داشبورد
5. **P4** — آمار خصوصی با توکن Meta، اگر لازم شد

## تصمیم‌های ردشده

- **دیتابیس**: حجم داده صدها رکورد است، نه میلیون؛ JSON + git کافی است.
- **فریم‌ورک فرانت**: سایت تک‌صفحه‌ای و داشبورد یک صفحه است؛ React فقط وزن و بیلد اضافه می‌کند.
- **کتابخانه چارت**: دو نمودار ساده با SVG دستی، بدون ۲۰۰ کیلوبایت JS.
- **CMS**: مدیاکیت یک فایل JSON است؛ فرم داشبورد همان را می‌نویسد.
- **اسکرپینگ اختصاصی**: BeatAPI پوشش می‌دهد؛ نگهداری پروکسی و لاگین ارزشش را ندارد.
