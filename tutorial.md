# AgriChoice tutorial: how this first version works

Welcome! This guide is written for someone learning React, Node, Express, and SQLite. You do not need to understand the whole application at once. Start the API and website, then follow one product from the database to the screen.

## 1. What we are building first

The first milestone is a **branch-aware product catalog**:

1. SQLite stores branches, products, prices, and the stock at each branch in a local file.
2. Express provides API routes that read this information.
3. React asks the API for branches and products.
4. The page lets a visitor choose a branch, search for a product, and filter by category.

This is the smallest useful slice of the larger business idea. It lets us prove the stack works before adding checkout and accounts.

### What is not built yet

There is deliberately no checkout, stock-restock screen, login, payroll page, or real payment flow in this milestone. The database has some tables ready for those later features, but the website does not use them yet. A payment API must not be simulated as if money were really collected.

Authentication and permissions should be in place before adding admin-only actions such as changing stock. We will connect Supabase authentication before exposing those actions.

## 2. Run the application

Follow the setup steps in [README.md](./README.md). You will use three things:

- SQLite stores the data in `backend/data/agri_choice.sqlite`. The API creates this file and sets it up automatically.
- The API runs in one terminal, normally on `http://localhost:3000`.
- Vite serves the React website in another terminal, normally on `http://localhost:5173`.

Keep both terminal windows open while using the website. You do not need to install or log in to PostgreSQL or MySQL.

## 3. The journey of one product

### Step A: SQLite stores a product

Open [schema.sql](./schema.sql). It creates tables such as:

- `branches`: the places customers can buy from.
- `products`: product names, categories, units, and prices. Product details are shared across branches.
- `inventory`: how much of each product a particular branch has.

The `inventory` table is a **junction table**. It connects a branch to a product and stores facts about that combination. For example, Nyahururu can have 48 briquette bags while Machakos has 12. This is why stock does not live directly on the product row.

`branch_id` and `product_id` are **foreign keys**. They make SQLite check that each stock row points to a real branch and a real product. The unique rule on `(branch_id, product_id)` prevents two stock rows for the same product at the same branch.

The schema uses SQLite `INTEGER` IDs, `REAL` prices/quantities, and `TEXT` dates. For a real checkout system, money should be stored in whole cents rather than binary floating-point; we'll make that change when implementing sales.

### Step B: sample rows are added

Open [seed.sql](./seed.sql). It inserts example branches, products, and stock so the screen has something to display. These numbers are made-up practice data; change them to match the real business when you are ready.

The seed script uses `ON CONFLICT` to avoid inserting duplicate branch and product names if you run it more than once. Existing inventory rows are left alone when the seed is re-run, so the script will not silently restore demo stock after you have changed it.

### Step C: Express asks SQLite for data

The backend is inside [backend/](./backend/):

- [server.js](./backend/server.js) initializes the SQLite database and starts the web server.
- [app.js](./backend/app.js) configures Express, JSON, CORS, routes, and errors.
- [db.js](./backend/db.js) opens the local SQLite file, creates it if needed, and loads the schema and sample data.
- [routes/catalogRoutes.js](./backend/routes/catalogRoutes.js) maps URL paths to controller functions.
- [controllers/catalogController.js](./backend/controllers/catalogController.js) contains the SQL queries and sends JSON responses.

For example, the website requests:

```text
GET http://localhost:3000/api/products?branch_id=1
```

The products controller reads `branch_id`, asks SQLite for active products and the matching stock row, then sends the results back as JSON. SQL values use `?` placeholders and are passed separately to the prepared statement. This is called a **parameterized query**; use this pattern instead of joining user-provided text into a SQL statement.

Try these URLs in a browser while the API is running:

- `http://localhost:3000/api/health`
- `http://localhost:3000/api/branches`
- `http://localhost:3000/api/products?branch_id=1`
- `http://localhost:3000/api/inventory/1`

The response is JSON: structured data that React can read.

### Step D: React displays the API response

Open [frontend/src/App.jsx](./frontend/src/App.jsx). This file contains the main page:

