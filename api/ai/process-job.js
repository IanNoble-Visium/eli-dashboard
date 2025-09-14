export default async function handler(req, res) {
  // Deprecated: AI processing moved to @ELI-DEMO ingestion worker (Pub/Sub + Cloud Run)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  return res.status(410).json({ error: 'AI processing moved: use Pub/Sub -> @ELI-DEMO /ai/worker/pubsub' })
}

