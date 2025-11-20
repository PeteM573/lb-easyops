Project: Loud Baby Easy Ops
Type: PWA (Inventory & Operations Management)
Client: Small Boutique/Café ("Loud Baby")
Aesthetic: "Warm, Boutique, Friendly" (Not a cold SaaS)
1. Tech Stack & Critical Constraints
Framework: Next.js 15 (App Router)
Language: TypeScript
Styling: Tailwind CSS v3.4 (Do NOT upgrade to v4 - it breaks config).
Icons: lucide-react
Backend/DB: Supabase (PostgreSQL, Auth Helpers, RLS)
State Management: React Server Components + Client Components for interactivity.
2. Design System & UI Rules
Core Philosophy: Mobile-First. Staff use this on phones/tablets while walking. Targets must be large (h-12 minimum).
Color Palette (Variables in globals.css):
--background: Warm Cream (hsl(40 20% 97%))
--primary: Terracotta/Orange (hsl(24 85% 60%))
--secondary: Sage Green (hsl(150 30% 94%))
--foreground: Soft Charcoal (hsl(20 10% 15%))
Layout Architecture:
Desktop: Persistent Left Sidebar.
Mobile: Fixed Bottom Tab Bar + Top Header.
Component: controlled by src/components/AppShell.tsx.
UX Patterns:
Modals over Pages: For quick actions (Receiving, Scanning), use a Modal/Drawer context to keep users "in the flow."
Cards vs Tables: Use Tables for Desktop views, but switch to Card Views for Mobile.
Explicit Units: Always display Unit of Measure (UOM) clearly (e.g., "10 oz" vs "10 lbs") to avoid the "Honey Butter Problem."
3. Database Schema (Supabase)
profiles: id (UUID), role ('Manager' | 'Employee').
items:
id (int8), name (text), category (text)
stock_quantity (numeric), unit_of_measure (text)
cost_per_unit (numeric), alert_threshold (numeric)
storage_location (text), barcode (text, unique)
tasks: title, is_complete, assigned_to (FK).
4. Current Implementation Status
✅ Dashboard (src/app/page.tsx): Responsive grid, "Quick Actions" buffet, Low Stock alerts.
✅ Navigation: Responsive AppShell implemented.
✅ Receive Stock (src/app/inventory/receive/page.tsx): Client-side search, Modal interaction, explicitly displays UOM.
✅ Inventory Report (src/app/inventory/report/page.tsx): Searchable, Filterable, CSV Export, Hybrid Card/Table view.
🚧 Add Item (src/app/inventory/new/page.tsx): Needs Styling/Refactor. Currently a raw form.
🚧 Scanning (src/app/inventory/scan/page.tsx): Needs Logic. Currently basic html5-qrcode implementation.
🚧 Tasks: Needs UI Polish.
5. Immediate Next Steps (For the Agent)
Refactor src/app/inventory/new/page.tsx:
Apply the "Boutique" design system.
Ensure it handles the "Consumable" vs "Retail" category logic.
Make it mobile-friendly (large inputs).
Refactor src/app/inventory/scan/page.tsx:
Improve the camera UI (it's currently ugly).
Make it redirect to the Item Detail view on successful scan.
Task Management:
Style the task list to match the Dashboard "Card" aesthetic.
6. Technical "Gotchas"
Tailwind Config: We are using tailwind.config.ts with a standard postcss.config.mjs. Do not change this structure.
Supabase Auth: Use createClientComponentClient for client-side logic and createMiddlewareClient for the middleware.
Square Webhook: There is a bypass in middleware.ts for /api/square-webhook that validates x-square-signature. Do not touch this unless necessary.