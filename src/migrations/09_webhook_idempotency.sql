-- Migration: Add webhook idempotency tracking
-- Created: 2025-12-04

-- Create table to track processed webhooks
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at);

-- Auto-delete old webhook events after 7 days (cleanup)
-- This prevents table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM webhook_events
    WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$;

COMMENT ON TABLE webhook_events IS 'Tracks processed webhook events to prevent duplicate processing (idempotency)';
COMMENT ON COLUMN webhook_events.event_id IS 'Unique identifier from the webhook provider (e.g., Square order ID)';
COMMENT ON COLUMN webhook_events.event_type IS 'Type of webhook event (e.g., order.created)';
