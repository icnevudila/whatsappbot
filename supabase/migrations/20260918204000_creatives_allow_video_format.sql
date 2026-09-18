-- Allow 'video' in creatives_format_check
ALTER TABLE creatives DROP CONSTRAINT IF EXISTS creatives_format_check;
ALTER TABLE creatives ADD CONSTRAINT creatives_format_check 
  CHECK (format = ANY (ARRAY['story'::text, 'feed'::text, 'square'::text, 'banner'::text, 'video'::text]));
