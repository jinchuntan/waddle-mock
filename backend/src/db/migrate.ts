import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations')

  // Ensure the tracking table exists before querying it
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `)

  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [file],
    )
    if (rows.length > 0) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    await pool.query(sql)
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])

    console.log(`[migrate] applied: ${file}`)
  }
}

// Allow running directly: tsx src/db/migrate.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('[migrate] all migrations up to date')
      process.exit(0)
    })
    .catch(err => {
      console.error('[migrate] failed:', err)
      process.exit(1)
    })
}
