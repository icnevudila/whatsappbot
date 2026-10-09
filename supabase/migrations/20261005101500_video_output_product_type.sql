-- Playback routes distinguish short final masters from long-form outputs.
-- Complete the missing output discriminator without changing stored artifacts.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.ai_media_outputs
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'SHORT_FORM_VIDEO';
NOTIFY pgrst, 'reload schema';
COMMIT;
