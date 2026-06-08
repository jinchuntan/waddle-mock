// Cross-platform copy of SQL migration files into the compiled dist/ output.
// Replaces the previous `mkdir -p && cp` shell step, which only worked on
// Unix and broke local builds on Windows.
import { mkdirSync, readdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', 'src', 'db', 'migrations')
const destDir = join(here, '..', 'dist', 'db', 'migrations')

mkdirSync(destDir, { recursive: true })

let copied = 0
for (const file of readdirSync(srcDir)) {
  if (file.endsWith('.sql')) {
    copyFileSync(join(srcDir, file), join(destDir, file))
    copied++
  }
}

console.log(`[build] copied ${copied} migration file(s) to dist/db/migrations`)
