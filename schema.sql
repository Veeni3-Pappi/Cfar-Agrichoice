-- CFAR Agrichoice starter database.
-- Run this once in a new PostgreSQL database before running seed.sql.

CREATE TABLE branches (
    branch_id   SERIAL PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL UNIQUE,
    location    VARCHAR(150) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roles and staff are included for the planned staff/admin milestone.
-- Authentication will be connected to Supabase later; these rows are not logins.
CREATE TABLE roles (
    role_id   SERIAL PRIMARY KEY,
    role_type VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE staff (
    staff_id    SERIAL PRIMARY KEY,
    full_name   VARCHAR(120) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(120) UNIQUE,
    role_id     INT NOT NULL REFERENCES roles(role_id),
    branch_id   INT REFERENCES branches(branch_id),
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
    date_hired  DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll (
    payroll_id  SERIAL PRIMARY KEY,
    staff_id    INT NOT NULL REFERENCES staff(staff_id),
    pay_period  DATE NOT NULL,
    gross_pay   NUMERIC(12, 2) NOT NULL CHECK (gross_pay >= 0),
    deductions  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
    net_pay     NUMERIC(12, 2) NOT NULL CHECK (net_pay >= 0),
    paid_on     DATE,
    UNIQUE (staff_id, pay_period)
);

CREATE TABLE products (
    product_id   SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_type VARCHAR(50) NOT NULL CHECK (
        product_type IN ('briquettes', 'dragonfruit', 'pixie_oranges', 'sweet_potatoes')
    ),
    unit         VARCHAR(30) NOT NULL,
    unit_price   NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    is_special   BOOLEAN NOT NULL DEFAULT FALSE,
    image_url    TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    date_posted  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_name, unit)
);

-- Inventory is the amount of each product at each branch.
CREATE TABLE inventory (
    inventory_id   SERIAL PRIMARY KEY,
    branch_id      INT NOT NULL REFERENCES branches(branch_id) ON DELETE CASCADE,
    product_id     INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    alert_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5 CHECK (alert_threshold >= 0),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (branch_id, product_id)
);

-- Keep a simple record of where added stock came from.
CREATE TABLE stock_intake (
    intake_id   SERIAL PRIMARY KEY,
    branch_id   INT NOT NULL REFERENCES branches(branch_id),
    product_id  INT NOT NULL REFERENCES products(product_id),
    quantity    NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    source      VARCHAR(20) NOT NULL CHECK (source IN ('harvested', 'acquired')),
    recorded_by INT REFERENCES staff(staff_id),
    intake_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    full_name   VARCHAR(120),
    phone       VARCHAR(20) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    order_id      SERIAL PRIMARY KEY,
    receipt_no    VARCHAR(50) NOT NULL UNIQUE,
    customer_id   INT NOT NULL REFERENCES customers(customer_id),
    branch_id     INT NOT NULL REFERENCES branches(branch_id),
    served_by     INT REFERENCES staff(staff_id),
    order_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed'))
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id      INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id    INT NOT NULL REFERENCES products(product_id),
    quantity      NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal      NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    UNIQUE (order_id, product_id)
);

CREATE TABLE payments (
    payment_id     SERIAL PRIMARY KEY,
    order_id       INT NOT NULL REFERENCES orders(order_id),
    amount         NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_mode   VARCHAR(20) NOT NULL CHECK (payment_mode IN ('mpesa', 'cash', 'card', 'bank')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    transaction_ref VARCHAR(120),
    receipt_no     VARCHAR(50) UNIQUE,
    paid_at        TIMESTAMPTZ
);

CREATE INDEX inventory_branch_id_idx ON inventory (branch_id);
CREATE INDEX stock_intake_branch_date_idx ON stock_intake (branch_id, intake_date DESC);
CREATE INDEX orders_branch_date_idx ON orders (branch_id, order_date DESC);
