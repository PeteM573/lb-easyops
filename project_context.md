# Project: Loud Baby Easy Ops
**Type:** PWA (Inventory & Operations Management)
**Client:** Small Boutique/Café ("Loud Baby")
**Aesthetic:** "Warm, Boutique, Friendly" (Not a cold SaaS)
**Current Phase:** Phase 3 - "Magic & History" (Scanning, Logs, Consumption)

## 1. Tech Stack & Critical Constraints
*   **Framework:** Next.js 15 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS **v3.4** (LOCKED. Do **NOT** upgrade to v4).
*   **Icons:** `lucide-react`
*   **Backend/DB:** Supabase (PostgreSQL, RLS)
*   **Auth:** `@supabase/ssr` (Replaced deprecated auth-helpers).
*   **State:** React Client Components for interactive flows.

## 2. Design System & UI Rules
**Core Philosophy:** Mobile-First. Staff use this on phones/tablets while walking.
*   **Touch Targets:** `h-12` minimum.
*   **Typography:** Clean sans-serif, automatic **Title Case** enforcement on item names.

**Color Palette (CSS Variables):**
*   `--background`: Warm Cream (`hsl(40 20% 97%)`)
*   `--primary`: Terracotta/Orange (`hsl(24 85% 60%)`)
*   `--secondary`: Sage Green (`hsl(150 30% 94%)`)
*   `--foreground`: Soft Charcoal (`hsl(20 10% 15%)`)

**UX Patterns:**
*   **Navigation:** Sidebar (Desktop) / Bottom Tabs (Mobile).
*   **Modals:** Use for "Quick Actions" (Receive, Scan) to preserve context.
*   **Data View:** Cards for Mobile, Tables for Desktop.
*   **Pagination:** Implemented on Reports (10/20/50 items).
*   **Feedback:** Green toast/text for success, Amber for alerts.

## 3. Domain Logic (Business Rules)
**Categories (Expanded):**
1.  **Retail:** Finished goods (Clothes, Accessories).
2.  **Accessories:** Add-ons.
3.  **Raw Materials:** Ingredients (Flour, Milk, Coffee Beans).
4.  **Consumables:** Paper goods, Cups, Napkins.

**Data Consistency:**
*   **Title Case:** All item names auto-format (e.g., "honey" -> "Honey").
*   **Unit of Measure (UOM):** Must be explicit in UI (e.g., "Quantity: 5 (lbs)").

## 4. Database Schema (Supabase)
*   `profiles`: `id` (UUID), `role` ('Manager' | 'Employee').
*   `items`:
    *   `id` (int8), `name`, `category`
    *   `stock_quantity` (numeric), `unit_of_measure` (text)
    *   `cost_per_unit` (numeric), `alert_threshold` (numeric)
    *   `storage_location`, `barcode` (unique)
*   `tasks`: `title`, `description`, `is_complete`, `assigned_to`, `created_by`.
*   `inventory_logs` (Planned):
    *   `item_id`, `user_id`, `change_amount`, `reason_code`, `created_at`.

## 5. Current Implementation Status
*   **✅ Dashboard:** Real-time "Low Stock" & "My Tasks" data. Quick Actions.
*   **✅ Inventory Report:** Pagination, Search, Filter, CSV Export, Edit Buttons.
*   **✅ Inventory CRUD:** "New Item" and "Edit Item" pages complete (with Title Case).
*   **✅ Receive Stock:** Modal-based flow, clear UOM display.
*   **✅ Tasks:** Redesigned UI, split Active/Completed lists.
*   **✅ Auth:** Migrated to `@supabase/ssr` (fixed 401 errors).
*   **🚧 Scanning:** `src/app/inventory/scan/page.tsx` exists but needs `html5-qrcode` logic.
*   **🚧 Consumption/Waste:** Needs a specific flow for "Staff Meal" or "Spill" logging.

## 6. Immediate Next Steps (The Agent's Mission)
1.  **Implement Barcode Scanner (`src/app/inventory/scan/page.tsx`):**
    *   Integrate `html5-qrcode`.
    *   Redirect successful scans to the Receive Modal or Item Detail.
    *   Ensure permissions UI (Camera allow/deny) looks "Boutique", not broken.
2.  **Create "Consumption/Waste" Flow:**
    *   Create SQL table `inventory_logs` (if not exists).
    *   Create UI for deducting stock with a "Reason" (Sale, Waste, Staff Meal).
3.  **Refine Dashboard Data:**
    *   Ensure the "Low Stock" count is accurate based on `stock_quantity <= alert_threshold`.

## 7. Technical "Gotchas"
*   **Tailwind:** Use `tailwind.config.ts` + `postcss.config.mjs`.
*   **Supabase:** Use `createBrowserClient` for client components.
*   **Square Webhook:** `middleware.ts` has a bypass for `/api/square-webhook`. **Do not touch.**
*   **Mobile View:** Always test layout in Mobile width (375px) first.