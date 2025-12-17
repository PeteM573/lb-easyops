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
- **Realtime Sync**: Sales at the register automatically deduct inventory via webhooks.
- **Catalog Import**: Seamlessly map Square catalog items to internal inventory records.

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

- **Framework**: [Next.js 14](https://nextjs.org/) (React, TypeScript)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Integration**: Square API (Connect V2 & Webhooks)
- **Tools**: `html5-qrcode` (Scanning), `jspdf` (Reporting)

> See [tech_stack.md](./tech_stack.md) for a complete dependency list.

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- A Square Developer account (for POS sync)

### Environment Setup
Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Square Production
SQUARE_ACCESS_TOKEN=your_production_access_token
SQUARE_WEBHOOK_SECRET=your_production_webhook_signature_key

# Square Sandbox (Optional for dev)
SQUARE_ENVIRONMENT=sandbox
SQUARE_SANDBOX_ACCESS_TOKEN=your_sandbox_token
SQUARE_SANDBOX_WEBHOOK_SECRET=your_sandbox_webhook_key
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📱 Usage

### For Managers
1.  **Dashboard**: Check "Quick Actions" for daily tasks.
2.  **Edit Items**: Go to Inventory to set `Cost per Unit` and `Auto-Deduct` flags.
3.  **Reports**: View the "Best Price Analysis" to compare vendors.

### For Staff
1.  **Tasks**: Check "My Tasks" on the home page.
2.  **Receive**: Use "Receive Stock" when shipments arrive.
3.  **Consume**: Log "Usage" for store supplies or identifying waste.
