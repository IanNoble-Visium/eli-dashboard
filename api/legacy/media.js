import { withCors } from '../_lib/cors.js'
import { query } from '../_lib/db.js'

export default withCors(async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  try {
    // Original requested path without querystring, e.g. /api/v1/media/snapshot/274-610/3824.jpg or /api/snapshot/...
    const requestedPath = req.path

    // Try exact match on snapshots.path
    const exact = await query(
      'SELECT image_url, path FROM snapshots WHERE path = $1 LIMIT 1',
      [requestedPath]
    )

    let row = exact.rows && exact.rows[0]

    if (!row) {
      // Fallback 1: match by suffix after /api/v1/media/ or /api/snapshot/
      let suffix = requestedPath
      if (suffix.startsWith('/api/v1/media/')) {
        suffix = suffix.replace(/^\/api\/v1\/media\//, '')
      } else if (suffix.startsWith('/api/snapshot/')) {
        suffix = suffix.replace(/^\/api\/snapshot\//, 'snapshot/')
      }
      
      const likePattern = `%/${suffix}`
      const like = await query(
        'SELECT image_url, path FROM snapshots WHERE path LIKE $1 ORDER BY created_at DESC LIMIT 1',
        [likePattern]
      )
      row = like.rows && like.rows[0]
    }

    if (!row) {
      // Fallback 2: extract filename and match any path ending with it
      const filename = requestedPath.split('/').pop()?.split('?')[0]
      if (filename) {
        const filenamePattern = `%/${filename}`
        const filenameMatch = await query(
          'SELECT image_url, path FROM snapshots WHERE path LIKE $1 ORDER BY created_at DESC LIMIT 1',
          [filenamePattern]
        )
        row = filenameMatch.rows && filenameMatch.rows[0]
      }
    }

    const target = row?.image_url || row?.path
    if (target) {
      // Temporary redirect to the actual media URL
      return res.redirect(302, target)
    }

    return res.status(404).json({ error: 'Media not found', path: requestedPath })
  } catch (e) {
    console.error('legacy media proxy error', e)
    return res.status(500).json({ error: 'Failed to proxy media' })
  }
})