- `useState` keeps changing values such as branches, the selected branch, and the current search.
- `useEffect` loads data when the page first opens or when the selected branch changes.
- `fetch` makes an HTTP request to the API.
- `map` turns each product in the response into a `ProductCard`.
- `filter` applies the search text and category selection in the browser.
- `ProductCard` is a small reusable React component that displays one product.

The API URL is set near the top of the file. By default it points to `http://localhost:3000/api`. The API returns the stock for the chosen branch, so the same product card can show different stock at different branches.

The visual styles are in [frontend/src/App.css](./frontend/src/App.css), and the basic browser-wide styles are in [frontend/src/index.css](./frontend/src/index.css). They use regular CSS so you can practice selectors and layout without learning another styling tool at the same time. Tailwind can be added later if it is useful for the UI designs you provide.

## 4. How the main files fit together

```text
Browser
  React page (frontend/src/App.jsx)
       | fetch over HTTP
       v
  Express route (backend/routes/catalogRoutes.js)
       | calls
       v
  Controller (backend/controllers/catalogController.js)
       | parameterized SQL
       v
  SQLite database file (backend/data/agri_choice.sqlite)
       |
       v
  Database tables (schema.sql) + sample rows (seed.sql)
```

Each layer has one main job. React should not connect directly to the database: the API is the middle layer between the website and the local database file.

## 5. A few important database ideas

- **Table:** a collection of records, similar to a spreadsheet.
- **Row:** one record, such as a single branch.
- **Column:** one piece of information, such as `branch_name`.
- **Primary key:** the unique ID for a row.
- **Foreign key:** a value that points to a row in another table.
- **One-to-many:** one branch can have many inventory rows.
- **Many-to-many:** a branch can stock many products, and a product can be stocked at many branches. `inventory` stores that relationship.
- **Constraint:** a database rule that rejects invalid data, such as negative stock.

The schema also keeps tables for staff, payroll, stock intake, customers, orders, order items, and payments. They are the next parts of the design, not active features in this first screen.

## 6. Beginner practice tasks

Try these small changes after the app works:

1. Change a product's price in `seed.sql`, then update that row in SQLite (or rebuild a fresh practice database and re-run the schema and seed).
2. Change a branch's stock quantity in SQLite and reload the page.
3. Change an inventory row to less than its `alert_threshold`; observe the low-stock badge.
4. Add another sample product. Add a category accepted by both the database constraint and the backend's category list.
5. Add a short explanation under the hero heading in `frontend/src/App.jsx`, then adjust its spacing in `frontend/src/App.css`.

When changing seed data in an existing database, editing the SQL file alone does not update rows already in SQLite. Run a targeted `UPDATE` query, or delete the local database file and let the API create a fresh practice database. Deleting the database loses any local changes.

## 7. Recommended next milestones

Build one feature at a time and verify it before moving on:

1. **Stock intake and protected restocking:** record harvested/acquired quantities and update inventory in one database transaction. Add Supabase login and role checks before allowing managers to restock.
2. **Sales and receipts:** validate a customer's cart, create an order and order items, and decrement stock in one SQLite transaction. Use a conditional update so two simultaneous sales cannot sell the same stock.
3. **Payment integration:** start with a provider sandbox. Verify signed callbacks and reconcile callback events; never mark an order paid simply because the browser says it succeeded.
4. **Staff and payroll:** build admin-only staff and pay-period screens with careful access controls.
5. **UI refinement:** replace the starter illustrations and layout with the components and visual direction you will provide.

React Router will be useful when the app has separate pages such as catalog, receipt, and admin. The first milestone has only one page, so it avoids adding routing before there is a second route to navigate to.

## 8. Safety and money-handling notes

- The SQLite database is local and is ignored by Git. Do not put payment secrets into React files.
- The current API is read-only apart from its health check; it has no authentication yet.
- Before checkout exists, do not treat stock shown by the page as reserved. It is just the latest quantity returned from the API.
- When checkout is added, calculate totals on the server and use a database transaction to keep order creation and stock changes together.
- Use sandbox credentials while learning payment-provider integrations. Validate callbacks on the server before recording successful payment.
