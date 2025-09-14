import { query } from '../_lib/db.js'

// Simple Server-Sent Events endpoint streaming recent anomalies
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')

  let alive = true
  req.on('close', () => { alive = false })

  let lastTs = Date.now() - 60_000 // start with last 1 minute

  async function loop() {
    while (alive) {
      try {
        const r = await query(
          `SELECT id, metric, entity_type, entity_id, value, score, threshold, window, context, ts
           FROM ai_anomalies WHERE ts > $1 ORDER BY ts ASC LIMIT 50`,
          [lastTs]
        )
        if (r.rows?.length) {
          lastTs = r.rows[r.rows.length - 1].ts
          res.write(`data: ${JSON.stringify({ anomalies: r.rows })}\n\n`)
        }
      } catch (e) {
        console.error('[ai/stream] poll error', e)
      }
      // Small delay to avoid tight loop
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  loop()
}

