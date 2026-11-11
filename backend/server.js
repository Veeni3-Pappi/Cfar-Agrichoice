import 'dotenv/config'
import app from './app.js'
import { database, initializeDatabase } from './db.js'

const port = Number(process.env.PORT) || 3000

function startServer() {
  initializeDatabase()
  app.listen(port, () => {
    console.log(`AgriChoice API is listening at http://localhost:${port}`)
  })
}

try {
  startServer()
} catch (error) {
  console.error('Could not start the API and initialize SQLite:', error)
  database.close()
  process.exitCode = 1
}
