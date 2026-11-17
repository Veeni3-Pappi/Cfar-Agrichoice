-- Supabase PostgreSQL Schema for CFAR Agrichoice
-- Generated: 2026-11-17

-- 1. Helper Function: Update timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Branches
CREATE TABLE IF NOT EXISTS public.branches (
    branch_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_name TEXT NOT NULL UNIQUE,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Roles
CREATE TABLE IF NOT EXISTS public.roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_type TEXT NOT NULL UNIQUE
);

-- 4. Staff (linked optionally to auth.users for Supabase Auth)
CREATE TABLE IF NOT EXISTS public.staff (
    staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE,
    role_id BIGINT NOT NULL REFERENCES public.roles(role_id),
    branch_id BIGINT REFERENCES public.branches(branch_id),
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
    date_hired DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_role_id_idx ON public.staff(role_id);
CREATE INDEX IF NOT EXISTS staff_branch_id_idx ON public.staff(branch_id);
CREATE INDEX IF NOT EXISTS staff_user_id_idx ON public.staff(user_id);

-- 5. Payroll
CREATE TABLE IF NOT EXISTS public.payroll (
    payroll_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES public.staff(staff_id) ON DELETE CASCADE,
    pay_period TEXT NOT NULL,
    gross_pay NUMERIC(12, 2) NOT NULL CHECK (gross_pay >= 0),
    deductions NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
    net_pay NUMERIC(12, 2) NOT NULL CHECK (net_pay >= 0),
    paid_on DATE,
    UNIQUE (staff_id, pay_period)
);

CREATE INDEX IF NOT EXISTS payroll_staff_id_idx ON public.payroll(staff_id);

-- 6. Products
CREATE TABLE IF NOT EXISTS public.products (
    product_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (
        product_type IN ('briquettes', 'dragonfruit', 'pixie_oranges', 'sweet_potatoes')
    ),
    unit TEXT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    is_special BOOLEAN NOT NULL DEFAULT FALSE,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_posted DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_name, unit)
);

CREATE INDEX IF NOT EXISTS products_product_type_idx ON public.products(product_type);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products(is_active);

-- 7. Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
    inventory_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES public.branches(branch_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
    stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    alert_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5 CHECK (alert_threshold >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (branch_id, product_id)
);

CREATE INDEX IF NOT EXISTS inventory_branch_id_idx ON public.inventory(branch_id);
CREATE INDEX IF NOT EXISTS inventory_product_id_idx ON public.inventory(product_id);

CREATE OR REPLACE TRIGGER trigger_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 8. Stock Intake
CREATE TABLE IF NOT EXISTS public.stock_intake (
    intake_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES public.branches(branch_id),
    product_id BIGINT NOT NULL REFERENCES public.products(product_id),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    source TEXT NOT NULL CHECK (source IN ('harvested', 'acquired')),
    recorded_by BIGINT REFERENCES public.staff(staff_id),
    intake_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_intake_branch_date_idx ON public.stock_intake(branch_id, intake_date DESC);
CREATE INDEX IF NOT EXISTS stock_intake_product_id_idx ON public.stock_intake(product_id);
CREATE INDEX IF NOT EXISTS stock_intake_recorded_by_idx ON public.stock_intake(recorded_by);

-- 9. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name TEXT,
    phone TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Orders
CREATE TABLE IF NOT EXISTS public.orders (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    receipt_no TEXT NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES public.customers(customer_id),
    branch_id BIGINT NOT NULL REFERENCES public.branches(branch_id),
    served_by BIGINT REFERENCES public.staff(staff_id),
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS orders_branch_date_idx ON public.orders(branch_id, order_date DESC);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_served_by_idx ON public.orders(served_by);

-- 11. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    order_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(product_id),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);

-- 12. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES public.orders(order_id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('mpesa', 'cash', 'card', 'bank')),
    payment_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    transaction_ref TEXT,
    receipt_no TEXT UNIQUE,
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Branches & Products: Public catalog read access
CREATE POLICY "Public read branches" ON public.branches
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Public read products" ON public.products
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Public read inventory" ON public.inventory
    FOR SELECT TO anon, authenticated
    USING (true);

-- Authenticated Staff: Access to orders, intake, inventory management
CREATE POLICY "Staff read orders" ON public.orders
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff create orders" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff update orders" ON public.orders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff read order items" ON public.order_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff insert order items" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff read payments" ON public.payments
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff insert payments" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff update payments" ON public.payments
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff read customers" ON public.customers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff insert customers" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff read intake" ON public.stock_intake
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff insert intake" ON public.stock_intake
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Staff update inventory" ON public.inventory
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff read staff directory" ON public.staff
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Staff read roles" ON public.roles
    FOR SELECT TO authenticated
    USING (true);
