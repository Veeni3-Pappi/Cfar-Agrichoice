-- CFAR Agrichoice database schema (PostgreSQL)

CREATE TABLE branches (
    branch_id    SERIAL PRIMARY KEY,
    branch_name  VARCHAR(100) NOT NULL,
    location     VARCHAR(150) NOT NULL
);

-- general_admin (company-wide), branch_admin (one branch), staff
CREATE TABLE roles (
    role_id    SERIAL PRIMARY KEY,
    role_type  VARCHAR(30) NOT NULL UNIQUE
);

-- Staff records. branch_id is NULL for the general admin.
CREATE TABLE staff (
    staff_id    SERIAL PRIMARY KEY,
    full_name   VARCHAR(120) NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(120) UNIQUE,
    role_id     INT NOT NULL REFERENCES roles(role_id),
    branch_id   INT REFERENCES branches(branch_id),
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    date_hired  DATE
);

CREATE TABLE payroll (
    payroll_id   SERIAL PRIMARY KEY,
    staff_id     INT NOT NULL REFERENCES staff(staff_id),
    pay_period   DATE NOT NULL,              -- first day of the pay month
    gross_pay    NUMERIC(12,2) NOT NULL,
    deductions   NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay      NUMERIC(12,2) NOT NULL,
    paid_on      DATE,
    UNIQUE (staff_id, pay_period)
);

CREATE TABLE products (
    product_id    SERIAL PRIMARY KEY,
    product_name  VARCHAR(100) NOT NULL,     -- sweet potatoes, briquettes, dragon fruit, pixie oranges
    product_type  VARCHAR(50),
    unit          VARCHAR(20) NOT NULL,      -- kg, sack, piece
    unit_price    NUMERIC(12,2) NOT NULL,
    is_special    BOOLEAN NOT NULL DEFAULT FALSE,
    date_posted   DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Junction table: branches <-> products (many-to-many)
CREATE TABLE inventory (
    inventory_id    SERIAL PRIMARY KEY,
    branch_id       INT NOT NULL REFERENCES branches(branch_id),
    product_id      INT NOT NULL REFERENCES products(product_id),
    stock_quantity  NUMERIC(12,2) NOT NULL DEFAULT 0,
    UNIQUE (branch_id, product_id)
);

-- Records each harvest / acquisition that adds stock
CREATE TABLE stock_intake (
    intake_id     SERIAL PRIMARY KEY,
    branch_id     INT NOT NULL REFERENCES branches(branch_id),
    product_id    INT NOT NULL REFERENCES products(product_id),
    quantity      NUMERIC(12,2) NOT NULL,
    source        VARCHAR(20) NOT NULL CHECK (source IN ('harvested','acquired')),
    recorded_by   INT REFERENCES staff(staff_id),
    intake_date   DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE customers (
    customer_id  SERIAL PRIMARY KEY,
    full_name    VARCHAR(120),
    phone        VARCHAR(20) NOT NULL UNIQUE
);

-- One customer -> many orders. Each order is placed at one branch.
CREATE TABLE orders (
    order_id     SERIAL PRIMARY KEY,
    customer_id  INT NOT NULL REFERENCES customers(customer_id),
    branch_id    INT NOT NULL REFERENCES branches(branch_id),
    served_by    INT REFERENCES staff(staff_id),
    order_date   TIMESTAMP NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- One order -> many products
CREATE TABLE order_items (
    order_item_id  SERIAL PRIMARY KEY,
    order_id       INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id     INT NOT NULL REFERENCES products(product_id),
    quantity       NUMERIC(12,2) NOT NULL,
    unit_price     NUMERIC(12,2) NOT NULL,   -- price at time of sale
    UNIQUE (order_id, product_id)
);

CREATE TABLE payments (
    payment_id      SERIAL PRIMARY KEY,
    order_id        INT NOT NULL REFERENCES orders(order_id),
    amount          NUMERIC(12,2) NOT NULL,
    payment_mode    VARCHAR(20) NOT NULL CHECK (payment_mode IN ('mpesa','cash','card','bank')),
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (payment_status IN ('pending','paid','failed','refunded')),
    receipt_no      VARCHAR(50) UNIQUE,
    paid_at         TIMESTAMP
);
