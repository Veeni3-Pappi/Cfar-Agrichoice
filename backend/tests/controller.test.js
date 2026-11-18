import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { database, initializeDatabase } from '../db.js'
import {
  createOrder,
  getOrders,
  getOrderByReceipt,
  createStkPush,
  handlePaymentCallback,
  restockInventory,
} from '../controllers/catalogController.js'

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.body = data
      return this
    },
  }
  return res
}

describe('AgriChoice Controller Business Logic Unit Tests', () => {
  before(() => {
    initializeDatabase()
  })

  test('createOrder validates input fields', async () => {
    const res1 = createMockResponse()
    await createOrder({ body: {} }, res1, () => {})
    assert.equal(res1.statusCode, 400)
    assert.ok(res1.body.error.includes('branch_id'))

    const res2 = createMockResponse()
    await createOrder({ body: { branch_id: 1, customer_phone: '' } }, res2, () => {})
    assert.equal(res2.statusCode, 400)
    assert.ok(res2.body.error.includes('customer_phone'))

    const res3 = createMockResponse()
    await createOrder({ body: { branch_id: 1, customer_phone: '0711000000', items: [] } }, res3, () => {})
    assert.equal(res3.statusCode, 400)
    assert.ok(res3.body.error.includes('item'))

    const res4 = createMockResponse()
    await createOrder({
      body: {
        branch_id: 1,
        customer_phone: '0711000000',
        items: [{ product_id: 1, quantity: 1 }],
        payment_mode: 'bitcoin',
      },
    }, res4, () => {})
    assert.equal(res4.statusCode, 400)
    assert.ok(res4.body.error.includes('payment_mode'))
  })

  test('createOrder rejects orders with insufficient stock without mutating inventory', async () => {
    // Get product 1 stock at branch 1
    const beforeStock = database.prepare(
      'SELECT stock_quantity FROM inventory WHERE branch_id = 1 AND product_id = 1',
    ).get().stock_quantity

    let caughtError = null
    const res = createMockResponse()
    await createOrder(
      {
        body: {
          branch_id: 1,
          customer_phone: '0700999888',
          items: [{ product_id: 1, quantity: beforeStock + 99999 }],
        },
      },
      res,
      (err) => {
        caughtError = err
      },
    )

    assert.ok(caughtError, 'Expected error passed to next')
    assert.ok(caughtError.message.includes('Not enough stock'))

    const afterStock = database.prepare(
      'SELECT stock_quantity FROM inventory WHERE branch_id = 1 AND product_id = 1',
    ).get().stock_quantity
    assert.equal(afterStock, beforeStock, 'Stock must remain unchanged after rejected order')
  })

  test('createOrder succeeds, decrements inventory, creates order, items, and pending payment', async () => {
    const beforeStock = database.prepare(
      'SELECT stock_quantity FROM inventory WHERE branch_id = 1 AND product_id = 1',
    ).get().stock_quantity

    const res = createMockResponse()
    const testPhone = `07${Date.now().toString().slice(-8)}`

    await createOrder(
      {
        body: {
          branch_id: 1,
          customer_name: 'Test Customer',
          customer_phone: testPhone,
          items: [{ product_id: 1, quantity: 1 }],
          payment_mode: 'mpesa',
        },
      },
      res,
      (err) => {
        if (err) throw err
      },
    )

    assert.equal(res.statusCode, 201)
    assert.ok(res.body.receipt_no.startsWith('RCP-'))
    assert.equal(res.body.payment_status, 'pending')

    // Stock must be decremented by 1
    const afterStock = database.prepare(
      'SELECT stock_quantity FROM inventory WHERE branch_id = 1 AND product_id = 1',
    ).get().stock_quantity
    assert.equal(afterStock, beforeStock - 1)

    // Verify order in database
    const orderInDb = database.prepare('SELECT * FROM orders WHERE receipt_no = ?').get(res.body.receipt_no)
    assert.ok(orderInDb)
    assert.equal(orderInDb.payment_status, 'pending')

    // Verify payment in database
    const paymentInDb = database.prepare('SELECT * FROM payments WHERE order_id = ?').get(orderInDb.order_id)
    assert.ok(paymentInDb)
    assert.equal(paymentInDb.payment_mode, 'mpesa')
    assert.equal(paymentInDb.payment_status, 'pending')

    // Test getOrderByReceipt
    const receiptRes = createMockResponse()
    await getOrderByReceipt({ params: { receiptNo: res.body.receipt_no } }, receiptRes, (e) => { if (e) throw e })
    assert.equal(receiptRes.statusCode, 200)
    assert.equal(receiptRes.body.order.receipt_no, res.body.receipt_no)
    assert.equal(receiptRes.body.items.length, 1)
    assert.ok(receiptRes.body.payment)

    // Test createStkPush
    const stkRes = createMockResponse()
    await createStkPush(
      { body: { receipt_no: res.body.receipt_no, payment_mode: 'mpesa' } },
      stkRes,
      (e) => { if (e) throw e },
    )
    assert.equal(stkRes.statusCode, 202)
    assert.ok(stkRes.body.transaction_ref.startsWith('MPESA-'))

    // Test handlePaymentCallback completed
    const cbRes = createMockResponse()
    await handlePaymentCallback(
      {
        body: {
          receipt_no: res.body.receipt_no,
          status: 'completed',
          transaction_ref: 'MPESA-TX-12345',
        },
      },
      cbRes,
      (e) => { if (e) throw e },
    )
    assert.equal(cbRes.statusCode, 200)
    assert.equal(cbRes.body.order_status, 'completed')
    assert.equal(cbRes.body.payment_status, 'paid')

    // Check database reflects paid status
    const updatedOrder = database.prepare('SELECT payment_status FROM orders WHERE receipt_no = ?').get(res.body.receipt_no)
    assert.equal(updatedOrder.payment_status, 'completed')
  })

  test('getOrders aggregates revenue and order metrics', async () => {
    const res = createMockResponse()
    await getOrders({ query: { branch_id: 1, limit: 5 } }, res, (e) => { if (e) throw e })
    assert.equal(res.statusCode, 200)
    assert.equal(typeof res.body.total_revenue, 'number')
    assert.equal(typeof res.body.total_orders, 'number')
    assert.equal(typeof res.body.daily_revenue, 'number')
    assert.ok(Array.isArray(res.body.orders))
  })

  test('restockInventory validates source and quantities', async () => {
    const res1 = createMockResponse()
    await restockInventory({ body: { branch_id: 1, product_id: 1, quantity: 10, source: 'invalid_source' } }, res1, () => {})
    assert.equal(res1.statusCode, 400)
    assert.ok(res1.body.error.includes('source'))

    const res2 = createMockResponse()
    await restockInventory({ body: { branch_id: 1, product_id: 1, quantity: -5, source: 'harvested' } }, res2, () => {})
    assert.equal(res2.statusCode, 400)
    assert.ok(res2.body.error.includes('quantity'))
  })

  test('restockInventory increases stock and logs into stock_intake', async () => {
    const beforeStock = database.prepare(
      'SELECT stock_quantity FROM inventory WHERE branch_id = 1 AND product_id = 2',
    ).get().stock_quantity

    const res = createMockResponse()
    await restockInventory(
      {
        body: {
          branch_id: 1,
          product_id: 2,
          quantity: 15,
          source: 'harvested',
        },
      },
      res,
      (e) => { if (e) throw e },
    )

    assert.equal(res.statusCode, 201)
    assert.ok(res.body.inventory)
    assert.equal(res.body.inventory.stock_quantity, beforeStock + 15)

    // Check stock_intake row
    const latestIntake = database.prepare(
      'SELECT * FROM stock_intake WHERE branch_id = 1 AND product_id = 2 ORDER BY intake_id DESC LIMIT 1',
    ).get()
    assert.ok(latestIntake)
    assert.equal(latestIntake.quantity, 15)
    assert.equal(latestIntake.source, 'harvested')
  })
})
