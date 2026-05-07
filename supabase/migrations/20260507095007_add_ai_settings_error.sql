-- Add error-tracking columns to ai_settings.
-- last_error: the OpenAI error message from the most recent failed call.
-- last_error_at: when that error occurred.
-- Both are NULL when AI is working normally.
ALTER TABLE ai_settings
  ADD COLUMN IF NOT EXISTS last_error    text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz;
