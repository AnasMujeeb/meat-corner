# DEPLOY_MAP — Meat Corner

> Generated: 2026-10-24
> Purpose: Full deployment audit before moving to production/Vercel.

---

## 1. FOLDER TREE (2 levels, no node_modules / dist)

```
Meat Corner Code/
├── .gitignore
├── package.json              ← root (devDep: playwright only)
├── README.md
├── admin/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   ├── favicon.svg       (9 522 B)
│   │   └── icons.svg         (5 031 B)
│   └── src/
│       ├── api/              client.js · endpoints.js
│       ├── assets/           hero.png · react.svg · vite.svg
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       ├── routes/
│       └── utils/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── pictures/             8 raw JPEG (sourced into StoryPage / KidsPage / HealthyPage)
│   ├── public/
│   │   ├── favicon.svg       (244 B)
│   │   ├── pictures/         7 JPEG (balanced meals, crafts, family*, kids)
│   │   ├── posters/          5 JPEG (video poster frames)
│   │   └── videos/           18 video files (MOV/MP4)
│   └── src/
│       ├── api/              queries.js
│       ├── api.js            ← public API client
│       ├── assets/           beverages.webp · fonts/ocraext.ttf
│       ├── components/       CartDrawer · FoodCard · Footer · Header · Img · …
│       ├── content/          home · menu · story · healthy · kids · catering · contact
│       ├── context/
│       ├── hooks/
│       ├── pages/            HomePage · MenuPage · StoryPage · HealthyPage · KidsPage · …
│       └── styles/           fonts.css · tokens.css
├── server/
│   ├── .env                  ← GITIGNORED (never pushed)
│   ├── .env.example
│   ├── package.json
│   ├── vercel.json
│   ├── scripts/              clean-db.mjs · smoke.mjs
│   ├── uploads/              ← GITIGNORED (all files except .gitkeep)
│   │   ├── processed/        150 WebP + thumb pairs (the ones served live)
│   │   ├── Appetizers/       raw originals (JPG / HEIC)
│   │   ├── Drinks/           raw originals
│   │   └── … (11 category subdirs + 2 loose WebP + .gitkeep)
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/           database.js · env.js
│       ├── controllers/      auth · branch · category · import · menuItem · settings · stats · submission · upload
│       ├── middleware/       asyncHandler · errorHandler · requireAdmin · validate
│       ├── models/           Admin · Branch · Category · MenuItem · SiteSettings · Submission
│       ├── routes/           admin.routes · auth.routes · public.routes
│       ├── seed/
│       ├── services/         import.service · storage.js
│       ├── utils/
│       └── validators/
└── videos/                   3 raw source videos (gitignored by `videos/IMG_*` rule — partial)
```

### package.json scripts

| App | Script | Command |
|-----|--------|---------|
| **root** | *(none)* | devDep: playwright only |
| **client** | `dev` | `vite` |
| | `build` | `vite build` |
| | `lint` | `oxlint` |
| | `preview` | `vite preview` |
| **admin** | `dev` | `vite` |
| | `build` | `vite build` |
| | `lint` | `oxlint` |
| | `preview` | `vite preview` |
| **server** | `dev` | `node --watch-path=… src/server.js` |
| | `start` | `node src/server.js` |
| | `seed` | `node src/seed/index.js` |
| | `clean` / `db:clean` | `node scripts/clean-db.mjs` |
| | `smoke` | `node scripts/smoke.mjs` |

---

## 2. API BASE URL HANDLING

### client/src/api.js

```js
const BASE = '/api/public';  // relative path — no VITE_ variable, no hardcoded host
```

All requests go to `/api/public/*`. In dev, Vite proxies `/api → http://localhost:5000`.
In production, the same relative path must be served from the same origin (or a reverse proxy).

### admin/src/api/client.js

```js
const BASE = '/api';  // relative path — no VITE_ variable, no hardcoded host
```

All admin requests go to `/api/*`. Same proxy/origin requirement as client.

### admin/src/api/endpoints.js — XHR upload calls

