# Meat Corner – Restaurant Website

Production monorepo for **Meat Corner**, a premium burger & steak restaurant in Doha, Qatar (Madinat Khalifa & Centro branches).

**Stack:** MERN (MongoDB · Express · React · Node.js) — JavaScript ES Modules throughout.

---

## Repo Structure

```
meat-corner/
├── server/               # Node + Express + Mongoose API
│   ├── src/
│   │   ├── config/       # env validation (Zod), database connection
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # Route definitions
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # asyncHandler, errorHandler, requireAdmin, validate
│   │   ├── services/     # storage.js (local → Cloudinary/S3 swappable), import.service.js
│   │   ├── validators/   # Zod schemas per domain
│   │   ├── utils/        # slug helpers, pagination, cache headers
│   │   └── seed/         # Idempotent seed script
│   ├── uploads/          # User-uploaded files (gitignored; served as static)
│   ├── .env.example
│   └── package.json
├── client/               # Vite + React (Phase 2+)
├── admin/                # Vite + React admin panel (Phase 3+)
├── .gitignore
└── README.md
```

---

## Environment Setup

```bash
# 1. Copy and fill environment variables
cp server/.env.example server/.env
```

Edit `server/.env`:

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `5000`) |
| `NODE_ENV` | `development` \| `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | ≥32 character random string |
| `JWT_EXPIRES_IN` | Token TTL, e.g. `7d` |
| `CLIENT_URL` | Public site URL (CORS allowlist) |
| `ADMIN_URL` | Admin panel URL (CORS allowlist) |
| `UPLOAD_DIR` | Relative path for uploads (default: `uploads`) |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |

---

## Running Locally

### Server

```bash
cd server
npm install
npm run dev        # node --watch (Node 18+)
```

### Client (Phase 2)

```bash
cd client
npm install
npm run dev        # Vite dev server → http://localhost:5173
```

### Admin (Phase 3)

```bash
cd admin
npm install
npm run dev        # Vite dev server → http://localhost:5174
```

### Seed Database

```bash
cd server
npm run seed
```

Seed is **idempotent** – safe to run multiple times. It creates:
- 1 admin user (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Default `SiteSettings` document
- 2 branches: Madinat Khalifa, Centro
- 5 sample categories
- 6 sample menu items *(clearly marked – delete via admin panel after setup)*

---

## API Overview

All responses follow: `{ success: boolean, data?: any, message?: string }`

### Health

```
GET /api/health
```

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Login → sets httpOnly JWT cookie |
| `POST` | `/api/auth/logout` | — | Clear cookie |
| `GET` | `/api/auth/me` | ✅ | Current admin info |

### Public (no auth, cached)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/public/categories` | Active categories, ordered |
| `GET` | `/api/public/menu` | Menu items (filter: `?category=&tag=&q=&page=&limit=`) |
| `GET` | `/api/public/menu/:slug` | Single menu item |
| `GET` | `/api/public/branches` | Active branches |
| `GET` | `/api/public/settings` | Site settings (branding, socials) |
| `POST` | `/api/public/contact` | Contact form submission |
| `POST` | `/api/public/catering` | Catering inquiry |

### Admin (requireAdmin cookie/bearer)

**Upload**
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/upload` | Image upload → returns `{ url, thumbUrl }` (WebP) |

**Categories**
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/categories` | List all |
| `GET` | `/api/admin/categories/:id` | Get one |
| `POST` | `/api/admin/categories` | Create |
| `PUT` | `/api/admin/categories/:id` | Update |
| `DELETE` | `/api/admin/categories/:id` | Delete (blocked if items assigned) |
| `PATCH` | `/api/admin/categories/reorder` | Reorder `{ ids: [...] }` |

