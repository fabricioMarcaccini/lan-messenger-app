-- Migration: Add cancel_at_period_end and current_period_end fields
-- [audit-fix] Add fields to track cancellation state and subscription end date properly

-- Ensure you connect to the correct database before running this
-- \c lanmessenger

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
