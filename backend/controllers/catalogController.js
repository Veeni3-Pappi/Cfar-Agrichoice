import { database } from '../db.js'

const productCategories = new Set([
  'briquettes',
  'dragonfruit',
  'pixie_oranges',
  'sweet_potatoes',
])

const validPaymentModes = new Set(['mpesa', 'cash', 'card', 'bank'])
const validSources = new Set(['harvested', 'acquired'])

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0
}

function isPositiveNumber(value) {
  return /^\d+(?:\.\d+)?$/.test(String(value)) && Number(value) > 0
}

function toNumber(value, fallback = 0) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : fallback
}

function createReceiptNumber() {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const suffix = String(Math.floor(1000 + Math.random() * 9000))
  return `RCP-${stamp}-${suffix}`
}

function beginTransaction() {
  database.exec('BEGIN IMMEDIATE')
}

function rollbackTransaction() {
  try {
    database.exec('ROLLBACK')
  } catch {
    // Ignore rollback failures when no transaction is active.
  }
}

function commitTransaction() {
  database.exec('COMMIT')
}

function normalizePaymentMode(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : 'cash'
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
      inventory: inventory.map((item) => ({
        ...item,
        is_low_stock: Boolean(item.is_low_stock),
      })),
    })
  } catch (error) {
    next(error)
  }
}

