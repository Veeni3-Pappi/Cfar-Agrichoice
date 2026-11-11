import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

// A pool reuses database connections instead of opening a new one for every request.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error)
})
