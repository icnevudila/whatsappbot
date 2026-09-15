-- AI auto-reply support in auto_reply_log
ALTER TABLE public.auto_reply_log ALTER COLUMN rule_id DROP NOT NULL;
ALTER TABLE public.auto_reply_log ADD COLUMN IF NOT EXISTS source text DEFAULT 'rule';
ALTER TABLE public.auto_reply_log ADD COLUMN IF NOT EXISTS reply_body text;
