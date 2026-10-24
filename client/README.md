# Meat Corner — Public Client Application

Frontend web application for **Meat Corner** restaurant in Doha, Qatar. Built with React 19, Vite, React Router 7, and a vanilla CSS design system closely matching the approved visual reference.

---

## 🥩 Brand & Design Identity

- **Background:** Cream (`#f6f2ec`)
- **Brand Red:** Deep crimson (`#b71930`)
- **Primary / Dark:** Black (`#111111`)
- **Typography:**
  - **Headings:** OCR A Extended / monospace (`--font-heading`)
  - **Body Text:** Inter (`--font-body`)
  - Custom font configuration available in [`src/styles/fonts.css`](./src/styles/fonts.css)
- **Geometry:** Sharp square corners (`border-radius: 0`), 1px solid black borders, high contrast layouts.

---

## 📁 Project Architecture

```
client/
├── index.html                   # HTML entry point, SEO meta & Google Fonts
├── vite.config.js               # Dev server configuration with /api & /uploads proxy
├── src/
│   ├── main.jsx                 # React root mount
│   ├── App.jsx                  # Main router, cart provider, global shell
│   ├── api.js                   # Public API client (settings, categories, menu, branches, contact, catering)
│   ├── index.css                # Design system tokens, utilities & layouts
│   ├── styles/
│   │   └── fonts.css            # Typography variables & brand font @font-face configuration
│   ├── content/
│   │   └── home.js              # Home page marketing copy, ticker items, and section definitions
│   ├── hooks/
│   │   └── useCart.jsx          # Cart context, reducer & localStorage persistence
│   ├── components/
│   │   ├── Header.jsx           # Desktop navigation, logo, AR switch, cart counter
│   │   ├── Footer.jsx           # Global multi-column footer with brand details & socials
│   │   ├── CartDrawer.jsx       # Slide-out cart drawer with stepper controls
│   │   ├── MobileBottomNav.jsx  # Bottom navigation bar for mobile viewports
│   │   └── ItemModal.jsx        # Customization modal (single/multiple choices, extra pricing, required options)
│   └── pages/
│       ├── HomePage.jsx         # Hero (video/poster), ticker strip, categories, featured dishes, story
│       ├── MenuPage.jsx         # Full menu listing with category tabs, quick tags, search & item modal
│       ├── HealthyPage.jsx      # Macro-friendly selections, calorie/protein breakdown & clean cuts
│       ├── KidsPage.jsx         # Family-friendly kids meals and wholesome portions
│       ├── CateringPage.jsx     # Live BBQ & private catering packages with inquiry submission form
│       ├── StoryPage.jsx        # Charcoal grilling craft, sourcing standards, and Qatar story
│       ├── ContactPage.jsx      # Contact inquiry form, branch locations & Google Maps links
│       └── CartPage.jsx         # Dine-in order review & high-contrast "Show to Waiter" ticket
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Backend server running on `http://localhost:5000`

### Installation & Development
```bash
# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:5173 with proxy to backend)
npm run dev

# Run Oxlint checks
npm run lint

# Build for production
npm run build
```

---

## 🔌 API Integration

All requests to `/api` are proxied to `http://localhost:5000/api` in development:
- `GET /api/public/settings` — Site settings (brand name, hero video/poster, phone, email, socials)
- `GET /api/public/categories` — Menu categories
- `GET /api/public/menu` — Filterable menu items (`category`, `tag`, `q`, `page`, `limit`)
- `GET /api/public/menu/:slug` — Single menu item details
- `GET /api/public/branches` — Active restaurant locations
- `POST /api/public/contact` — Contact form submissions (with honeypot anti-spam protection)
- `POST /api/public/catering` — Event catering inquiries (with guest count, date & honeypot)

---

## 🛒 Dine-In "Show to Waiter" Workflow

1. Customers select dishes and customize options (doneness, sauces, sides).
2. Items are saved to the persistent local cart (`mc_cart`).
3. In the restaurant, the customer opens `/cart` or the Cart Drawer, enters optional table number/notes, and taps **"SHOW TO WAITER"**.
4. A high-contrast ticket displays line items, quantities, selected choices, and the total in QAR for effortless ordering.
