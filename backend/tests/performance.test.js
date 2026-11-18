import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import app from '../app.js'
import { database, initializeDatabase } from '../db.js'

let server
let baseUrl

function calculatePercentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

describe('AgriChoice Performance & Concurrency Tests', () => {
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

  test('Database query throughput (200 prepared statement executions)', () => {
    const start = performance.now()
    const stmt = database.prepare(
      `SELECT p.product_id, p.product_name, i.stock_quantity
       FROM products p
       JOIN inventory i ON i.product_id = p.product_id
       WHERE i.branch_id = ?`,
    )

    const iterations = 200
    for (let i = 0; i < iterations; i++) {
      const branchId = (i % 3) + 1
      stmt.all(branchId)
    }

    const duration = performance.now() - start
    const qps = (iterations / (duration / 1000)).toFixed(0)
    console.log(`\n  ⚡ Database Throughput: ${iterations} queries in ${duration.toFixed(2)}ms (~${qps} queries/sec)`)

    assert.ok(duration < 1000, `Database queries too slow: ${duration}ms`)
  })

  test('API Endpoint Latency Benchmark (50 sequential requests per endpoint)', async () => {
    const endpoints = [
      '/health',
      '/branches',
      '/products?branch_id=1',
      '/inventory/1',
    ]

    console.log('\n  ⚡ API Endpoint Latency Metrics:')

    for (const ep of endpoints) {
      const latencies = []
      const iterations = 50

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        const res = await fetch(`${baseUrl}${ep}`)
        const elapsed = performance.now() - start
        assert.equal(res.status, 200)
        latencies.push(elapsed)
      }

      const min = Math.min(...latencies).toFixed(2)
      const max = Math.max(...latencies).toFixed(2)
      const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
      const p95 = calculatePercentile(latencies, 95).toFixed(2)

      console.log(`    Route: ${ep.padEnd(25)} | Avg: ${avg.padStart(6)}ms | P95: ${p95.padStart(6)}ms | Min: ${min.padStart(6)}ms | Max: ${max.padStart(6)}ms`)
      assert.ok(Number(avg) < 50, `Average latency for ${ep} exceeds threshold: ${avg}ms`)
    }
  })

  test('Concurrent read load (20 parallel requests to mixed endpoints)', async () => {
    const endpoints = [
      '/branches',
      '/products?branch_id=1',
      '/products?category=dragonfruit',
      '/inventory/1',
      '/health',
    ]

    const start = performance.now()
    const requests = Array.from({ length: 20 }, (_, idx) => {
      const ep = endpoints[idx % endpoints.length]
      return fetch(`${baseUrl}${ep}`).then(async (res) => {
        assert.equal(res.status, 200)
        return res.json()
      })
    })

    const results = await Promise.all(requests)
    const duration = performance.now() - start

    assert.equal(results.length, 20)
    console.log(`  ⚡ Concurrency: 20 parallel requests resolved in ${duration.toFixed(2)}ms`)
    assert.ok(duration < 1500, `Concurrent requests took too long: ${duration}ms`)
  })
})
