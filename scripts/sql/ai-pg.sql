-- AI Analytics PostgreSQL Schema
-- Create tables if they do not exist; add minimal indexes for query patterns

BEGIN;

CREATE TABLE IF NOT EXISTS ai_inference_jobs (
  id BIGSERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,              -- 'event' | 'snapshot' | 'image' | 'property'
  source_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',  -- 'queued'|'processing'|'done'|'error'
  payload JSONB,
  error TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Prevent duplicate enqueues per source item
CREATE UNIQUE INDEX IF NOT EXISTS ai_jobs_source_unique ON ai_inference_jobs (source_type, source_id);

CREATE INDEX IF NOT EXISTS ai_inference_jobs_status_idx ON ai_inference_jobs (status);
CREATE INDEX IF NOT EXISTS ai_inference_jobs_created_idx ON ai_inference_jobs (created_at);

CREATE TABLE IF NOT EXISTS ai_detections (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT,
  channel_id TEXT,
  type TEXT NOT NULL,                     -- 'person'|'vehicle'|'weapon' etc.
  label TEXT,
  score REAL,
  bbox JSONB,                             -- {x,y,w,h}
  embedding BYTEA,                        -- optional: raw vector bytes; prefer pgvector if available
  meta JSONB,
  ts BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_detections_channel_ts_idx ON ai_detections (channel_id, ts);
CREATE INDEX IF NOT EXISTS ai_detections_event_idx ON ai_detections (event_id);

CREATE TABLE IF NOT EXISTS ai_anomalies (
  id BIGSERIAL PRIMARY KEY,
  metric TEXT NOT NULL,                   -- 'events_per_min', 'crowd_density', etc.
  entity_type TEXT,                       -- 'channel'|'area'|'topic'
  entity_id TEXT,
  value REAL NOT NULL,
  score REAL NOT NULL,                    -- anomaly score (e.g., z-score)
  threshold REAL,
  window JSONB,                           -- {start,end}
  context JSONB,
  ts BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_anomalies_entity_ts_idx ON ai_anomalies (entity_type, entity_id, ts);
CREATE INDEX IF NOT EXISTS ai_anomalies_metric_ts_idx ON ai_anomalies (metric, ts);

CREATE TABLE IF NOT EXISTS ai_baselines (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  features JSONB NOT NULL,                -- stats: rate per min, variance, seasonality
  updated_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_baselines_entity_unique ON ai_baselines (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS ai_insights (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,                    -- 'dashboard'|'channel'|'event'
  scope_id TEXT,
  summary TEXT NOT NULL,
  recommendations JSONB,
  context JSONB,
  ts BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_insights_scope_ts_idx ON ai_insights (scope, scope_id, ts);

COMMIT;
