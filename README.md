# CFAR Agrichoice

CFAR Agrichoice is a beginner-friendly farm products and branch inventory project. The first milestone is a real React catalog that reads branches, products, prices, and stock from an Express API backed by a local SQLite database.

This is the start of the system, not the finished system. Sales checkout, staff accounts, payroll, Supabase authentication, and payment providers are intentionally future milestones. See [tutorial.md](./tutorial.md) for a step-by-step explanation of the code and what to build next.

## What works now

- View the demo products and prices.
- Switch between seeded branches to see each branch's stock.
- Search and filter the catalog.
- See low-stock and sold-out badges.
- Read branch, product, and stock data from SQLite through a small Express API.

## Requirements

- Node.js 22.13+ and npm.

## 1. Start the API and create the local database

No PostgreSQL or MySQL server, database account, or password is needed. The API automatically creates `backend/data/agri_choice.sqlite` the first time it starts, then creates the tables and inserts sample branches, products, and stock from `schema.sql` and `seed.sql`.

Open a terminal in the `backend` folder and install dependencies:

```powershell
cd backend
npm install
npm run dev
```

The API starts at `http://localhost:3000`. Check `http://localhost:3000/api/health` in a browser; a working API returns `{"status":"ok"}`.

You do not need to create `.env` for local development. Optional settings such as the port can be copied from `.env.example`. The database file is kept on your computer and ignored by Git.

## 2. Run the React website

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

- **The website says it cannot reach the catalog:** make sure the API terminal is running, then refresh the page.
- **The API exits on startup:** check that you have Node.js 22.13 or newer and that `schema.sql` and `seed.sql` are present in the repository root.
- **I want to start with a fresh database:** stop the API, delete `backend/data/agri_choice.sqlite` and its `-shm`/`-wal` files if present, then start the API again. It recreates the demo database. This deletes local database changes.
- **The page has no products:** confirm the API started successfully and that its startup message says the SQLite database is ready.

SQLite is ideal for learning and local development. When the application needs multiple servers or concurrent users in production, we can later migrate to a hosted database without changing the React page's API contract.
