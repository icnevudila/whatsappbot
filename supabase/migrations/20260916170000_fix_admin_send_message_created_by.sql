-- Fix admin_send_message to include created_by for worker job security
CREATE OR REPLACE FUNCTION public.admin_send_message(
  p_account_id uuid,
  p_phone_e164 text,
  p_body text,
  p_media_url text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $
DECLARE
  v_org_id uuid;
  v_created_by uuid;
  v_job_id bigint;
  v_phone text := trim(p_phone_e164);
  v_msg_type text := 'text';
BEGIN
  IF v_phone IS NULL OR length(v_phone) < 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gecersiz telefon numarasi.');
  END IF;

  IF NOT v_phone LIKE '+%' THEN
    v_phone := '+' || v_phone;
  END IF;

  SELECT org_id, created_by INTO v_org_id, v_created_by
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Secilen WhatsApp hatti bulunamadi.');
  END IF;

  IF v_created_by IS NULL THEN
    SELECT user_id INTO v_created_by
    FROM public.organization_members
    WHERE org_id = v_org_id
    ORDER BY (role = 'owner') DESC, created_at ASC
    LIMIT 1;
  END IF;

  IF p_media_url IS NOT NULL AND length(trim(p_media_url)) > 4 THEN
    v_msg_type := 'image';
  END IF;

  INSERT INTO public.jobs (
    org_id,
    account_id,
    created_by,
    type,
    priority,
    payload,
    status
  )
  VALUES (
    v_org_id,
    p_account_id,
    v_created_by,
    'message.send',
    1,
    jsonb_build_object(
      'phone_e164', v_phone,
      'body', coalesce(p_body, ''),
      'media_url', p_media_url,
      'message_type', v_msg_type
    ),
    'pending'
  )
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'jobId', v_job_id,
    'message', 'Mesaj aninda gonderim kuyruguna alindi (Oncelik: 1)'
  );
END;
$;

GRANT EXECUTE ON FUNCTION public.admin_send_message(uuid, text, text, text) TO anon, authenticated;
