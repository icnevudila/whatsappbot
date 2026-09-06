-- Org AI model tercihleri + maliyet kontrolü için.

alter table public.org_ai_keys
  add column if not exists openai_image_model text,
  add column if not exists openai_text_model text,
  add column if not exists gemini_image_model text,
  add column if not exists gemini_text_model text,
  add column if not exists preferred_image_provider text,
  add column if not exists preferred_text_provider text;

comment on column public.org_ai_keys.openai_image_model is 'Örn. dall-e-2, gpt-image-1.5';
comment on column public.org_ai_keys.preferred_image_provider is 'İlk denenecek görsel sağlayıcı: gemini|openai|cloudflare|pollinations';