Two XMLHttpRequest calls use absolute-path strings (not a variable):

```js
xhr.open('POST', '/api/admin/upload');          // uploadApi.upload()
xhr.open('POST', '/api/admin/menu/import');     // importApi.uploadFile()
fetch('/api/admin/menu/import/template', …)    // importApi.downloadTemplate()
```

These are root-relative, not hardcoded to localhost — safe, but still proxy-dependent.

### Vite proxy config (dev + preview)

**client/vite.config.js**

```js
server: {
  port: 5173,
  host: '0.0.0.0',
  allowedHosts: true,
  proxy: {
    '/api':     { target: 'http://localhost:5000', changeOrigin: true, cookieDomainRewrite: 'localhost' },
    '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
  }
},
preview: {
  port: 4173,
  proxy: { /* same as server */ }
}
```

**admin/vite.config.js**

```js
server: {
  port: 5174,
  proxy: {
    '/api':     { target: 'http://localhost:5000', changeOrigin: true, cookieDomainRewrite: 'localhost' },
    '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
  }
}
// NOTE: no preview proxy block — admin preview would break /api and /uploads
```

> **Key point:** Neither front-end uses a `VITE_API_URL` environment variable. The entire URL strategy is proxy-based in dev. In production, all three apps must share an origin OR a reverse proxy must rewrite `/api` and `/uploads`.

---

## 3. MEDIA MAP

### 3.1 Favicons

| File | Size | Used by | Exists? | Gitignored? |
|------|------|---------|---------|-------------|
| `client/public/favicon.svg` | 244 B | `client/index.html` `<link rel="icon">` | YES | No |
| `admin/public/favicon.svg` | 9 522 B | `admin/index.html` `<link rel="icon">` | YES | No |
| `admin/public/icons.svg` | 5 031 B | Admin UI (sprite sheet) | YES | No |

### 3.2 Fonts

| Font | Source | File on disk | Used in | Exists? | Gitignored? |
|------|--------|-------------|---------|---------|-------------|
| **Inter** (300/400/500/600) | Google Fonts CDN | n/a (CDN) | `client/index.html` (non-blocking preload) | CDN | n/a |
| **Inter** (300–700) | Google Fonts CDN | n/a (CDN) | `admin/index.html` (blocking link) | CDN | n/a |
| **Space Mono** | npm `@fontsource/space-mono` | node_modules | `client/src/styles/fonts.css` @import | YES (installed) | node_modules ignored |
| **OCR A Extended** | Local TTF | `client/src/assets/fonts/ocraext.ttf` (54 KB) | `client/src/styles/fonts.css` @font-face | YES | No |

### 3.3 Social / Brand Icons

All social icons (Instagram, TikTok, WhatsApp, Talabat, Snoonu, Keeta) are **inline SVGs** defined directly in `client/src/components/Footer.jsx`. No separate image files. No gitignore concern.

### 3.4 Public-site images & videos

#### client/public/pictures/ — used by public site

| File | Size | Used by | Exists? | Gitignored? |
|------|------|---------|---------|-------------|
| `balanced meals.jpeg` | 508 KB | duplicate — see client/pictures/ | YES | No |
| `crafts and atmosphere.jpeg` | 424 KB | duplicate | YES | No |
| `family moment updated.jpeg` | 168 KB | duplicate | YES | No |
| `family moment.jpeg` | 167 KB | unused — superseded by updated version | YES | No |
| `family moments updated.jpeg` | 168 KB | duplicate | YES | No |
| `family moments.jpeg` | 167 KB | unused — superseded by updated version | YES | No |
| `kids.jpeg` | 302 KB | not directly referenced in any JSX found | YES | No |

#### client/pictures/ — imported as JS modules (bundled by Vite)

