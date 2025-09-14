export default async function handler(req, res) {
  // Deprecated: AI enqueue moved to @ELI-DEMO webhook via Pub/Sub
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  return res.status(410).json({ error: 'AI enqueue moved: handled by @ELI-DEMO /webhook/irex -> Pub/Sub' })
}

