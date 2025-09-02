// Optional: simple index to confirm API is live
module.exports = function handler(req, res) {
  res.json({ ok: true, service: 'ELI Dashboard Node API', time: new Date().toISOString() })
}

