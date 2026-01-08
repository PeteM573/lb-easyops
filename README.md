# Loud Baby Easy Ops 🍼

A comprehensive inventory management and operations dashboard built for **Loud Baby**, designed to streamline stock tracking, sales reporting, and compliance.

## 🚀 Features

### 📊 **Dashboard**
- **At-a-Glance Metrics**: Real-time view of inventory value, COGS, gross profit, and daily sales.
- **Task Management**: integrated task list for staff-to-manager communication.
- **Low Stock Alerts**: Automatic warnings when items dip below safety thresholds.

### 📦 **Inventory Management**
- **Live Search & Scan**: lookup items by name, SKU, or scan barcodes using the device camera.
- **Stock Operations**: Easy flows for **Receiving Stock**, **Logging Consumption**, and **Recording Sales**.
- **Unit Conversions**: Intelligent handling of units (e.g., selling in 'servings' vs buying in 'cases').

### 🛒 **Square POS Integration**
- **Catalog Import**: Seamlessly map Square catalog items to internal inventory records via barcode/SKU matching.
- **Manual Sales**: Record sales manually on the dashboard to keep inventory in sync with POS data.
- *(Future)* **Realtime Sync**: Webhook infrastructure is in place for future automated deductions.

### 💰 **Reporting & Analytics**
- **COGS Analysis**: Detailed cost tracking to understand profit margins per item.
- **Vendor Comparison**: Track multiple vendors per item to find the best price and calculate potential savings.
- **Detailed Logs**: Full audit trail of all inventory movements (who, what, when, why).

### 🛡️ **Role-Based Access**
- **Manager Mode**: Access to sensitive cost data, manual adjustments, and configuration settings.
- **Staff Mode**: Focused interface for daily operations (receiving/consuming) without exposing financial data.

---

## 🛠️ Technology Stack

Powered by modern web technologies for performance and reliability.

- **Framework**: [Next.js 14](https://nextjs.org/) (React, TypeScript) - App Router architecture.
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth) - Realtime database & row-level security.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/).
- **Integration**: Square API (Connect V2 & Webhooks).

> See [tech_stack.md](./tech_stack.md) for a detailed dependency list.

---

## 📂 Project Structure

Key directories and files in the project:

```
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/             # Backend API (e.g., Square Webhook)
│   │   ├── inventory/       # Inventory management pages (edit, receive, etc.)
│   │   └── page.tsx         # Main Dashboard
│   ├── lib/                 # Shared utilities (Supabase client, analyics, formatting)
│   ├── middleware.ts        # Next.js Middleware (Auth protection)
│   └── migrations/          # SQL scripts for database schema changes
├── public/                  # Static assets (images, icons)
├── .env.local               # Environment variables (API keys)
└── tech_stack.md            # Detailed tech documentation
```

---

## ⚙️ Getting Started (Local Development)

### 1. Prerequisites
- Node.js 18+ installed.
- A Supabase project set up.
- A Square Developer account (optional for catalog sync).

### 2. Environment Setup
Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Square (Optional for manual mode)
SQUARE_ACCESS_TOKEN=your_token
SQUARE_WEBHOOK_SECRET=your_secret
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🚀 Build & Deploy

### Production Build
To create an optimized production build locally:

```bash
npm run build
npm start
```

### Deployment
This application is designed to be deployed on platforms like **Vercel** or **Render**.

1.  **Connect Repo**: Push your code to GitHub/GitLab.
2.  **Import Project**: In Vercel/Render, import the repository.
3.  **Environment Variables**: **CRITICAL!** You must copy all values from `.env.local` into the deployment platform's Environment Variables settings.
4.  **Deploy**: The platform will automatically run `npm install` and `npm run build`.

---

## 📱 Usage Guide

### For Managers
1.  **Dashboard**: Check "Quick Actions" for daily tasks.
2.  **Inventory**: Use "Edit" to set `Cost per Unit` for accurate profit reports.
3.  **Reports**: Check "Best Price Analysis" to compare vendors.

### For Staff
1.  **Tasks**: Check "My Tasks" on the home page.
2.  **Receive**: Use "Receive Stock" when shipments arrive.
3.  **Log Usage**: Use "Log Usage" -> "Manual Sale" or "Consumption" to track items leaving the shelf.