| File | Size | Used by | Exists? | Gitignored? |
|------|------|---------|---------|-------------|
| `balanced meals.jpeg` | 508 KB | `HealthyPage.jsx` → PageMotionReel background | YES | No |
| `crafts and atmosphere.jpeg` | 424 KB | `StoryPage.jsx` → img atmosphere section | YES | No |
| `family moment updated.jpeg` | 168 KB | not found in JSX imports | YES | No |
| `family moment.jpeg` | 167 KB | not found in JSX imports | YES | No |
| `family moments updated.jpeg` | 168 KB | `KidsPage.jsx` → PageMotionReel background | YES | No |
| `family moments.jpeg` | 167 KB | not found in JSX imports | YES | No |
| `kids.jpeg` | 302 KB | not found in JSX imports | YES | No |
| `outside pic.jpeg` | 197 KB | `StoryPage.jsx` → img concept section | YES | No |

#### client/src/assets/

| File | Size | Used by | Exists? | Gitignored? |
|------|------|---------|---------|-------------|
| `beverages.webp` | 23 KB | not found in any JSX import — likely unused | YES | No |
| `fonts/ocraext.ttf` | 54 KB | `client/src/styles/fonts.css` @font-face | YES | No |

#### client/public/videos/ — served at /videos/ via Vite static

| File | Size | Used by | Gitignored? |
|------|------|---------|-------------|
| `secondvideo.mp4` | 6.4 MB | `HomePage.jsx` hero LazyVideo | No |
| `fromthekitchen-540p.mp4` | 1.8 MB | `HomePage.jsx` story card 0 | No |
| `selection-540p.mp4` | 1.7 MB | `HomePage.jsx` story card 1 | No |
| `img3129-540p.mp4` | 954 KB | `HomePage.jsx` story card 2 | No |
| `img3084-540p.mp4` | 1.2 MB | `HomePage.jsx` story split section | No |
| `from-the-kitchen.mov` | 4.5 MB | `content/home.js` card.video fallback | No |
| `img3129.mov` | 17 MB | `content/home.js` story card 2 video path | No |
| `fromthekitchen.mp4` | 4.5 MB | duplicate of .mov, not referenced directly | No |
| `secondvideo.mov` | 27.5 MB | unused — mp4 version used in JSX | No |
| `second-video.MOV` | 27.5 MB | duplicate MOV | No |
| `selection.MOV` | 31.8 MB | raw source | No |
| `selection.mp4` | 31.8 MB | unoptimized dupe | No |
| `selection-web.mp4` | 9.2 MB | not referenced in JSX | No |
| `fromthekitchen-web.mp4` | 6.3 MB | not referenced in JSX | No |
| `img3084-web.mp4` | 4.2 MB | not referenced in JSX | No |
| `img3129-web.mp4` | 5.1 MB | not referenced in JSX | No |
| `img_3084.mp4` | 4.8 MB | not referenced in JSX | No |

#### client/public/posters/ — video poster frames

| File | Size | Used by | Exists? | Gitignored? |
|------|------|---------|---------|-------------|
| `posters/secondvideo.jpg` | 176 KB | `HomePage.jsx` hero poster | YES | No |
| `posters/fromthekitchen.jpg` | 191 KB | `HomePage.jsx` story card 0 poster | YES | No |
| `posters/selection.jpg` | 217 KB | `HomePage.jsx` story card 1 poster | YES | No |
| `posters/img3129.jpg` | 260 KB | `HomePage.jsx` story card 2 poster | YES | No |
| `posters/img3084.jpg` | 231 KB | `HomePage.jsx` story split poster | YES | No |

> Note: `settings.heroPoster` (from DB / SiteSettings) can override the hero poster at runtime.

#### Hardcoded /uploads/processed/ image paths in JSX (not dynamic DB images)

| Path | Used by | File exists? |
|------|---------|--------------|
| `/uploads/processed/meat-corner-nachos.webp` | `HomePage.jsx` catering split, `CateringPage.jsx` hero | YES |
| `/uploads/processed/meat-corner-nachos_thumb.webp` | `HomePage.jsx` srcSet | YES |
| `/uploads/processed/chicken-shawarma-bowl.webp` | `HealthyPage.jsx` split | YES |
| `/uploads/processed/mac-cheese.webp` | `KidsPage.jsx` split | YES |
| `/uploads/processed/shashlik-tenderloin.webp` | `CateringPage.jsx` (commented-out section) | YES |
| `/uploads/processed/wagyu-striploin-entrecote-steak.webp` | `content/home.js` story card | YES |

