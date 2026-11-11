import { pool } from '../db.js'

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
    const result = await pool.query(
      `SELECT branch_id, branch_name, location
       FROM branches
       ORDER BY branch_name`,
    )
    response.json(result.rows)
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

    const result = await pool.query(
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
         ON i.product_id = p.product_id
        AND i.branch_id = $1
       WHERE p.is_active = TRUE
         AND ($2::text IS NULL OR p.product_type = $2)
       ORDER BY p.product_name`,
      [branchId || null, category || null],
    )

    response.json(result.rows)
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

    const branchResult = await pool.query(
      'SELECT branch_id, branch_name, location FROM branches WHERE branch_id = $1',
      [branchId],
    )

    if (branchResult.rowCount === 0) {
      return response.status(404).json({ error: 'Branch not found.' })
    }

    const inventoryResult = await pool.query(
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
       WHERE i.branch_id = $1
         AND p.is_active = TRUE
       ORDER BY p.product_name`,
      [branchId],
    )

    response.json({
      branch: branchResult.rows[0],
      inventory: inventoryResult.rows,
    })
  } catch (error) {
    next(error)
  }
}
