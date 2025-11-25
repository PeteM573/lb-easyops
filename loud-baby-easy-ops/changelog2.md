# Changelog - Multi-Location Inventory Sprint

## New Features

### 🌍 Multi-Location Inventory System
We have successfully transitioned from a single-location tracking system to a robust multi-location inventory management system.

*   **Location Management** (`/inventory/locations`)
    *   New page to create, view, and delete storage locations (e.g., "Walk-in Cooler", "Front Shelf").
    *   Support for setting a "Default" location for quicker workflows.

*   **Database Updates**
    *   New `locations` table to store facility areas.
    *   New `item_locations` table to track exact quantities of an item in each location.
    *   *Note: The original `stock_quantity` on the items table is now an aggregate sum kept in sync for performance.*

### 📦 Stock Operations
*   **Receive Stock** (`/inventory/receive`)
    *   Updated workflow to require selecting a **destination location** when adding stock.
    *   Integrated Barcode Scanner for quick item lookup.
    *   Fixed hydration issues with the modal.

*   **Consume Stock** (`/inventory/consume`)
    *   **New Page**: Dedicated interface for logging usage, waste, or spoilage.
    *   **Source Selection**: Users must select which location the stock is being removed from.
    *   **Reason Codes**: Added tracking for "Consumed", "Wasted", "Expired", etc.
    *   Integrated Barcode Scanner.

### 📊 Reporting & Management
*   **Inventory Report** (`/inventory/report`)
    *   **Location Breakdown**: The report now shows not just the total stock, but exactly how much is in each location (e.g., "Total: 15 (10 in Cooler, 5 on Shelf)").
    *   **CSV Export**: Updated to include the detailed location breakdown string.

*   **Item Management**
    *   **New Item**: Added ability to assign the initial stock quantity to a specific location immediately upon creation.
    *   **Edit Item**: Completely overhauled the "Stock" section to list all locations. Users can now manually audit and adjust quantities for each location individually.

## Technical Improvements
*   **Barcode Scanner**: Refactored `BarcodeScanner` component for better lifecycle management and permission handling.
*   **Hydration Fixes**: Resolved class name mismatch errors in the Receive Stock modal.
