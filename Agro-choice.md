You are a senior full-stack software engineer specializing in the PERN stack (PostgreSQL, Express, Node.js, React). 

Your task is to build a complete, production-ready, full-stack multi-branch Agri-Enterprise Inventory and Sales Management System. 

### 1. Business Context & Product Verticals
The business produces and sells distinct agricultural commodities across different branches/locations:
- Carbonized wood scrap briquettes (sold per 50kg bag or retail kg)
- Dragonfruit (sold per kg)
- Pixie oranges (sold per kg / crate)
- Sweet potatoes (sold per gunia/sack or kg)

Each branch maintains its own stock counts, while products share centralized catalog metadata.

### 2. Tech Stack & Architecture Requirements
- **Backend:** Node.js, Express.js (REST API architecture with clean separation: routes, controllers, models/db pools).
- **Database:** PostgreSQL using the `pg` pool library. Write raw, optimized SQL queries and migrations (no heavy ORM unless required; raw parameterized SQL preferred).
- **Frontend:** React (Vite template), Tailwind CSS for clean and modern styling, Lucide React icons, and React Router.
- **State Management:** React Context API or Zustand for cart and branch state.

---

### 3. Database Schema Specifications
Provide a database setup script (`schema.sql` and `seed.sql`) containing:
1. `branches`: `id` (UUID or SERIAL PK), `name`, `location`, `created_at`.
2. `products`: `id` (PK), `name`, `category` (ENUM or VARCHAR: 'briquettes', 'dragonfruit', 'pixie_oranges', 'sweet_potatoes'), `unit` (e.g., 'kg', '50kg bag', 'crate'), `base_price` (NUMERIC), `image_url`, `is_active` (BOOLEAN).
3. `branch_inventory`: `id` (PK), `branch_id` (FK -> branches.id), `product_id` (FK -> products.id), `stock_quantity` (NUMERIC), `alert_threshold` (NUMERIC), `updated_at`. Unique constraint on `(branch_id, product_id)`.
4. `orders`: `id` (PK), `receipt_no` (UNIQUE, e.g., 'RCP-YYYYMMDD-XXXX'), `branch_id` (FK), `customer_phone` (VARCHAR), `customer_name` (VARCHAR, optional), `total_amount` (NUMERIC), `payment_status` ('PENDING', 'COMPLETED', 'FAILED'), `created_at`.
5. `order_items`: `id` (PK), `order_id` (FK -> orders.id), `product_id` (FK -> products.id), `quantity` (NUMERIC), `unit_price` (NUMERIC), `subtotal` (NUMERIC).
6. `payments`: `id` (PK), `order_id` (FK -> orders.id), `payment_method` ('CASH', 'MPESA'), `transaction_ref` (VARCHAR), `amount` (NUMERIC), `status` ('PENDING', 'SUCCESS', 'FAILED'), `created_at`.

---

### 4. Backend Implementation Requirements
1. **Inventory Concurrency & Transactions:**
   - The checkout endpoint `POST /api/orders` MUST wrap order creation, line-item insertion, and inventory deduction inside a PostgreSQL transaction (`BEGIN`, `COMMIT`, `ROLLBACK`).
   - Use atomic conditional updates (`WHERE stock_quantity >= $requested_qty`) or row-locking (`SELECT FOR UPDATE`) to guarantee stock cannot drop below zero during concurrent purchases.
2. **REST Endpoints:**
   - `GET /api/branches` - List all operating branches.
   - `GET /api/products` - List products with optional `?category=` and `?branch_id=` query parameters.
   - `GET /api/inventory/:branchId` - Current stock levels with low-stock alerts.
   - `POST /api/inventory/restock` - Admin endpoint to adjust or add new harvest/production batches.
   - `POST /api/orders` - Submit a new purchase, decrement branch inventory, generate a receipt number.
   - `POST /api/payments/stk-push` - Initiate simulated or sandbox STK push mobile money prompt.
   - `POST /api/payments/callback` - Webhook callback handler to update order and payment statuses to 'COMPLETED'.
   - `GET /api/orders/:receiptNo` - Fetch order details by receipt number for receipt display and validation.

---

### 5. Frontend UI/UX Structure
1. **Branch Selector Bar:** Prominently situated in the navigation header, allowing the user to select the active branch (e.g., Nyahururu Plant, Machakos Farm). Catalog displays live quantities for that branch.
2. **Product Catalog Page (`/`):**
   - Category filter pills: All, Briquettes, Dragonfruit, Pixie Oranges, Sweet Potatoes.
   - Dynamic cards showing product image, unit pricing, real-time in-stock badge, and an interactive "Add to Cart" button (disabled if out of stock).
3. **Cart & Checkout Drawer/Modal:**
   - Quantity selector with validation against available stock.
   - Customer details input (Phone number, Name).
   - Order summary and checkout trigger.
4. **Receipt Modal & Printable View (`/receipt/:receiptNo`):**
   - Clean, thermal-style or invoice-style printable receipt showing Receipt No, branch details, purchased items, timestamp, and totals.
   - Includes `@media print` CSS so clicking "Print / Save PDF" produces a clean physical/PDF receipt.
5. **Admin Portal (`/admin`):**
   - Overview metrics: Daily sales total, total orders.
   - Inventory table per branch with visual badges (Green for healthy stock, Red for low stock below threshold).
   - Quick restock form: Select branch, product, and input batch units added.

---

### 6. Deliverable Guidelines
- Deliver fully implemented, modular files without shorthand placeholders, `// TODO: implement later`, or dummy stubs.
- Include a root `README.md` with:
  1. Instructions to run PostgreSQL migrations and seed data.
  2. Steps to start the Express backend server.
  3. Steps to start the React frontend.