export async function restockInventory(request, response, next) {
  try {
    const { branch_id: branchIdInput, product_id: productIdInput, quantity, source, recorded_by: recordedByInput } = request.body || {}

    if (!isPositiveInteger(branchIdInput)) {
      return response.status(400).json({ error: 'branch_id must be a positive whole number.' })
    }
    if (!isPositiveInteger(productIdInput)) {
      return response.status(400).json({ error: 'product_id must be a positive whole number.' })
    }
    if (!isPositiveNumber(quantity)) {
      return response.status(400).json({ error: 'quantity must be greater than zero.' })
    }

    const sourceValue = typeof source === 'string' ? source.trim().toLowerCase() : ''
    if (!validSources.has(sourceValue)) {
      return response.status(400).json({ error: 'source must be either harvested or acquired.' })
    }

    if (recordedByInput !== undefined && recordedByInput !== null && !isPositiveInteger(recordedByInput)) {
      return response.status(400).json({ error: 'recorded_by must be a positive whole number when supplied.' })
    }

    const branch = database.prepare('SELECT branch_id FROM branches WHERE branch_id = ?').get(branchIdInput)
    if (!branch) {
      return response.status(404).json({ error: 'Branch not found.' })
    }

    const product = database.prepare('SELECT product_id, is_active FROM products WHERE product_id = ?').get(productIdInput)
    if (!product || Number(product.is_active) === 0) {
      return response.status(404).json({ error: 'Product not found.' })
    }

    const restockQuantity = Number(quantity)
    const recordedBy = recordedByInput === undefined || recordedByInput === null ? null : Number(recordedByInput)

    beginTransaction()

    try {
      database.prepare(
        `INSERT INTO stock_intake (branch_id, product_id, quantity, source, recorded_by, intake_date)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      ).run(branchIdInput, productIdInput, restockQuantity, sourceValue, recordedBy)

      const existingRow = database.prepare(
        'SELECT inventory_id FROM inventory WHERE branch_id = ? AND product_id = ?',
      ).get(branchIdInput, productIdInput)

      if (existingRow) {
        database.prepare(
          `UPDATE inventory
           SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
           WHERE inventory_id = ?`,
        ).run(restockQuantity, existingRow.inventory_id)
      } else {
        database.prepare(
          `INSERT INTO inventory (branch_id, product_id, stock_quantity, alert_threshold, updated_at)
           VALUES (?, ?, ?, 5, CURRENT_TIMESTAMP)`,
        ).run(branchIdInput, productIdInput, restockQuantity)
      }

      const updatedInventory = database.prepare(
        `SELECT
           i.inventory_id,
           p.product_name,
           p.product_type,
           p.unit,
           i.stock_quantity,
           i.alert_threshold
         FROM inventory AS i
         JOIN products AS p ON p.product_id = i.product_id
         WHERE i.branch_id = ? AND i.product_id = ?`,
      ).get(branchIdInput, productIdInput)

      commitTransaction()
      response.status(201).json({
        message: 'Inventory restocked successfully.',
        inventory: updatedInventory,
      })
    } catch (error) {
      rollbackTransaction()
      throw error
    }
  } catch (error) {
    next(error)
  }
}

export async function createOrder(request, response, next) {
  try {
    const payload = request.body || {}
    const { branch_id: branchIdInput, customer_phone: customerPhone, customer_name: customerName, items, payment_mode: paymentModeInput = 'cash' } = payload

    if (!isPositiveInteger(branchIdInput)) {
      return response.status(400).json({ error: 'branch_id must be a positive whole number.' })
    }

    const normalizedPhone = typeof customerPhone === 'string' ? customerPhone.trim() : ''
    if (!normalizedPhone) {
      return response.status(400).json({ error: 'customer_phone is required.' })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return response.status(400).json({ error: 'At least one order item is required.' })
    }

    const normalizedPaymentMode = normalizePaymentMode(paymentModeInput)
    if (!validPaymentModes.has(normalizedPaymentMode)) {
      return response.status(400).json({ error: 'payment_mode must be one of mpesa, cash, card, or bank.' })
    }

    const branch = database.prepare('SELECT branch_id, branch_name, location FROM branches WHERE branch_id = ?').get(branchIdInput)
    if (!branch) {
      return response.status(404).json({ error: 'Branch not found.' })
    }

    beginTransaction()

    try {
      let customer = database.prepare('SELECT customer_id, full_name, phone FROM customers WHERE phone = ?').get(normalizedPhone)
      if (!customer) {
        const insertCustomer = database.prepare(
          'INSERT INTO customers (full_name, phone) VALUES (?, ?)',
        )
        const customerResult = insertCustomer.run(customerName || null, normalizedPhone)
        customer = {
          customer_id: customerResult.lastInsertRowid,
          full_name: customerName || null,
          phone: normalizedPhone,
        }
      } else if (customerName && customerName.trim()) {
        database.prepare('UPDATE customers SET full_name = ? WHERE customer_id = ?').run(customerName.trim(), customer.customer_id)
        customer.full_name = customerName.trim()
      }

      const lineItems = []
      let totalAmount = 0

      for (const item of items) {
        const productId = item.product_id
        const requestedQuantity = item.quantity

        if (!isPositiveInteger(productId)) {
          throw new Error('Each item must include a valid product_id.')
        }
        if (!isPositiveNumber(requestedQuantity)) {
          throw new Error('Each item quantity must be greater than zero.')
        }

        const product = database.prepare(
          `SELECT product_id, product_name, unit_price, is_active
           FROM products
           WHERE product_id = ?`,
        ).get(productId)

        if (!product || Number(product.is_active) === 0) {
          throw new Error(`Product ${productId} is unavailable.`)
        }

        const inventoryRow = database.prepare(
          `SELECT stock_quantity
           FROM inventory
           WHERE branch_id = ? AND product_id = ?`,
        ).get(branchIdInput, productId)

        const availableQuantity = toNumber(inventoryRow?.stock_quantity, 0)
        const requestedAmount = Number(requestedQuantity)

        if (availableQuantity < requestedAmount) {
          throw new Error(`Not enough stock for ${product.product_name}.`)
        }

        const subtotal = Number(product.unit_price) * requestedAmount
        totalAmount += subtotal
        lineItems.push({
          product_id: product.product_id,
          product_name: product.product_name,
          quantity: requestedAmount,
          unit_price: Number(product.unit_price),
          subtotal,
        })
      }

      let receiptNo = createReceiptNumber()
      while (database.prepare('SELECT 1 FROM orders WHERE receipt_no = ?').get(receiptNo)) {
        receiptNo = createReceiptNumber()
      }

      const orderResult = database.prepare(
        `INSERT INTO orders (receipt_no, customer_id, branch_id, total_amount, payment_status)
         VALUES (?, ?, ?, ?, 'pending')`,
      ).run(receiptNo, customer.customer_id, branchIdInput, totalAmount)

      const orderId = Number(orderResult.lastInsertRowid)

      for (const item of lineItems) {
        database.prepare(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
        ).run(orderId, item.product_id, item.quantity, item.unit_price, item.subtotal)

        const updatedRows = database.prepare(
          `UPDATE inventory
           SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
           WHERE branch_id = ?
             AND product_id = ?
             AND stock_quantity >= ?`,
        ).run(item.quantity, branchIdInput, item.product_id, item.quantity)

        if (updatedRows.changes === 0) {
          throw new Error(`Inventory update failed for product ${item.product_id}.`)
        }
      }

      database.prepare(
        `INSERT INTO payments (order_id, amount, payment_mode, payment_status, transaction_ref, receipt_no, paid_at)
         VALUES (?, ?, ?, 'pending', ?, ?, NULL)`,
      ).run(orderId, totalAmount, normalizedPaymentMode, `PAY-${Date.now()}`, receiptNo)

      commitTransaction()

      response.status(201).json({
        message: 'Order created successfully.',
        order_id: orderId,
        receipt_no: receiptNo,
        customer: {
          customer_id: customer.customer_id,
          full_name: customer.full_name,
          phone: customer.phone,
        },
        branch_id: branchIdInput,
        branch_name: branch.branch_name,
        total_amount: totalAmount,
        payment_status: 'pending',
        payment_mode: normalizedPaymentMode,
        items: lineItems,
      })
    } catch (error) {
      rollbackTransaction()
      throw error
    }
  } catch (error) {
    next(error)
  }
}

export async function getOrders(request, response, next) {
  try {
    const branchId = request.query.branch_id
    const limit = request.query.limit || 10

    if (branchId && !isPositiveInteger(branchId)) {
      return response.status(400).json({ error: 'branch_id must be a positive whole number.' })
    }

    if (limit && !isPositiveInteger(limit)) {
      return response.status(400).json({ error: 'limit must be a positive whole number.' })
    }

    const orderRows = database.prepare(
      `SELECT
         o.order_id,
         o.receipt_no,
         o.branch_id,
         o.total_amount,
         o.payment_status,
         o.order_date,
         c.full_name AS customer_name,
         c.phone AS customer_phone,
         b.branch_name,
         b.location
       FROM orders AS o
       JOIN customers AS c ON c.customer_id = o.customer_id
       JOIN branches AS b ON b.branch_id = o.branch_id
       WHERE (? IS NULL OR o.branch_id = ?)
       ORDER BY o.order_date DESC, o.order_id DESC
       LIMIT ?`,
    ).all(branchId || null, branchId || null, Number(limit))

    const totalRevenue = database.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue,
              COUNT(*) AS total_orders
       FROM orders
       WHERE (? IS NULL OR branch_id = ?)`,
    ).get(branchId || null, branchId || null)

    const todaysDate = new Date().toISOString().slice(0, 10)
    const dailyRevenue = database.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS daily_revenue
       FROM orders
       WHERE date(order_date) = date(?)
         AND (? IS NULL OR branch_id = ?)`,
    ).get(todaysDate, branchId || null, branchId || null)

    response.json({
      branch_id: branchId ? Number(branchId) : null,
      total_revenue: Number(totalRevenue.total_revenue || 0),
      total_orders: Number(totalRevenue.total_orders || 0),
      daily_revenue: Number(dailyRevenue.daily_revenue || 0),
      orders: orderRows.map((order) => ({
        ...order,
        total_amount: Number(order.total_amount),
      })),
    })
  } catch (error) {
    next(error)
  }
}

export async function getOrderByReceipt(request, response, next) {
  try {
    const { receiptNo } = request.params
    if (!receiptNo || typeof receiptNo !== 'string' || !receiptNo.trim()) {
      return response.status(400).json({ error: 'receiptNo is required.' })
    }

    const order = database.prepare(
      `SELECT
         o.order_id,
         o.receipt_no,
         o.customer_id,
         o.branch_id,
         o.total_amount,
         o.payment_status,
         o.order_date,
         c.full_name AS customer_name,
         c.phone AS customer_phone,
         b.branch_name,
         b.location
       FROM orders AS o
       JOIN customers AS c ON c.customer_id = o.customer_id
       JOIN branches AS b ON b.branch_id = o.branch_id
       WHERE o.receipt_no = ?`,
    ).get(receiptNo.trim())

    if (!order) {
      return response.status(404).json({ error: 'Order not found.' })
    }

    const items = database.prepare(
      `SELECT
         oi.order_item_id,
         oi.product_id,
         p.product_name,
         p.product_type,
         oi.quantity,
         oi.unit_price,
         oi.subtotal
       FROM order_items AS oi
       JOIN products AS p ON p.product_id = oi.product_id
       WHERE oi.order_id = ?
       ORDER BY p.product_name`,
    ).all(order.order_id)

    const payment = database.prepare(
      `SELECT payment_id, payment_mode, payment_status, transaction_ref, amount, receipt_no, paid_at
       FROM payments
       WHERE order_id = ?`,
    ).get(order.order_id)

    response.json({ order, items, payment })
  } catch (error) {
    next(error)
  }
}

export async function createStkPush(request, response, next) {
  try {
    const payload = request.body || {}
    const { receipt_no: receiptNo, amount, payment_mode: paymentModeInput = 'mpesa' } = payload

    if (!receiptNo || typeof receiptNo !== 'string' || !receiptNo.trim()) {
      return response.status(400).json({ error: 'receipt_no is required.' })
    }

    const normalizedPaymentMode = normalizePaymentMode(paymentModeInput)
    if (!validPaymentModes.has(normalizedPaymentMode)) {
      return response.status(400).json({ error: 'payment_mode must be one of mpesa, cash, card, or bank.' })
    }

    const order = database.prepare('SELECT order_id, total_amount, payment_status FROM orders WHERE receipt_no = ?').get(receiptNo.trim())
    if (!order) {
      return response.status(404).json({ error: 'Order not found.' })
    }

    const paymentAmount = toNumber(amount, Number(order.total_amount))
    if (paymentAmount <= 0) {
      return response.status(400).json({ error: 'amount must be greater than zero.' })
    }

    const transactionRef = `MPESA-${Date.now()}`
    const payment = database.prepare(
      `SELECT payment_id FROM payments WHERE order_id = ?`,
    ).get(order.order_id)

    if (payment) {
      database.prepare(
        `UPDATE payments
         SET amount = ?, payment_mode = ?, payment_status = 'pending', transaction_ref = ?, receipt_no = ?, paid_at = NULL
         WHERE payment_id = ?`,
      ).run(paymentAmount, normalizedPaymentMode, transactionRef, receiptNo.trim(), payment.payment_id)
    } else {
      database.prepare(
        `INSERT INTO payments (order_id, amount, payment_mode, payment_status, transaction_ref, receipt_no, paid_at)
         VALUES (?, ?, ?, 'pending', ?, ?, NULL)`,
      ).run(order.order_id, paymentAmount, normalizedPaymentMode, transactionRef, receiptNo.trim())
    }

    response.status(202).json({
      message: 'STK push initiated.',
      order_id: order.order_id,
      receipt_no: receiptNo.trim(),
      payment_mode: normalizedPaymentMode,
      transaction_ref: transactionRef,
      status: 'pending',
    })
  } catch (error) {
    next(error)
  }
}

export async function handlePaymentCallback(request, response, next) {
  try {
    const payload = request.body || {}
    const { receipt_no: receiptNo, status: callbackStatus, transaction_ref: transactionRef } = payload

    if (!receiptNo || typeof receiptNo !== 'string' || !receiptNo.trim()) {
      return response.status(400).json({ error: 'receipt_no is required.' })
    }

    const normalizedStatus = typeof callbackStatus === 'string' ? callbackStatus.trim().toLowerCase() : ''
    if (!['pending', 'completed', 'failed'].includes(normalizedStatus)) {
      return response.status(400).json({ error: 'status must be pending, completed, or failed.' })
    }

    const order = database.prepare('SELECT order_id, receipt_no, total_amount, payment_status FROM orders WHERE receipt_no = ?').get(receiptNo.trim())
    if (!order) {
      return response.status(404).json({ error: 'Order not found.' })
    }

    const nextOrderStatus = normalizedStatus === 'completed' ? 'completed' : 'failed'
    const paymentStatusValue = normalizedStatus === 'completed' ? 'paid' : 'failed'

    database.prepare(
      `UPDATE orders
       SET payment_status = ?
       WHERE order_id = ?`,
    ).run(nextOrderStatus, order.order_id)

    database.prepare(
      `UPDATE payments
       SET payment_status = ?, transaction_ref = COALESCE(?, transaction_ref), paid_at = ?
       WHERE order_id = ?`,
    ).run(paymentStatusValue, transactionRef || null, normalizedStatus === 'completed' ? new Date().toISOString() : null, order.order_id)

    response.json({
      message: 'Payment callback processed.',
      receipt_no: receiptNo.trim(),
      order_status: nextOrderStatus,
      payment_status: paymentStatusValue,
    })
  } catch (error) {
    next(error)
  }
}
