# Client Documentation Draft: Loud Baby Easy Ops

This document follows the structure of your `doc outline.md`. You can use this text as the foundation for your final client-facing PDF or website.

---

## 2. Product Overview

**What is this tool?**
"Loud Baby Easy Ops" is your central command center for managing store inventory, tracking costs, and ensuring compliance. Instead of juggling spreadsheets or guessing what’s in stock, this application gives you a live view of your business.

**Why should you use it?**
*   **Save Money:** Track exactly how much your inventory costs (COGS) and specific savings by comparing vendors.
*   **Save Time:** Receive shipments and log usage in seconds using a barcode scanner, rather than manual counting.
*   **Stay Compliant:** Get automatic reminders for license renewals and low-stock alerts so you are never caught off guard.

---

## 3. Getting Started

**How to Access**
1.  Navigate to `[Your App URL]` in any web browser (Chrome or Safari recommended).
2.  **Login:** Enter your email and password.
3.  **The Dashboard:** Once logged in, you will see the "Good Morning" dashboard. This is your home base.
    *   **Top Row:** Financial health (Inventory Value, Profit, Sales Today).
    *   **Quick Actions:** Big buttons for your most common daily tasks (Receive, Log Usage).
    *   **Tasks:** A checklist of to-dos assigned to you.

---

## 4. Core Features Walkthrough

### A. The Dashboard
*   **What it does:** Shows a snapshot of business health and outstanding tasks.
*   **How to use:**
    *   Check **"My Tasks"** to see what needs doing. Click the circle to mark a task as done.
    *   Click **"Quick Actions"** to jump to other parts of the app.
    *   (Managers Only) Click "Show/Hide Details" to reveal sensitive financial numbers like Gross Profit.

### B. Inventory Management (The "Item List")
*   **What it does:** A searchable list of everything you sell or use.
*   **How to use:**
    *   Click "Scan Item" or type in the search bar to find a product.
    *   **Edit Item:** Click the pencil icon to update details.
        *   **Stock Count:** Manually adjust if the count is wrong.
    *   "Cost per Unit": Enter how much you pay for the item to get accurate profit reports.

### C. Receiving Stock
*   **What it does:** Adds new items to your inventory when a delivery truck arrives.
*   **How to use:**
    1.  Click **"Receive Stock"**.
    2.  Scan the item's barcode or search for it by name.
    3.  Enter the quantity received (e.g., "5 cases" or "12 units").
    4.  Click **"Receive"**. The stock count updates instantly.

### D. Logging Usage (Consumption & Manual Sales)
*   **What it does:** Removes items from inventory for store use, waste, or to record sales.
*   **How to use:**
    1.  Click **"Log Usage"** (or **"Manual Sale Deduction"** on the dashboard).
    2.  Find the item.
    3.  Select the reason:
        *   **"Consumption"**: For store supplies (napkins, ingredients).
        *   **"Waste"**: For broken or expired items.
        *   **"Manual Sale"**: To record items sold to customers.
    4.  Enter the amount and click **"Log"**.
    *   *Note:* Since the Square integration is currently disabled, all sales must be logged here to keep inventory accurate.

### E. Financial Reports (Manager Only)
*   **What it does:** Shows which items are making money and which vendors offer the best prices.
*   **How to use:**
    *   Navigate to the **Reports** page.
    *   Look at the **"Best Price & Savings"** column to see if you are buying from the cheapest vendor.
    *   Use this data to negotiate better deals or switch suppliers.

---

## 5. Common Workflows

### Scenario 1: The Morning Check
1.  Log in to the Dashboard.
2.  Look for any **Red Alerts** (Low Stock).
3.  Check the **Task List** for notes left by the closing shift.
4.  If items are low, open the **Report** page to create a shopping list.

### Scenario 2: Receiving a Vendor Delivery
1.  The delivery truck arrives with 10 boxes.
2.  Open **Receive Stock** on a tablet or laptop.
3.  Scan a box. Enter the count. Confirm.
4.  Repeat for all items.
5.  *Result:* Your inventory is accurate immediately, without counting by hand later.

### Scenario 3: Monthly Audit
1.  Go to the **Reports** page.
2.  Filter by "High Value" or "Low Stock".
3.  Walk the shelves and verify the physical counts match the screen.
4.  If safe counts are off, use the **Edit** button to correct them and add a note explaining the change.

---

## 7. Upkeep & Maintenance

*   **Square Connection:** The app talks to Square to track sales. If you change your Square password, you may need to reconnect the integration.
*   **Compliance Dates:** Regularly check the "Compliance Reminders" (Manager Only) to ensure no licenses are expiring soon.
*   **Backups:** The system backs up data automatically, but you should download a CSV export of your inventory once a month for your own records.

---

## 8. Troubleshooting & FAQs

**"I scanned an item but nothing happened."**
*   *Cause:* The browser might not have permission to use the camera.
*   *Fix:* Check the address bar for a "Camera Blocked" icon (usually a small camera with a red X). Click it and select "Allow".

**"My sales aren't deducting from inventory."**
*   *Cause:* The automated Square integration is currently disabled (Manual Mode).
*   *Fix:* Please use the **"Manual Sale Deduction"** button on the dashboard to log sold items at the end of a shift or transaction.

**"I can't see the Profit/Loss numbers."**
*   *Cause:* You are logged in with a "Staff" account.
*   *Fix:* Ask a Manager to upgrade your permissions if you require access to financial data.

---

## 9. Security & Access Management

*   **Passwords:** Never share your password. Each staff member should have their own login.
*   **Removing Access:** When an employee leaves, immediately disable their account in the system to prevent unauthorized access.
*   **Manager vs. Staff:** Only give "Manager" access to trusted leadership. Managers can see costs, profits, and make system-wide changes.
