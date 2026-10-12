# SUVAI — Smart Canteen Billing & Management System

> **சுவை (Suvai)**: Modern, lightning-fast Point of Sale (POS) and canteen business management platform built for college campus food courts and busy counters.

---

## 🌟 Highlights

- **⚡ Lightning-Fast POS**: Touch-optimized menu pills, instant dish search, 1-click cart operations, and keyboard hotkeys (`F1` POS, `F2` Orders, `F3` Dashboard).
- **🖨️ Real-Time Thermal Receipt Printing**: Compatible with 58mm (32 cols) and 80mm (48 cols) ESC/POS printers. Supports Local Print Bridge (`localhost:9123`), Web Serial USB, and formatted thermal preview slips.
- **📱 Dynamic Counter UPI QR**: Generates dynamic BHIM/UPI QR codes on the customer-facing terminal with real-time bill amount and canteen VPA ID (`upi://pay?pa=...`).
- **📴 Offline Billing & PWA**: Fully functional offline POS using IndexedDB. Automatically queues offline orders with unique `offline_id` tokens and synchronizes upon network restoration without duplicate billing.
- **📊 Real Financial Reports & Net Profit**: Real database queries using strict `DECIMAL(10, 2)` calculations:
  $$\text{Estimated Net Profit} = \text{Sales} - \text{Ingredient Cost (COGS)} - \text{Operating Expenses}$$
- **💰 Shift & Cash Drawer Reconciliation**: Shift-end tally calculating Starting Float + Cash Sales - Petty Expenses - Refunds = Expected Cash in Drawer, with automated discrepancy (Over/Short) tracking.
- **🔒 Enterprise Security**: Role-based access (Admin & Cashier), bcrypt password hashing, JWT authentication, rate limiting, and audit logging.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express REST API, TypeScript (`tsx`), CORS |
| **Database** | MySQL 8.0 (with connection pooling & migrations) + Resilient In-Memory Fallback |
| **Printing** | ESC/POS binary generator (`Uint8Array`), Local Print Bridge, Web Serial API |
| **Offline** | Service Worker PWA cache, IndexedDB storage engine |
| **Testing** | Vitest (Automated financial precision & formula test suites) |
| **Deployment** | Vercel (Frontend SPA) + Render / Railway / VPS (Node.js API & MySQL) |

---

## 📁 Repository Structure

```text
buddy-foods/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment variables & MySQL connection pool
│   │   ├── controllers/     # Auth, Products, Orders, Expenses, Reports, Settings, Backup
│   │   ├── database/        # schema.sql, init.ts, seed.ts (25+ authentic canteen items)
│   │   ├── middleware/      # JWT auth, role validation, rate limiting
│   │   ├── routes/          # Express REST endpoints
│   │   ├── utils/           # Decimal calculations, audit logger
│   │   └── server.ts        # Express app entry point
│   ├── tests/               # Vitest billing & formula test suite
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/              # manifest.webmanifest, sw.js, favicon.svg
│   ├── src/
│   │   ├── components/      # Navbar, Sidebar, ReceiptModal, UpiQrModal
│   │   ├── context/         # AuthContext, SyncContext, SettingsContext
│   │   ├── pages/           # 11 Canteen Pages (Dashboard, POS, Menu, History, etc.)
│   │   ├── services/        # api.ts, db.ts (IndexedDB), printer.ts
│   │   ├── utils/           # escpos.ts (ESC/POS binary builder)
│   │   ├── types/           # Complete TypeScript entity definitions
│   │   ├── App.tsx
│   │   └── index.css        # Thermal print CSS media queries & Tailwind
│   ├── tailwind.config.js   # Warm cream, deep green, and orange theme
│   ├── vite.config.ts
│   └── package.json
├── print-bridge/
│   ├── bridge.js            # Standalone ESC/POS print server on port 9123
│   ├── package.json
│   └── README.md
├── vercel.json              # Vercel deployment configuration
├── package.json             # Root orchestration scripts
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js `v18+` (or `v20+` / `v25+`)
- MySQL Server (optional for development — server automatically falls back to an in-memory database if MySQL credentials are empty)

### 2. Install All Dependencies
From the repository root:
```bash
npm run install:all
```

### 3. Configure Backend Environment
Navigate to `backend/` and copy the example config:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your MySQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=suvai_db
JWT_SECRET=suvai_super_secure_jwt_secret_token_key_change_in_production
```

### 4. Run the Full Stack
From the project root:
```bash
npm run dev
```
This starts both:
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

### 5. Start the Thermal Print Bridge (Optional, for physical printers)
```bash
npm run dev:bridge
```
Listening on `http://localhost:9123`.

---

## 🔑 Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

*(You can also use the 1-click **"Fill Admin"** shortcut on the login page for instantaneous access.)*

---

## 🧪 Running Automated Tests

Run the test suite verifying exact decimal precision, inclusive/exclusive GST calculations, and the Net Profit formula:

```bash
npm run test
```

---

## 🖨️ Thermal Receipt Printing Setup

1. **58mm vs 80mm Support**:
   - In **Printer Settings**, switch between **80mm (48 characters)** or **58mm (32 characters)**.
   - Headers, tabular column justifications, dashed dividers, and auto-cut commands format automatically.
2. **Local Print Bridge (`localhost:9123`)**:
   - For physical Network LAN or USB thermal printers at the counter.
   - Transmits raw binary ESC/POS buffers over TCP (Port 9100) or to local OS printer queues.
3. **Web Serial USB**:
   - Connect directly to USB thermal printers through Chrome or Edge without installing drivers.
4. **Browser Thermal Slip (Fallback)**:
   - Includes custom `@media print` thermal slip stylesheets matching standard receipt paper roll dimensions.

---

## ☁️ Vercel & Production Deployment

### Frontend (Vercel)
1. Import this repository into Vercel.
2. Framework Preset: **Vite**.
3. Build Command: `npm --prefix frontend run build` (handled automatically by `vercel.json`).
4. Output Directory: `frontend/dist`.
5. Set Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://api-suvai.onrender.com/api`).

### Backend (Render / Railway / VPS)
1. Deploy the `backend/` folder on Render, Railway, or any Node.js VPS.
2. Provide a persistent MySQL database (e.g., TiDB Serverless, Aiven, or Railway MySQL).
3. Set `NODE_ENV=production`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET`.
4. On first startup, migrations and default canteen menu items are automatically seeded into MySQL.

---

## 📄 License
ISC © 2026 Suvai Development Team. Built for fast, modern campus dining.
