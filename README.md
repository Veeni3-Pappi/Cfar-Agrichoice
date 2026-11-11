# CFAR Agrichoice

CFAR Agrichoice is a beginner-friendly farm products and branch inventory project. The first milestone is a real React catalog that reads branches, products, prices, and stock from an Express API backed by PostgreSQL.

This is the start of the system, not the finished system. Sales checkout, staff accounts, payroll, Supabase authentication, and payment providers are intentionally future milestones. See [tutorial.md](./tutorial.md) for a step-by-step explanation of the code and what to build next.

## What works now

- View the demo products and prices.
- Switch between seeded branches to see each branch's stock.
- Search and filter the catalog.
- See low-stock and sold-out badges.
- Read branch, product, and stock data from PostgreSQL through a small Express API.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm.
- PostgreSQL 14 or newer.

## 1. Create and set up the database

Create a database named `agri_choice`. For example, in the PostgreSQL command line:

```powershell
createdb -U postgres agri_choice
```

Or create a database with the name `agri_choice` in pgAdmin.

Run the schema and sample data from the repository root. Replace `postgres` with your PostgreSQL username if needed:

```powershell
psql -U postgres -d agri_choice -f schema.sql
psql -U postgres -d agri_choice -f seed.sql
```

`schema.sql` creates the tables; `seed.sql` inserts sample branches, products, and stock. The seed values are examples for local development.

## 2. Configure and run the API

Open a terminal in the `backend` folder:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to match your local PostgreSQL username and password. For example:

```text
DATABASE_URL=postgresql://postgres:your_actual_password@localhost:5432/agri_choice
```

Then install dependencies and start the API:

```powershell
npm install
npm run dev
```

The API starts at `http://localhost:3000`. Check `http://localhost:3000/api/health` in a browser; a working API returns `{"status":"ok"}`.

## 3. Run the React website

Open a **second** terminal in the repository's `frontend` folder:

```powershell
cd frontend
npm install
npm run dev
```

Open the local address Vite prints, usually `http://localhost:5173`.

## API routes in this milestone

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check that the API is running. |
| GET | `/api/branches` | List branches for the selector. |
| GET | `/api/products?branch_id=1` | List products and their stock at one branch. |
| GET | `/api/products?branch_id=1&category=dragonfruit` | Filter the branch catalog. |
| GET | `/api/inventory/1` | Get a branch's stock and low-stock flags. |

The API uses parameterized SQL for values that come from a request, so user input is not pasted into SQL text.

## Useful commands

Run these from `frontend`:

```powershell
npm run build
npm run lint
```

Run these from `backend` to check JavaScript syntax:

```powershell
node --check server.js
node --check controllers/catalogController.js
```

## Troubleshooting

- **The website says it cannot reach the catalog:** make sure PostgreSQL and the API terminal are running, then refresh the page.
- **The API exits on startup:** check that PostgreSQL is running, the database exists, and `DATABASE_URL` in `backend/.env` is correct.
- **PostgreSQL says a table already exists:** the schema is designed to be run once in a new database. For a fresh practice database, create another database and run the schema and seed there.
- **The page has no products:** run `seed.sql` after `schema.sql` and confirm the API is using the same database.

Never put a real password, Supabase key, or payment-provider secret in a file that is committed to GitHub. Keep private values in `.env`.
