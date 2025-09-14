import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, getPgPool } from '../api/_lib/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function setupAiDb() {
  const sqlPath = path.join(__dirname, 'sql', 'ai-pg.sql')
  console.log('[setup-ai-db] Applying SQL from', sqlPath)
  const sql = fs.readFileSync(sqlPath, 'utf8')
  try {
    await query(sql)
    // Warm pool close for scripts
    await getPgPool().end?.()
    console.log('[setup-ai-db] Done')
  } catch (e) {
    console.error('[setup-ai-db] Failed', e)
    process.exitCode = 1
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupAiDb()
}

export { setupAiDb }