**Menu Items**
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/menu` | List (filter: `?category=&tag=&q=&available=&page=&limit=`) |
| `GET` | `/api/admin/menu/:id` | Get one |
| `POST` | `/api/admin/menu` | Create |
| `PUT` | `/api/admin/menu/:id` | Update |
| `DELETE` | `/api/admin/menu/:id` | Delete |
| `PATCH` | `/api/admin/menu/:id/availability` | Toggle isAvailable |
| `GET` | `/api/admin/menu/import/template` | Download XLSX template |
| `POST` | `/api/admin/menu/import` | Bulk import (.csv or .xlsx) |

**Branches**
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/branches` | List all |
| `GET` | `/api/admin/branches/:id` | Get one |
| `POST` | `/api/admin/branches` | Create |
| `PUT` | `/api/admin/branches/:id` | Update |
| `DELETE` | `/api/admin/branches/:id` | Delete |

**Settings**
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/settings` | Get site settings |
| `PUT` | `/api/admin/settings` | Update site settings |

**Submissions**
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/submissions` | List (filter: `?type=&status=&page=&limit=`) |
| `PATCH` | `/api/admin/submissions/:id/status` | Update status (`new`/`read`/`done`) |
| `DELETE` | `/api/admin/submissions/:id` | Delete |

---

## Curl Examples

> Replace `http://localhost:5000` with your server URL. Store the cookie in `cookies.txt`.

### 1. Health check

```bash
curl http://localhost:5000/api/health
```

### 2. Login

```bash
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@meatcorner.qa","password":"ChangeMe123!"}'
```

### 3. Create a category

```bash
curl -b cookies.txt -X POST http://localhost:5000/api/admin/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Burgers","description":"Smash and stacked burgers","order":0}'
```

### 4. Upload an image

```bash
curl -b cookies.txt -X POST http://localhost:5000/api/admin/upload \
  -F "image=@/path/to/burger.jpg"
# Returns: { "success": true, "data": { "url": "/uploads/img_xxx.webp", "thumbUrl": "/uploads/img_xxx_thumb.webp" } }
```

### 5. Create a menu item

```bash
# Replace CATEGORY_ID with the _id returned by step 3
curl -b cookies.txt -X POST http://localhost:5000/api/admin/menu \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Classic Smash Burger",
    "category": "CATEGORY_ID",
    "description": "Two smashed patties, cheddar, pickles, special sauce",
    "price": 48,
    "tags": ["featured"],
    "nutrition": { "calories": 820, "fat": 42, "protein": 38, "carbs": 54 },
    "allergens": ["gluten", "dairy"]
  }'
```

### 6. Public menu fetch (with category filter)

```bash
curl "http://localhost:5000/api/public/menu?category=burgers&page=1&limit=10"
```

### 7. Bulk import

```bash
# First download the template:
curl -b cookies.txt http://localhost:5000/api/admin/menu/import/template -o template.xlsx

# Fill it, then upload:
curl -b cookies.txt -X POST http://localhost:5000/api/admin/menu/import \
  -F "file=@template.xlsx"
# Returns: { success: true, data: { created: N, updated: N, skipped: N, errors: [], newCategories: [] } }
```

---

## Storage Service

`server/src/services/storage.js` implements a clean interface:

```js
saveImage(buffer, baseName)   // → { url, thumbUrl }
deleteImage(url)              // → void
```

Currently: **local disk** (uploads/ directory, served as static with 1-year immutable cache).
To swap to Cloudinary/S3: implement the same 2-function interface in a new file and update the import in `storage.js`.

---

## Security Notes

- JWT stored in `httpOnly, sameSite=strict` cookie (not accessible to JS)
- Passwords hashed with bcryptjs (12 rounds)
- All write endpoints validated with Zod
- Contact/catering forms have honeypot field + strict rate limit (20/15min)
- CORS restricted to `CLIENT_URL` and `ADMIN_URL` only
- Uploads: MIME type + file size validated before processing
- Helmet + compression on all routes
- Global rate limit: 300 req/15min; auth: 20 req/15min

---

## Phases

| Phase | Status | Description |
|---|---|---|
| **1** | ✅ Done | Project scaffold + complete backend API |
| **2** | — | Public client UI (Next.js or Vite) |
| **3** | — | Admin panel UI |
| **4** | — | SEO, performance, deployment |
| **5** | — | Analytics, additional features |
