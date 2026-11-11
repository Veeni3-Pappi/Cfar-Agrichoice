import 'dotenv/config'
import app from './app.js'
import { pool } from './db.js'

const port = Number(process.env.PORT) || 3000

async function startServer() {
  // Fail at startup if the database is unavailable; this is easier to diagnose
  // than allowing every catalog request to fail later.
  await pool.query('SELECT 1')

  app.listen(port, () => {
    console.log(`AgriChoice API is listening at http://localhost:${port}`)
  })
}

startServer().catch(async (error) => {
  console.error('Could not start the API. Check DATABASE_URL and PostgreSQL:', error)
  await pool.end()
  process.exitCode = 1
})
