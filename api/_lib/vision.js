import { PredictionServiceClient } from '@google-cloud/aiplatform'

// Vertex Vision helper built on Vertex AI Publisher Image Models
// Uses the same env pattern as _lib/vertex.js
// Required env: GOOGLE_PROJECT_ID, optional: GOOGLE_LOCATION (default us-central1)
// Optional: GOOGLE_SERVICE_ACCOUNT_JSON for explicit credentials

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID
const LOCATION = process.env.GOOGLE_LOCATION || 'us-central1'

function isConfigured() {
  return Boolean(PROJECT_ID && LOCATION)
}

let predictionClient

function getClient() {
  if (!predictionClient) {
    const clientOptions = { apiEndpoint: `${LOCATION}-aiplatform.googleapis.com` }
    // Allow explicit credentials via GOOGLE_SERVICE_ACCOUNT_JSON
    const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (saJson) {
      try {
        const credentials = JSON.parse(saJson)
        predictionClient = new PredictionServiceClient({ ...clientOptions, credentials })
      } catch (e) {
        console.warn('[vision] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON, falling back to ADC')
        predictionClient = new PredictionServiceClient(clientOptions)
      }
    } else {
      predictionClient = new PredictionServiceClient(clientOptions)
    }
  }
  return predictionClient
}

async function fetchImageAsBase64(url) {
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`[vision] Failed to fetch image: ${resp.status} ${resp.statusText}`)
  }
  const ab = await resp.arrayBuffer()
  const base64 = Buffer.from(ab).toString('base64')
  return base64
}

function normalizeBbox(bboxArr) {
  // Vertex publisher model commonly returns [yMin, xMin, yMax, xMax] in normalized coords
  if (!Array.isArray(bboxArr) || bboxArr.length < 4) return null
  const [a, b, c, d] = bboxArr
  // Heuristic: if the second value is smaller than the first, assume [xMin,yMin,xMax,yMax]
  // Default to [yMin,xMin,yMax,xMax]
  let yMin, xMin, yMax, xMax
  if (a <= c && b <= d) {
    // Could be either; assume [yMin, xMin, yMax, xMax]
    yMin = a; xMin = b; yMax = c; xMax = d
  } else {
    // Fallback assume [xMin, yMin, xMax, yMax]
    xMin = a; yMin = b; xMax = c; yMax = d
  }
  const w = Math.max(0, xMax - xMin)
  const h = Math.max(0, yMax - yMin)
  return { x: xMin, y: yMin, w, h, normalized: true }
}

function mapLabelToType(label) {
  const l = String(label || '').toLowerCase()
  if (!l) return 'object'
  if (l.includes('person') || l.includes('people') || l.includes('pedestrian')) return 'person'
  if (l.includes('car') || l.includes('vehicle') || l.includes('truck') || l.includes('bus') || l.includes('van') || l.includes('motorcycle') || l.includes('bicycle')) return 'vehicle'
  if (l.includes('bag') || l.includes('backpack') || l.includes('luggage')) return 'object'
  if (l.includes('weapon') || l.includes('gun') || l.includes('knife')) return 'weapon'
  return l
}

async function predictObjectDetection({ imageBase64, confidenceThreshold = 0.3, maxPredictions = 50 }) {
  const client = getClient()
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/image-object-detection`
  const instances = [{ content: imageBase64 }]
  const parameters = { confidenceThreshold, maxPredictions }
  const [response] = await client.predict({ endpoint, instances, parameters })
  const preds = (response?.predictions || []).map(p => JSON.parse(JSON.stringify(p)))

  const detections = []
  for (const p of preds) {
    const names = p.displayNames || p.display_names || []
    const scores = p.confidences || p.confidence || []
    const boxes = p.bboxes || p.bounding_boxes || []
    for (let i = 0; i < Math.min(names.length, scores.length, boxes.length); i++) {
      const label = names[i]
      const score = Number(scores[i])
      const bbox = normalizeBbox(boxes[i])
      detections.push({ type: mapLabelToType(label), label, score, bbox, meta: { model: 'vertex-image-object-detection' } })
    }
  }
  return detections
}

async function predictClassification({ imageBase64, maxPredictions = 5 }) {
  const client = getClient()
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/image-classification`
  const instances = [{ content: imageBase64 }]
  const parameters = { maxPredictions }
  const [response] = await client.predict({ endpoint, instances, parameters })
  const preds = (response?.predictions || []).map(p => JSON.parse(JSON.stringify(p)))

  const detections = []
  for (const p of preds) {
    const names = p.displayNames || p.display_names || []
    const scores = p.confidences || p.confidence || []
    for (let i = 0; i < Math.min(names.length, scores.length); i++) {
      const label = names[i]
      const score = Number(scores[i])
      detections.push({ type: mapLabelToType(label), label, score, meta: { model: 'vertex-image-classification' } })
    }
  }
  return detections
}

export async function runImageModel(imageUrl, opts = {}) {
  if (!isConfigured()) {
    console.warn('[vision] Not configured; returning empty detections')
    return []
  }
  try {
    const imageBase64 = await fetchImageAsBase64(imageUrl)
    // Try object detection first
    const dets = await predictObjectDetection({ imageBase64, confidenceThreshold: opts.confidenceThreshold ?? 0.3 })
    if (dets && dets.length) return dets
    // Fallback to classification if no boxes returned
    const cls = await predictClassification({ imageBase64 })
    return cls
  } catch (e) {
    console.error('[vision] runImageModel error', e)
    return []
  }
}

export { isConfigured as isVisionConfigured }

