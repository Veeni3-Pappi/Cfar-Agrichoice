import { database } from '../db.js'

const productCategories = new Set([
  'briquettes',
  'dragonfruit',
  'pixie_oranges',
  'sweet_potatoes',
])

function isPositiveInteger(value) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
}

export async function getBranches(_request, response, next) {
  try {
    const branches = database.prepare(
      `SELECT branch_id, branch_name, location
       FROM branches
       ORDER BY branch_name`,
    ).all()
    response.json(branches)
  } catch (error) {
    next(error)
  }
}

export async function getProducts(request, response, next) {
  try {
    const { category } = request.query
    const branchId = request.query.branch_id

    if (category && !productCategories.has(category)) {
      return response.status(400).json({ error: 'Choose a supported product category.' })
    }

    if (branchId && !isPositiveInteger(branchId)) {
      return response.status(400).json({ error: 'branch_id must be a positive whole number.' })
    }

    const products = database.prepare(
      `SELECT
         p.product_id,
         p.product_name,
         p.product_type,
         p.unit,
         p.unit_price,
         i.stock_quantity,
         i.alert_threshold
       FROM products AS p
       LEFT JOIN inventory AS i
         ON i.product_id = p.product_id AND i.branch_id = ?
       WHERE p.is_active = TRUE
         AND (? IS NULL OR p.product_type = ?)
       ORDER BY p.product_name`,
    ).all(branchId || null, category || null, category || null)

    response.json(products)
  } catch (error) {
    next(error)
  }
}

export async function getInventory(request, response, next) {
  try {
    const { branchId } = request.params
    if (!isPositiveInteger(branchId)) {
      return response.status(400).json({ error: 'Branch ID must be a positive whole number.' })
    }

    const branch = database.prepare(
      'SELECT branch_id, branch_name, location FROM branches WHERE branch_id = ?',
    ).get(branchId)

    if (!branch) {
      return response.status(404).json({ error: 'Branch not found.' })
    }

    const inventory = database.prepare(
      `SELECT
         p.product_id,
         p.product_name,
         p.product_type,
         p.unit,
         i.stock_quantity,
         i.alert_threshold,
         (i.stock_quantity <= i.alert_threshold) AS is_low_stock
       FROM inventory AS i
       JOIN products AS p ON p.product_id = i.product_id
       WHERE i.branch_id = ?
         AND p.is_active = TRUE
       ORDER BY p.product_name`,
    ).all(branchId)

    response.json({
      branch,
      // SQLite represents TRUE/FALSE as 1/0. Convert the flag for cleaner JSON.
      inventory: inventory.map((item) => ({
        ...item,
        is_low_stock: Boolean(item.is_low_stock),
      })),
    })
  } catch (error) {
    next(error)
  }
}