### 3.5 Admin assets

| File | Size | Used by | Exists? | Gitignored? |
|------|------|---------|---------|-------------|
| `admin/public/favicon.svg` | 9 522 B | admin index.html | YES | No |
| `admin/public/icons.svg` | 5 031 B | admin UI sprite | YES | No |
| `admin/src/assets/hero.png` | 12.8 KB | not found in JSX — likely unused placeholder | YES | No |
| `admin/src/assets/react.svg` | 4 KB | default Vite asset, unused | YES | No |
| `admin/src/assets/vite.svg` | 8.5 KB | default Vite asset, unused | YES | No |

### 3.6 server/uploads/ — how menu images are stored

**MenuItem schema** (`server/src/models/MenuItem.js`):

```js
images: [{
  url:      String,   // e.g. "/uploads/processed/angus-kofta-with-cheese.webp"
  thumbUrl: String,   // e.g. "/uploads/processed/angus-kofta-with-cheese_thumb.webp"
  alt:      String,
}]
```

**Category image** (`server/src/models/Category.js`):

```js
image: String  // plain URL string, e.g. "/uploads/processed/angus-kofta-with-cheese.webp"
```

**How uploads are served:**
`server/src/app.js` mounts `express.static(UPLOAD_DIR)` at `/uploads` with `maxAge: '1y', immutable: true`.
`UPLOAD_DIR` defaults to `'uploads'` (relative to CWD, resolves to `server/uploads/`).

**How files are generated:**
`server/src/services/storage.js` uses sharp to write:
- Main: `UPLOAD_DIR/<baseName>.webp` (max 1200 px wide, quality 82) → URL `/uploads/<baseName>.webp`
- Thumb: `UPLOAD_DIR/<baseName>_thumb.webp` (max 400 px wide, quality 78) → URL `/uploads/<baseName>_thumb.webp`

**Example DB values:**

```json
{
  "url":      "/uploads/processed/angus-kofta-with-cheese.webp",
  "thumbUrl": "/uploads/processed/angus-kofta-with-cheese_thumb.webp",
  "alt":      "Angus Kofta with Cheese"
}
```

---

## 4. COUNTS

| Metric | Value |
|--------|-------|
| Total files in `server/uploads/` (incl. subdirs, excl. `.gitkeep`) | **227** |
| WebP files (processed, served live) | **152** |
| Non-WebP raw originals (JPG / HEIC / PNG) | **75** |
| Total size of `server/uploads/` | **~406 MB** |
| MongoDB database | **Atlas** |
| DB name | **meat-corner** |
| Collections | admins, categories, menuitems, sitesettings, branches, submissions |
| Menu items count | Cannot query live DB from this static audit |
| Items with missing image files | Cannot determine without live DB query |

> **Note on image paths:** Items created via seed/import store paths under `/uploads/processed/`. The 75 raw files in category subdirs (JPG/HEIC) are **not** referenced by the DB; only the 150 processed WebP pairs are actually served.
>
> To count broken image references, run this script against the live DB:
>
> ```js
> const items = await MenuItem.find({}, 'images').lean();
> const broken = items.filter(i =>
>   i.images.some(img => !fs.existsSync(path.join(UPLOAD_DIR, path.basename(img.url))))
> );
> console.log('Total items:', items.length, 'With missing files:', broken.length);
> ```

---

## 5. SERVER SETTINGS FOR DEPLOYMENT

### PORT

```
Default: 5000 (env.PORT, validated by Zod)
Vercel will inject its own PORT — the app reads process.env.PORT correctly.
```

### CORS origins

```js
// server/src/app.js
const allowedOrigins = [env.CLIENT_URL, env.ADMIN_URL];
// Currently: http://localhost:5173 and http://localhost:5174
// MUST be changed to production URLs before deploy
```

