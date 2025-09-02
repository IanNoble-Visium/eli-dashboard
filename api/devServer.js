import express from 'express'
import dotenv from 'dotenv'

// Load environment variables from repository root .env
dotenv.config()

// Import serverless handlers (default exports: (req, res) => ...)
import apiIndex from './index.js'

// Dashboard
import health from './dashboard/health.js'
import metrics from './dashboard/metrics.js'
import timeline from './dashboard/timeline.js'
import graph from './dashboard/graph.js'

// Events
import eventsIndex from './events/index.js'
import eventById from './events/[id].js'
import eventTypes from './events/types.js'
import eventCameras from './events/cameras.js'
import eventGeo from './events/geo.js'

// Snapshots
import snapshotsIndex from './snapshots/index.js'
import snapshotById from './snapshots/[id].js'
import snapshotTypes from './snapshots/types.js'

// Users
import usersIndex from './users/index.js'
import userById from './users/[id].js'

const app = express()
// Basic process-level error logging to avoid silent crashes in dev
process.on('unhandledRejection', (reason) => {
  console.error('[dev:api] Unhandled Rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[dev:api] Uncaught Exception:', err)
})

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.warn('[dev:api] Warning: POSTGRES_URL/DATABASE_URL is not set. API will run but DB-backed endpoints will return 500.')
}



// Body parsers
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Helper: wrap handler to merge route params into req.query when needed
function withParamToQuery(paramName, handler) {
  return (req, res) => {
    if (req.params && req.params[paramName] !== undefined) {
      // Ensure req.query exists and copy param -> query
      req.query = { ...(req.query || {}), [paramName]: req.params[paramName] }
    }
    return handler(req, res)
  }
}

// Root API index
app.all('/api', apiIndex)
app.all('/api/', apiIndex)

// Dashboard routes
app.all('/api/dashboard/health', health)
app.all('/api/dashboard/metrics', metrics)
app.all('/api/dashboard/timeline', timeline)
app.all('/api/dashboard/graph', graph)

// Events routes
app.all('/api/events', eventsIndex)
app.all('/api/events/types', eventTypes)
app.all('/api/events/cameras', eventCameras)
app.all('/api/events/geo', eventGeo)
app.all('/api/events/:id', withParamToQuery('id', eventById))

// Snapshots routes
app.all('/api/snapshots', snapshotsIndex)
app.all('/api/snapshots/types', snapshotTypes)
app.all('/api/snapshots/:id', withParamToQuery('id', snapshotById))

// Users routes
app.all('/api/users', usersIndex)
app.all('/api/users/:id', withParamToQuery('id', userById))

// 404 for unmatched routes (keep last)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path })
})

const PORT = process.env.PORT || 5001
app.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`)
})

