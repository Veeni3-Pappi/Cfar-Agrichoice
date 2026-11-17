-- Seed data for Supabase PostgreSQL (CFAR Agrichoice)

INSERT INTO public.branches (branch_name, location)
VALUES
    ('Nyahururu Plant', 'Nyahururu, Laikipia County'),
    ('Machakos Farm', 'Machakos County'),
    ('Nairobi Outlet', 'Nairobi County')
ON CONFLICT (branch_name) DO UPDATE
SET location = EXCLUDED.location;

INSERT INTO public.roles (role_type)
VALUES ('general_admin'), ('branch_admin'), ('staff')
ON CONFLICT (role_type) DO NOTHING;

INSERT INTO public.products (product_name, product_type, unit, unit_price, is_special, is_active)
VALUES
    ('Carbonized wood scrap briquettes', 'briquettes', '50kg bag', 1800, true, true),
    ('Dragon fruit', 'dragonfruit', 'kg', 450, true, true),
    ('Pixie oranges', 'pixie_oranges', 'crate', 1600, true, true),
    ('Sweet potatoes', 'sweet_potatoes', 'gunia', 1200, true, true)
ON CONFLICT (product_name, unit) DO UPDATE
SET product_type = EXCLUDED.product_type,
    unit_price = EXCLUDED.unit_price,
    is_special = EXCLUDED.is_special,
    is_active = true;

WITH stock(branch_name, product_name, unit, quantity, alert_threshold) AS (
    VALUES
        ('Nyahururu Plant', 'Carbonized wood scrap briquettes', '50kg bag', 48::numeric, 8::numeric),
        ('Nyahururu Plant', 'Dragon fruit', 'kg', 32::numeric, 10::numeric),
        ('Nyahururu Plant', 'Pixie oranges', 'crate', 16::numeric, 5::numeric),
        ('Nyahururu Plant', 'Sweet potatoes', 'gunia', 23::numeric, 6::numeric),
        ('Machakos Farm', 'Carbonized wood scrap briquettes', '50kg bag', 12::numeric, 8::numeric),
        ('Machakos Farm', 'Dragon fruit', 'kg', 5::numeric, 10::numeric),
        ('Machakos Farm', 'Pixie oranges', 'crate', 21::numeric, 5::numeric),
        ('Machakos Farm', 'Sweet potatoes', 'gunia', 0::numeric, 6::numeric),
        ('Nairobi Outlet', 'Carbonized wood scrap briquettes', '50kg bag', 7::numeric, 8::numeric),
        ('Nairobi Outlet', 'Dragon fruit', 'kg', 18::numeric, 10::numeric),
        ('Nairobi Outlet', 'Pixie oranges', 'crate', 4::numeric, 5::numeric),
        ('Nairobi Outlet', 'Sweet potatoes', 'gunia', 14::numeric, 6::numeric)
)
INSERT INTO public.inventory (branch_id, product_id, stock_quantity, alert_threshold)
SELECT b.branch_id, p.product_id, s.quantity, s.alert_threshold
FROM stock s
JOIN public.branches b ON b.branch_name = s.branch_name
JOIN public.products p ON p.product_name = s.product_name AND p.unit = s.unit
ON CONFLICT (branch_id, product_id) DO NOTHING;
