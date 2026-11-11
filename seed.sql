-- Sample data for learning and local development.
-- Re-running this file will update the demo catalog but will not reset stock.

INSERT INTO branches (branch_name, location)
VALUES
    ('Nyahururu Plant', 'Nyahururu, Laikipia County'),
    ('Machakos Farm', 'Machakos County'),
    ('Nairobi Outlet', 'Nairobi County')
ON CONFLICT (branch_name) DO UPDATE
SET location = EXCLUDED.location;

INSERT INTO roles (role_type)
VALUES ('general_admin'), ('branch_admin'), ('staff')
ON CONFLICT (role_type) DO NOTHING;

INSERT INTO products (product_name, product_type, unit, unit_price, is_special)
VALUES
    ('Carbonized wood scrap briquettes', 'briquettes', '50kg bag', 1800, TRUE),
    ('Dragon fruit', 'dragonfruit', 'kg', 450, TRUE),
    ('Pixie oranges', 'pixie_oranges', 'crate', 1600, TRUE),
    ('Sweet potatoes', 'sweet_potatoes', 'gunia', 1200, TRUE)
ON CONFLICT (product_name, unit) DO UPDATE
SET product_type = EXCLUDED.product_type,
    unit_price = EXCLUDED.unit_price,
    is_special = EXCLUDED.is_special,
    is_active = TRUE;

-- A small set of realistic-looking stock counts makes the first catalog useful.
-- Change these values in PostgreSQL to experiment with the low-stock badges.
INSERT INTO inventory (branch_id, product_id, stock_quantity, alert_threshold)
SELECT b.branch_id, p.product_id, stock.quantity, stock.alert_threshold
FROM (
    VALUES
        ('Nyahururu Plant', 'Carbonized wood scrap briquettes', '50kg bag', 48::NUMERIC, 8::NUMERIC),
        ('Nyahururu Plant', 'Dragon fruit', 'kg', 32::NUMERIC, 10::NUMERIC),
        ('Nyahururu Plant', 'Pixie oranges', 'crate', 16::NUMERIC, 5::NUMERIC),
        ('Nyahururu Plant', 'Sweet potatoes', 'gunia', 23::NUMERIC, 6::NUMERIC),
        ('Machakos Farm', 'Carbonized wood scrap briquettes', '50kg bag', 12::NUMERIC, 8::NUMERIC),
        ('Machakos Farm', 'Dragon fruit', 'kg', 5::NUMERIC, 10::NUMERIC),
        ('Machakos Farm', 'Pixie oranges', 'crate', 21::NUMERIC, 5::NUMERIC),
        ('Machakos Farm', 'Sweet potatoes', 'gunia', 0::NUMERIC, 6::NUMERIC),
        ('Nairobi Outlet', 'Carbonized wood scrap briquettes', '50kg bag', 7::NUMERIC, 8::NUMERIC),
        ('Nairobi Outlet', 'Dragon fruit', 'kg', 18::NUMERIC, 10::NUMERIC),
        ('Nairobi Outlet', 'Pixie oranges', 'crate', 4::NUMERIC, 5::NUMERIC),
        ('Nairobi Outlet', 'Sweet potatoes', 'gunia', 14::NUMERIC, 6::NUMERIC)
) AS stock(branch_name, product_name, unit, quantity, alert_threshold)
JOIN branches AS b ON b.branch_name = stock.branch_name
JOIN products AS p
  ON p.product_name = stock.product_name
 AND p.unit = stock.unit
ON CONFLICT (branch_id, product_id) DO NOTHING;
