import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import app from '../app.js'
import { initializeDatabase } from '../db.js'

let server
let baseUrl

describe('AgriChoice API Route Integration Tests', () => {
  before(async () => {
    initializeDatabase()
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port
        baseUrl = `http://127.0.0.1:${port}/api`
        resolve()
      })
    })
  })

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  test('GET /health returns status: ok', async () => {
    const res = await fetch(`${baseUrl}/health`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.deepEqual(data, { status: 'ok' })
  })

  test('GET /branches returns active branch list', async () => {
    const res = await fetch(`${baseUrl}/branches`)
    assert.equal(res.status, 200)
    const branches = await res.json()
    assert.ok(Array.isArray(branches))
    assert.ok(branches.length >= 3)
    const branch = branches[0]
    assert.ok('branch_id' in branch)
    assert.ok('branch_name' in branch)
    assert.ok('location' in branch)
  })

  test('GET /products returns product catalog', async () => {
    const res = await fetch(`${baseUrl}/products`)
    assert.equal(res.status, 200)
    const products = await res.json()
    assert.ok(Array.isArray(products))
    assert.ok(products.length >= 4)
    const prod = products[0]
    assert.ok('product_id' in prod)
    assert.ok('product_name' in prod)
    assert.ok('unit_price' in prod)
  })

  test('GET /products with branch_id returns stock information', async () => {
    const res = await fetch(`${baseUrl}/products?branch_id=1`)
    assert.equal(res.status, 200)
    const products = await res.json()
    assert.ok(products.length > 0)
    assert.ok('stock_quantity' in products[0])
  })

  test('GET /products with valid category filter returns matching products', async () => {
    const res = await fetch(`${baseUrl}/products?category=dragonfruit`)
    assert.equal(res.status, 200)
    const products = await res.json()
    assert.ok(products.length > 0)
    for (const p of products) {
      assert.equal(p.product_type, 'dragonfruit')
    }
  })

  test('GET /products with invalid category returns 400', async () => {
    const res = await fetch(`${baseUrl}/products?category=unknown_fruit`)
    assert.equal(res.status, 400)
    const data = await res.json()
    assert.ok(data.error.includes('category'))
  })

  test('GET /products with invalid branch_id returns 400', async () => {
    const res = await fetch(`${baseUrl}/products?branch_id=not_a_number`)
    assert.equal(res.status, 400)
    const data = await res.json()
    assert.ok(data.error.includes('branch_id'))
  })

  test('GET /inventory/:branchId returns branch inventory and low stock indicators', async () => {
    const res = await fetch(`${baseUrl}/inventory/1`)
    assert.equal(res.status, 200)
    const data = await res.json()
    assert.ok(data.branch)
    assert.equal(data.branch.branch_id, 1)
    assert.ok(Array.isArray(data.inventory))
    assert.ok(data.inventory.length > 0)
    assert.equal(typeof data.inventory[0].is_low_stock, 'boolean')
  })

  test('GET /inventory/:branchId returns 404 for nonexistent branch', async () => {
    const res = await fetch(`${baseUrl}/inventory/9999`)
    assert.equal(res.status, 404)
    const data = await res.json()
    assert.equal(data.error, 'Branch not found.')
  })

  test('GET /inventory/:branchId returns 400 for negative or invalid branch ID', async () => {
    const res = await fetch(`${baseUrl}/inventory/-5`)
    assert.equal(res.status, 400)
    const data = await res.json()
    assert.ok(data.error.includes('Branch ID'))
  })

  test('GET /orders/:receiptNo returns 404 for unknown receipt', async () => {
    const res = await fetch(`${baseUrl}/orders/RCP-NON-EXISTENT`)
    assert.equal(res.status, 404)
    const data = await res.json()
    assert.equal(data.error, 'Order not found.')
  })

  test('Protected routes reject requests without Bearer token with 401', async () => {
    const protectedRoutes = [
      { method: 'GET', url: `${baseUrl}/orders` },
      { method: 'POST', url: `${baseUrl}/orders`, body: {} },
      { method: 'POST', url: `${baseUrl}/inventory/restock`, body: {} },
      { method: 'POST', url: `${baseUrl}/payments/stk-push`, body: {} },
      { method: 'POST', url: `${baseUrl}/payments/callback`, body: {} },
    ]

    for (const route of protectedRoutes) {
      const res = await fetch(route.url, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
        body: route.body ? JSON.stringify(route.body) : undefined,
      })
      assert.equal(res.status, 401, `Expected 401 for ${route.method} ${route.url}`)
      const data = await res.json()
      assert.equal(data.error, 'Missing Bearer token')
    }
  })

  test('Protected routes reject invalid Bearer tokens with 401', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      headers: { Authorization: 'Bearer definitely_invalid_token' },
    })
    assert.equal(res.status, 401)
    const data = await res.json()
    assert.equal(data.error, 'Invalid or expired token')
  })

  test('Unknown route returns 404 with structured JSON error', async () => {
    const res = await fetch(`${baseUrl}/unknown-nonexistent-route`)
    assert.equal(res.status, 404)
    const data = await res.json()
    assert.equal(data.error, 'The requested API route does not exist.')
  })
})