### Cookie options

```js
// server/src/controllers/auth.controller.js
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',                          // WARNING — see deployment problem #5
  secure: env.NODE_ENV === 'production',       // HTTPS only in prod — correct
  maxAge: 7 * 24 * 60 * 60 * 1000,            // 7 days
  // domain: NOT SET — uses browser default (current host)
};
```

> **Warning:** `sameSite: 'strict'` means cookies are not sent on cross-site navigations. If the admin panel and API are on different subdomains, auth will silently fail.

### JWT

```
JWT_SECRET: min 32 chars (Zod enforced, exits process on failure)
JWT_EXPIRES_IN: default '7d'
Algorithm: HS256 (jsonwebtoken default)
```

### Rate limits

| Limiter | Window | Max (prod) | Max (dev) | Applied to |
|---------|--------|-----------|-----------|------------|
| Global | 15 min | 300 | 5 000 | `/api/*` |
| Auth | 15 min | 20 | 20 | `/api/auth/*` |

> **Warning:** No `app.set('trust proxy', 1)` anywhere in app.js. On Vercel, all requests appear to come from the same proxy IP, breaking rate limiting.

### Upload / Multer / Sharp

```
Storage:    multer.memoryStorage() — RAM buffer, no temp disk file
Max size:   8 MB (multer fileSize limit)
Allowed:    image/jpeg, image/png, image/webp, image/gif, image/avif
Output:     sharp converts to WebP
  - Main image:  max 1200 px wide, quality 82
  - Thumbnail:   max 400 px wide, quality 78
Written to: UPLOAD_DIR (env variable, default 'uploads' relative to CWD)
JSON body:  2 MB limit (express.json)
```

### Trust proxy

```
NOT SET — app.set('trust proxy') is absent from server/src/app.js
```

### Local disk writes

1. `server/uploads/<baseName>.webp` — every upload creates 2 WebP files
2. `server/uploads/processed/` — seeded/imported images written by storage.js
3. `fs.mkdir(UPLOAD_DIR, { recursive: true })` is called at module load time in storage.js

---

## 6. LOCALHOST / PORT / ABSOLUTE URL REFERENCES

### In application source code (*.js, *.jsx only — not README or reports)

| File | Line | Value | Type |
|------|------|-------|------|
| `client/vite.config.js` | 27 | `http://localhost:5000` | Vite dev proxy target for /api |
| `client/vite.config.js` | 29 | `cookieDomainRewrite: "localhost"` | Proxy cookie rewrite |
| `client/vite.config.js` | 32 | `http://localhost:5000` | Vite dev proxy target for /uploads |
| `client/vite.config.js` | 43 | `http://localhost:5000` | Vite preview /api proxy target |
| `client/vite.config.js` | 45 | `cookieDomainRewrite: "localhost"` | Preview cookie rewrite |
| `client/vite.config.js` | 48 | `http://localhost:5000` | Vite preview /uploads proxy target |
| `admin/vite.config.js` | 10 | `http://localhost:5000` | Admin Vite dev proxy target for /api |
| `admin/vite.config.js` | 12 | `cookieDomainRewrite: 'localhost'` | Admin proxy cookie rewrite |
| `admin/vite.config.js` | 15 | `http://localhost:5000` | Admin dev proxy target for /uploads |

> **Good news:** `client/src/`, `admin/src/`, and `server/src/` contain **zero** hardcoded `localhost` or `127.0.0.1` strings. All localhost references are in Vite config files (never bundled into production builds) and .env files.

### In .env / .env.example (variable names — no secret values)

```
CLIENT_URL          → currently http://localhost:5173  (MUST change for prod)
ADMIN_URL           → currently http://localhost:5174  (MUST change for prod)
MONGODB_URI         → .env.example shows 127.0.0.1 example; actual .env uses Atlas
```

### Port summary

