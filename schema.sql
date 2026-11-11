-- CFAR Agrichoice starter database (SQLite).
-- The Express API creates the local database file and runs this script on startup.
-- These tables use SQLite types: INTEGER IDs, REAL money/quantities, and TEXT dates.

CREATE TABLE IF NOT EXISTS branches (
    branch_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_name TEXT NOT NULL UNIQUE,
    location    TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Roles and staff are included for the planned staff/admin milestone.
-- Authentication will be connected to Supabase later; these rows are not logins.
CREATE TABLE IF NOT EXISTS roles (
    role_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    role_type TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS staff (
    staff_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name   TEXT NOT NULL,
    phone       TEXT,
    email       TEXT UNIQUE,
    role_id     INTEGER NOT NULL REFERENCES roles(role_id),
    branch_id   INTEGER REFERENCES branches(branch_id),
    base_salary REAL NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
    date_hired  TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll (
    payroll_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id    INTEGER NOT NULL REFERENCES staff(staff_id),
    pay_period  TEXT NOT NULL,
    gross_pay   REAL NOT NULL CHECK (gross_pay >= 0),
    deductions  REAL NOT NULL DEFAULT 0 CHECK (deductions >= 0),
    net_pay     REAL NOT NULL CHECK (net_pay >= 0),
    paid_on     TEXT,
    UNIQUE (staff_id, pay_period)
);

CREATE TABLE IF NOT EXISTS products (
    product_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (
        product_type IN ('briquettes', 'dragonfruit', 'pixie_oranges', 'sweet_potatoes')
    ),
    unit         TEXT NOT NULL,
    unit_price   REAL NOT NULL CHECK (unit_price >= 0),
    is_special   INTEGER NOT NULL DEFAULT 0 CHECK (is_special IN (0, 1)),
    image_url    TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    date_posted  TEXT NOT NULL DEFAULT CURRENT_DATE,
    created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_name, unit)
);

-- Inventory is the amount of each product at each branch.
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id       INTEGER NOT NULL REFERENCES branches(branch_id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    stock_quantity  REAL NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    alert_threshold REAL NOT NULL DEFAULT 5 CHECK (alert_threshold >= 0),
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (branch_id, product_id)
);

-- Keep a simple record of where added stock came from.
CREATE TABLE IF NOT EXISTS stock_intake (
    intake_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id   INTEGER NOT NULL REFERENCES branches(branch_id),
    product_id  INTEGER NOT NULL REFERENCES products(product_id),
    quantity    REAL NOT NULL CHECK (quantity > 0),
    source      TEXT NOT NULL CHECK (source IN ('harvested', 'acquired')),
    recorded_by INTEGER REFERENCES staff(staff_id),
    intake_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name   TEXT,
    phone       TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    order_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no     TEXT NOT NULL UNIQUE,
    customer_id    INTEGER NOT NULL REFERENCES customers(customer_id),
    branch_id      INTEGER NOT NULL REFERENCES branches(branch_id),
    served_by      INTEGER REFERENCES staff(staff_id),
    order_date     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount   REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES products(product_id),
    quantity      REAL NOT NULL CHECK (quantity > 0),
    unit_price    REAL NOT NULL CHECK (unit_price >= 0),
    subtotal      REAL NOT NULL CHECK (subtotal >= 0),
    UNIQUE (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id        INTEGER NOT NULL REFERENCES orders(order_id),
    amount          REAL NOT NULL CHECK (amount >= 0),
    payment_mode    TEXT NOT NULL CHECK (payment_mode IN ('mpesa', 'cash', 'card', 'bank')),
    payment_status  TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    transaction_ref TEXT,
    receipt_no      TEXT UNIQUE,
    paid_at         TEXT
);

CREATE INDEX IF NOT EXISTS inventory_branch_id_idx
    ON inventory (branch_id);
CREATE INDEX IF NOT EXISTS stock_intake_branch_date_idx
    ON stock_intake (branch_id, intake_date DESC);
CREATE INDEX IF NOT EXISTS orders_branch_date_idx
    ON orders (branch_id, order_date DESC);
