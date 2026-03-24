-- Migration: Add enterprise subscription management fields
-- [enterprise] Payment failure tracking (dunning) and seat over-limit detection

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT,
ADD COLUMN IF NOT EXISTS requires_seat_reduction BOOLEAN DEFAULT FALSE;