| Port | Where used | Purpose |
|------|-----------|---------|
| **5000** | `server/.env` + both `vite.config.js` proxy targets | Express API server |
| **5173** | `client/vite.config.js` server.port | Client Vite dev server |
| **5174** | `admin/vite.config.js` server.port | Admin Vite dev server |
| **4173** | `client/vite.config.js` preview.port | Client preview server |

---

## 7. .GITIGNORE CONTENTS AND WHAT GIT WOULD NOT UPLOAD

### Full .gitignore (root file, applies globally)

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Environment variables
.env
**/.env
!.env.example
**/.env.local
**/.env.production

# Build outputs
dist/
build/
.vite/

# Uploads (user content – keep directory, ignore files)
server/uploads/*
!server/uploads/.gitkeep

# Logs
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo

# Sharp / native binaries
**/.cache/

# Coverage
coverage/

# Local raw scratch dumps
*.pdf
pdf_extracted_text.txt
videos/IMG_*
```

### What git would NOT upload (critical items)

| Path | Rule | Impact |
|------|------|--------|
| `server/.env` | `**/.env` | **CRITICAL** — all secrets missing; server will not start |
| `server/uploads/*` | `server/uploads/*` | All 227 files missing — every menu image 404s in prod |
| `server/uploads/.gitkeep` | negated `!` — WILL be committed | Just the placeholder |
| `node_modules/` (all) | `**/node_modules/` | Must run `npm install` on deploy |
| `dist/`, `build/`, `.vite/` | build rules | Must build on deploy server |
| `*.pdf` | `*.pdf` | Menu reference PDF excluded |
| `pdf_extracted_text.txt` | explicit rule | Excluded |
| `videos/IMG_3084.MP4`, `videos/IMG_3129.MOV` | `videos/IMG_*` | Excluded |

### What is NOT gitignored but should probably be

| Path | Issue |
|------|-------|
| `client/public/videos/*.MOV` | Large raw source files (second-video.MOV 28 MB, selection.MOV 32 MB, img3129.mov 17 MB) — not excluded |
| `chrome_profile/` | Chrome profile data accidentally committed |
| `reports/` | Lighthouse JSON report files (~large) not excluded |

### What IS committed intentionally

| Path | Rule |
|------|------|
| `server/.env.example` | `!.env.example` negation |
| `server/uploads/.gitkeep` | `!server/uploads/.gitkeep` negation |

---

## 8. PROBLEMS FOR DEPLOYING TO VERCEL

### CRITICAL — will break on Vercel

**1. Local-disk image uploads are impossible.**
Vercel serverless functions run on a read-only filesystem (only `/tmp` is writable).
`server/src/services/storage.js` calls `fs.mkdir(UPLOAD_DIR)` at module load time and `fs.writeFile` (via sharp) on every upload request. Both will throw on Vercel.
Every `POST /api/admin/upload` will 500-error.
**Fix:** Swap `storage.js` for a cloud adapter (Cloudinary, AWS S3, Vercel Blob).

**2. Uploaded images are lost between requests.**
Even if writes to `/tmp` were made to work, Vercel containers are ephemeral — `/tmp` is wiped on cold starts. An image uploaded in one request is invisible to the next invocation.

**3. `express.static` serving of /uploads will 404 for all images.**
`server/src/app.js` mounts `express.static(uploadsDir)` at `/uploads`. On Vercel, the filesystem has no `uploads/` directory at the expected path, and `vercel.json` routes all requests through `server.js`, bypassing Vercel's native static file serving entirely.
All 150+ processed WebP images will return 404.

**4. `app.set('trust proxy')` is missing — rate limiting will break.**
Vercel sits behind a load balancer that forwards `X-Forwarded-For`. Without `app.set('trust proxy', 1)`, `express-rate-limit` reads the wrong IP and treats all users as one client.
With a global limit of 300 req/15 min, a few active users could exhaust the quota for everyone.

**5. `sameSite: 'strict'` will block admin auth cookies cross-origin.**
If the admin panel and the API are on different subdomains (e.g., admin.yourdomain.com vs api.yourdomain.com), `SameSite=Strict` prevents the browser from sending the `token` cookie on navigation. Login will appear to work but every subsequent admin API call will return 401.
**Fix:** Use `sameSite: 'lax'` for same-site subdomain deployments, or `'none'` + `secure: true` for true cross-origin.

**6. CORS origins are still localhost.**
`server/.env` sets `CLIENT_URL=http://localhost:5173` and `ADMIN_URL=http://localhost:5174`.
Every API request from the production front-ends will be rejected with a CORS error.
**Fix:** Set `CLIENT_URL` and `ADMIN_URL` to the real production URLs in Vercel's environment variable dashboard.

### IMPORTANT — broken UI / missing media

**7. Hardcoded `/uploads/processed/` paths in JSX will 404.**
These files are referenced directly in source:
- `HomePage.jsx`: `/uploads/processed/meat-corner-nachos.webp`
- `HealthyPage.jsx`: `/uploads/processed/chicken-shawarma-bowl.webp`
- `KidsPage.jsx`: `/uploads/processed/mac-cheese.webp`
- `CateringPage.jsx`: `/uploads/processed/meat-corner-nachos.webp`
- `content/home.js`: `/uploads/processed/wagyu-striploin-entrecote-steak.webp`

These files exist only on local disk and are gitignored. They will all 404 in production.
**Fix:** Migrate to CDN URLs and update JSX, or store these paths as DB settings.

**8. All 227 upload files are gitignored — DB image URLs will 404.**
The 150 processed WebP pairs in `server/uploads/processed/` that the DB references are gitignored. They do not exist in git and will not be available on Vercel.
**Fix:** Upload all processed images to a CDN/blob store and update the DB URLs before deploying.

**9. Large raw video files (~175 MB) not gitignored in client/public/videos/.**
18 video files are committed. Several raw MOV files (second-video.MOV 28 MB, selection.MOV 32 MB) are not needed at runtime and bloat the Vercel deployment bundle (Vercel has a 100 MB compressed deployment limit for static files).
**Fix:** Add `.MOV` and unused `.mp4` variants to `.gitignore`; serve videos from a CDN.

**10. Admin `vite.config.js` has no `preview` proxy block.**
Running `vite preview` for the admin panel will break all `/api` and `/uploads` requests because the preview server has no proxy configured (unlike the dev server). Affects pre-deployment testing.

**11. `content/home.js` references `.mov` files.**
`video: '/videos/from-the-kitchen.mov'` and `video: '/videos/img3129.mov'` — `.MOV` files are Apple QuickTime format and are not natively playable in Firefox or Chrome on non-Mac platforms.
**Fix:** Use the already-existing `-540p.mp4` variants.

**12. No `VITE_API_URL` — production builds depend on proxy or same-origin.**
The Vite proxy only exists during `vite dev` and `vite preview`. The production build (static HTML/JS/CSS) has no proxy. All `/api` and `/uploads` fetch calls will go to the same origin that serves the HTML. If the front-end and API are on different domains (common with Vercel + Railway or similar), every API call will fail with a network error or CORS rejection.
**Fix:** Add a `VITE_API_URL` env variable and use it as the base URL, or deploy client/admin and server on the same domain with a reverse proxy.

### MINOR

**13. `chrome_profile/` is not gitignored.**
Chrome profile data will be pushed to git accidentally.

**14. Duplicate image files.**
`client/public/pictures/` mirrors `client/pictures/` (7 JPEG duplicates, ~1.7 MB each set). Only the `client/pictures/` JS-import versions are used in JSX.

**15. Default Vite placeholder assets in admin.**
`admin/src/assets/react.svg` and `vite.svg` are leftover Vite scaffold files. Not harmful but add unnecessary clutter.

**16. `server/vercel.json` routes all `(.*)` through `server.js`.**
This means Vercel routes even `/uploads/*` paths through the serverless function, which then calls `express.static` — but the files don't exist on the Vercel filesystem. The result is a 404 from inside the function (not a fast CDN 404), adding unnecessary latency to every broken image request.
