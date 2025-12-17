# Technology Stack

## 1. Core Frameworks & Languages
*   **Language**: [TypeScript](https://www.typescriptlang.org/) (v5) - The primary language for the entire application, ensuring type safety and code quality.
*   **Framework**: [Next.js](https://nextjs.org/) (v14) - The React framework used for both the frontend (UI) and backend API routes.
*   **UI Library**: [React](https://react.dev/) (v18) - Used for building the user interface components.

## 2. Database & Backend Services
*   **Platform**: [Supabase](https://supabase.com/) - An open-source Firebase alternative providing:
    *   **PostgreSQL**: The relational database used for storing items, inventory logs, and users.
    *   **Authentication**: Managed user handling (`@supabase/auth-helpers-nextjs`).
    *   **Realtime**: (Available via Supabase but primarily used for DB interaction here).

## 3. Styling & UI Components
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v3) - Utility-first CSS framework for rapid UI development.
*   **Icons**: [Lucide React](https://lucide.dev/) - A consistent and clean icon set.
*   **CSS Tools**: `postcss`, `autoprefixer` - For processing CSS.

## 4. Integrations & APIs
*   **Payments & POS**: [Square SDK](https://developer.squareup.com/docs/sdks/nodejs) (`square` v43) - Used to sync sales from Square POS to update inventory and fetch Catalog details.
*   **Email**: [Nodemailer](https://nodemailer.com/) - Used for sending notifications (e.g., low stock alerts).

## 5. Specialized Libraries & Tools
*   **QR/Barcode Scanning**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) - Allows using the device camera to scan barcodes in the browser.
*   **Barcode Generation**: [JsBarcode](https://lindell.me/JsBarcode/) - Generates barcode images for printing or display.
*   **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) - Used for generating reports and printable items.
*   **Utilities**:
    *   `pluralize`: For correcting word forms in the UI.
    *   `ngrok`: For exposing the user's local server to Square webhooks during development.

## 6. AI & Development Assistance
*   **AI Agent**: **Antigravity** (Google DeepMind) - Advanced Agentic Coding assistant used to architect, implement, debug, and refine the application features.
