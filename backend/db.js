import 'dotenv/config'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const backendDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(backendDirectory, '..')
const databasePath = resolve(
  projectRoot,
  process.env.DB_PATH || 'backend/data/agri_choice.sqlite',
)

// SQLite is a database stored in a local file, so no database server or password
// is needed. Create the folder before opening the file for the first time.
mkdirSync(dirname(databasePath), { recursive: true })

export const database = new DatabaseSync(databasePath)

// Enforce foreign keys and wait briefly if another local connection is writing.
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
`)

export function initializeDatabase() {
  const schema = readFileSync(resolve(projectRoot, 'schema.sql'), 'utf8')
  const seed = readFileSync(resolve(projectRoot, 'seed.sql'), 'utf8')

  // Both SQL files are safe to run on each start: tables use IF NOT EXISTS,
  // and the seed only adds missing stock instead of resetting it.
  database.exec(schema)
  database.exec(seed)

  console.log(`SQLite database ready at ${databasePath}`)
}
