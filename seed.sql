-- Sample data for local development.
-- The Express API runs this file on startup; existing inventory is not reset.

INSERT INTO branches (branch_name, location)
VALUES
    ('Nyahururu Plant', 'Nyahururu, Laikipia County'),
    ('Machakos Farm', 'Machakos County'),
    ('Nairobi Outlet', 'Nairobi County')
ON CONFLICT (branch_name) DO UPDATE
SET location = excluded.location;

INSERT INTO roles (role_type)
VALUES ('general_admin'), ('branch_admin'), ('staff')
ON CONFLICT (role_type) DO NOTHING;

INSERT INTO products (product_name, product_type, unit, unit_price, is_special)
VALUES
    ('Carbonized wood scrap briquettes', 'briquettes', '50kg bag', 1800, 1),
    ('Dragon fruit', 'dragonfruit', 'kg', 450, 1),
    ('Pixie oranges', 'pixie_oranges', 'crate', 1600, 1),
    ('Sweet potatoes', 'sweet_potatoes', 'gunia', 1200, 1)
ON CONFLICT (product_name, unit) DO UPDATE
SET product_type = excluded.product_type,
    unit_price = excluded.unit_price,
    is_special = excluded.is_special,
    is_active = 1;

-- A small set of realistic-looking stock counts makes the first catalog useful.
-- Change these values in SQLite to experiment with the low-stock badges.
WITH stock(branch_name, product_name, unit, quantity, alert_threshold) AS (
    VALUES
        ('Nyahururu Plant', 'Carbonized wood scrap briquettes', '50kg bag', 48, 8),
        ('Nyahururu Plant', 'Dragon fruit', 'kg', 32, 10),
        ('Nyahururu Plant', 'Pixie oranges', 'crate', 16, 5),
        ('Nyahururu Plant', 'Sweet potatoes', 'gunia', 23, 6),
        ('Machakos Farm', 'Carbonized wood scrap briquettes', '50kg bag', 12, 8),
        ('Machakos Farm', 'Dragon fruit', 'kg', 5, 10),
        ('Machakos Farm', 'Pixie oranges', 'crate', 21, 5),
        ('Machakos Farm', 'Sweet potatoes', 'gunia', 0, 6),
        ('Nairobi Outlet', 'Carbonized wood scrap briquettes', '50kg bag', 7, 8),
        ('Nairobi Outlet', 'Dragon fruit', 'kg', 18, 10),
        ('Nairobi Outlet', 'Pixie oranges', 'crate', 4, 5),
        ('Nairobi Outlet', 'Sweet potatoes', 'gunia', 14, 6)
)
INSERT INTO inventory (branch_id, product_id, stock_quantity, alert_threshold)
SELECT b.branch_id, p.product_id, stock.quantity, stock.alert_threshold
FROM stock
JOIN branches AS b ON b.branch_name = stock.branch_name
JOIN products AS p
  ON p.product_name = stock.product_name
 AND p.unit = stock.unit
WHERE 1
ON CONFLICT (branch_id, product_id) DO NOTHING;
