-- Migration: 20260918133000_canli_takip_media_and_diagnostics.sql
-- Gelismis Canli Takip, Medya/PDF Gonderim ve Teshis Destegi

-- 1. admin_send_message fonksiyonunu PDF ve belge destegiyle guncelle
CREATE OR REPLACE FUNCTION public.admin_send_message(
  p_account_id uuid,
  p_phone_e164 text,
  p_body text,
  p_media_url text DEFAULT NULL::text,
  p_media_name text DEFAULT NULL::text,
  p_message_type text DEFAULT NULL::text
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
  v_msg_type text := coalesce(p_message_type, 'text');
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
    IF p_message_type IS NOT NULL AND p_message_type <> '' THEN
      v_msg_type := p_message_type;
    ELSIF lower(p_media_url) ~* '\.pdf(\?|$)' OR (p_media_name IS NOT NULL AND lower(p_media_name) ~* '\.pdf$') THEN
      v_msg_type := 'document';
    ELSE
      v_msg_type := 'image';
    END IF;
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
      'media_name', p_media_name,
      'message_type', v_msg_type
    ),
    'pending'
  )
  RETURNING id INTO v_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'jobId', v_job_id,
    'messageType', v_msg_type,
    'message', 'Mesaj aninda gonderim kuyruguna alindi (Oncelik: 1)'
  );
END;
$;

-- 2. get_canli_takip_feed fonksiyonunu m.error ve gelistirilmis limitlerle guncelle
CREATE OR REPLACE FUNCTION public.get_canli_takip_feed()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $
DECLARE
  v_today_iso timestamptz := date_trunc('day', now());
  v_accounts jsonb;
  v_worker jsonb;
  v_server_metrics jsonb;
  v_campaigns jsonb;
  v_targets jsonb;
  v_creatives jsonb;
  v_messages jsonb;
  v_ai_suggestions jsonb;
  v_auto_replies jsonb;
  v_jobs jsonb;
  v_list_requests jsonb;
  v_contact_lists jsonb;
  v_recent_contacts jsonb;
  v_blacklist jsonb;
  v_organizations jsonb;
  v_inbound_count int;
  v_outbound_count int;
  v_queued_count int;
  v_pending_jobs int;
  v_failed_jobs int;
  v_running_campaigns int;
  v_total_contacts bigint;
  v_valid_contacts bigint;
  v_total_organizations int;
  v_total_contact_lists int;
  v_pending_data_requests int;
  v_blacklisted_count int;
  v_connected_accounts int;
  v_total_accounts int;
  v_total_ai_suggestions int;
  v_total_auto_replies int;
BEGIN
  -- 1. Hatlar
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_accounts
  FROM (
    SELECT 
      a.id, a.label, a.phone_e164, a.status, a.status_detail, 
      a.is_locked, a.enabled, a.last_seen_at, a.org_id,
      coalesce(o.name, 'Genel') as org_name
    FROM public.accounts a
    LEFT JOIN public.organizations o ON o.id = a.org_id
    ORDER BY a.label ASC
  ) sub;

  -- 2. Worker / Baileys Heartbeat
  BEGIN
    SELECT to_jsonb(sub) INTO v_worker
    FROM (
      SELECT worker_id, max_sessions, tracked, live, db_pool_max, seen_at, meta
      FROM wa.worker_heartbeat
      ORDER BY seen_at DESC
      LIMIT 1
    ) sub;
  EXCEPTION WHEN OTHERS THEN
    v_worker := null;
  END;

  -- 2b. Canli Sunucu Telemetrisi (RAM / CPU / Disk / Docker)
  BEGIN
    SELECT to_jsonb(sub) INTO v_server_metrics
    FROM (
      SELECT 
        id, cpu_percent, cpu_cores, load_1m, load_5m, load_15m,
        ram_total_mb, ram_used_mb, ram_free_mb, ram_percent,
        disk_total_gb, disk_used_gb, disk_percent, containers,
        uptime_text, updated_at
      FROM public.server_metrics
      WHERE id = 'hetzner-main'
      LIMIT 1
    ) sub;
  EXCEPTION WHEN OTHERS THEN
    v_server_metrics := null;
  END;

  -- 3. Kampanyalar
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_campaigns
  FROM (
    SELECT 
      c.id, c.name, c.status, c.message_type, c.body, 
      c.total_targets, c.sent_count, c.failed_count, c.skipped_count,
      greatest(0, c.total_targets - (c.sent_count + c.failed_count + c.skipped_count)) as pending_count,
      CASE WHEN c.total_targets > 0 
        THEN round(((c.sent_count + c.failed_count + c.skipped_count)::numeric / c.total_targets::numeric) * 100)
        ELSE 0 
      END as progress_percent,
      c.created_at, c.started_at, c.paused_at, c.wait_reason, c.org_id,
      coalesce(o.name, '') as org_name
    FROM public.campaigns c
    LEFT JOIN public.organizations o ON o.id = c.org_id
    ORDER BY c.created_at DESC
    LIMIT 25
  ) sub;

  -- 4. Sirada Olan & Bekleyen Mesajlar
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_targets
  FROM (
    SELECT 
      ct.id, ct.campaign_id, coalesce(c.name, 'Genel Kampanya') as campaign_name,
      ct.phone_e164, ct.status, ct.personalized_body, ct.scheduled_for,
      ct.sent_at, ct.error, ct.created_at,
      coalesce(o.name, '') as org_name
    FROM public.campaign_targets ct
    LEFT JOIN public.campaigns c ON c.id = ct.campaign_id
    LEFT JOIN public.organizations o ON o.id = ct.org_id
    ORDER BY ct.created_at DESC
    LIMIT 80
  ) sub;

  -- 5. ChatGPT Gorsel & Icerik Uretim Sirasi
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_creatives
  FROM (
    SELECT 
      cr.id, coalesce(cr.title, 'Basliksiz Gorsel') as title, 
      cr.template, cr.format, cr.status, cr.public_url, 
      cr.error, cr.created_at, cr.source, cr.generation_type,
      cr.payload,
      coalesce(o.name, 'Genel') as org_name
    FROM public.creatives cr
    LEFT JOIN public.organizations o ON o.id = cr.org_id
    ORDER BY cr.created_at DESC
    LIMIT 35
  ) sub;

  -- 6. Veri Talepleri (list_requests)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_list_requests
  FROM (
    SELECT 
      lr.id, lr.kind, lr.status, lr.category, lr.address, 
      lr.locations, lr.contact_count, lr.radius_km, lr.nationwide,
      lr.created_at, lr.updated_at,
      coalesce(o.name, '') as org_name
    FROM public.list_requests lr
    LEFT JOIN public.organizations o ON o.id = lr.org_id
    ORDER BY lr.created_at DESC
    LIMIT 30
  ) sub;

  -- 7. Kisi Listeleri (contact_lists)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_contact_lists
  FROM (
    SELECT 
      cl.id, cl.name, cl.contact_count, cl.source, cl.created_at, cl.org_id,
      coalesce(o.name, 'Genel') as org_name
    FROM public.contact_lists cl
    LEFT JOIN public.organizations o ON o.id = cl.org_id
    ORDER BY cl.created_at DESC
    LIMIT 50
  ) sub;

  -- 7b. Son Kayitli Kisiler (contacts)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_recent_contacts
  FROM (
    SELECT 
      c.id, c.phone_e164, c.name, c.source, c.wa_status, c.created_at, c.org_id,
      coalesce(o.name, 'Genel') as org_name
    FROM public.contacts c
    LEFT JOIN public.organizations o ON o.id = c.org_id
    ORDER BY c.created_at DESC
    LIMIT 60
  ) sub;

  -- 8. Canli Mesaj Akisi (message_log - m.error eklendi, limit 150)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_messages
  FROM (
    SELECT 
      m.id, m.direction, m.phone_e164, m.push_name, m.message_type, 
      m.body, m.media_url, m.status, m.error, m.created_at, m.org_id,
      coalesce(o.name, 'Genel') as org_name
    FROM public.message_log m
    LEFT JOIN public.organizations o ON o.id = m.org_id
    ORDER BY m.created_at DESC
    LIMIT 150
  ) sub;

  -- 9. Gelen Mesaja Uretilen AI Yanit Onerileri (ai_reply_suggestion_library)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_ai_suggestions
  FROM (
    SELECT 
      s.id, s.incoming_sample, s.suggestions, s.source, s.hit_count, s.generated_count,
      s.created_at, s.last_used_at, s.org_id,
      coalesce(o.name, 'Genel') as org_name
    FROM public.ai_reply_suggestion_library s
    LEFT JOIN public.organizations o ON o.id = s.org_id
    ORDER BY s.created_at DESC
    LIMIT 80
  ) sub;

  -- 10. Otomatik Yanitlar (auto_reply_log)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_auto_replies
  FROM (
    SELECT 
      a.id, a.phone_e164, a.reply_body, a.source, a.created_at, a.org_id,
      coalesce(o.name, 'Genel') as org_name
    FROM public.auto_reply_log a
    LEFT JOIN public.organizations o ON o.id = a.org_id
    ORDER BY a.created_at DESC
    LIMIT 50
  ) sub;

  -- 11. Is Kuyrugu (jobs - limit 60)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_jobs
  FROM (
    SELECT 
      j.id, j.type, j.status, j.error, j.priority, 
      j.attempts, j.max_attempts, j.created_at, j.claimed_at as started_at, j.finished_at,
      j.payload, j.result,
      coalesce(o.name, '') as org_name
    FROM public.jobs j
    LEFT JOIN public.organizations o ON o.id = j.org_id
    ORDER BY j.created_at DESC
    LIMIT 60
  ) sub;

  -- 12. Kara Liste / Engellenen Numaralar (blacklist)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_blacklist
  FROM (
    SELECT 
      b.id, b.phone_e164, b.reason, b.created_at,
      coalesce(o.name, '') as org_name
    FROM public.blacklist b
    LEFT JOIN public.organizations o ON o.id = b.org_id
    ORDER BY b.created_at DESC
    LIMIT 50
  ) sub;

  -- 13. Organizasyonlar & Uyelikler (organizations)
  SELECT coalesce(jsonb_agg(sub), '[]'::jsonb) INTO v_organizations
  FROM (
    SELECT 
      o.id, 
      o.name, 
      o.slug, 
      coalesce(o.plan, 'free') as plan,
      coalesce(o.accounts_quota, 1) as accounts_quota,
      coalesce(o.monthly_message_quota, 1000) as monthly_message_quota,
      o.suspended_at,
      o.suspend_reason,
      o.phone_e164,
      o.created_at,
      count(DISTINCT om.user_id) as member_count,
      count(DISTINCT a.id) as account_count,
      count(DISTINCT CASE WHEN a.status = 'connected' THEN a.id END) as connected_account_count,
      count(DISTINCT c.id) as campaign_count,
      count(DISTINCT cl.id) as list_count,
      coalesce(sum(cl.contact_count), 0) as total_contacts
    FROM public.organizations o
    LEFT JOIN public.organization_members om ON om.org_id = o.id
    LEFT JOIN public.accounts a ON a.org_id = o.id
    LEFT JOIN public.campaigns c ON c.org_id = o.id
    LEFT JOIN public.contact_lists cl ON cl.org_id = o.id
    GROUP BY o.id, o.name, o.slug, o.plan, o.accounts_quota, o.monthly_message_quota, o.suspended_at, o.suspend_reason, o.phone_e164, o.created_at
    ORDER BY o.name ASC
  ) sub;

  -- 14. Sayaclar
  SELECT count(*) INTO v_inbound_count FROM public.message_log WHERE direction = 'in' AND created_at >= v_today_iso;
  SELECT count(*) INTO v_outbound_count FROM public.message_log WHERE direction = 'out' AND created_at >= v_today_iso;
  SELECT count(*) INTO v_queued_count FROM public.campaign_targets WHERE status = 'queued';
  SELECT count(*) INTO v_pending_jobs FROM public.jobs WHERE status IN ('pending', 'claimed', 'running');
  SELECT count(*) INTO v_failed_jobs FROM public.jobs WHERE status = 'failed' AND created_at >= v_today_iso;
  SELECT count(*) INTO v_running_campaigns FROM public.campaigns WHERE status = 'running';
  SELECT count(*) INTO v_total_contacts FROM public.contacts;
  SELECT count(*) INTO v_valid_contacts FROM public.contacts WHERE wa_status = 'valid';
  SELECT count(*) INTO v_total_organizations FROM public.organizations;
  SELECT count(*) INTO v_total_contact_lists FROM public.contact_lists;
  SELECT count(*) INTO v_pending_data_requests FROM public.list_requests WHERE status = 'pending';
  SELECT count(*) INTO v_blacklisted_count FROM public.blacklist;
  SELECT count(*) INTO v_connected_accounts FROM public.accounts WHERE status = 'connected';
  SELECT count(*) INTO v_total_accounts FROM public.accounts;
  SELECT count(*) INTO v_total_ai_suggestions FROM public.ai_reply_suggestion_library;
  SELECT count(*) INTO v_total_auto_replies FROM public.auto_reply_log;

  RETURN jsonb_build_object(
    'success', true,
    'accounts', v_accounts,
    'worker', v_worker,
    'serverMetrics', v_server_metrics,
    'campaigns', v_campaigns,
    'targets', v_targets,
    'creatives', v_creatives,
    'listRequests', v_list_requests,
    'contactLists', v_contact_lists,
    'recentContacts', v_recent_contacts,
    'messages', v_messages,
    'aiSuggestions', v_ai_suggestions,
    'autoReplies', v_auto_replies,
    'jobs', v_jobs,
    'blacklist', v_blacklist,
    'organizations', v_organizations,
    'summary', jsonb_build_object(
      'todayInbound', v_inbound_count,
      'todayOutbound', v_outbound_count,
      'queuedMessages', v_queued_count,
      'pendingJobs', v_pending_jobs,
      'failedJobs', v_failed_jobs,
      'activeCampaigns', v_running_campaigns,
      'totalContacts', v_total_contacts,
      'validContacts', v_valid_contacts,
      'totalOrganizations', v_total_organizations,
      'totalContactLists', v_total_contact_lists,
      'pendingDataRequests', v_pending_data_requests,
      'blacklistedCount', v_blacklisted_count,
      'connectedAccounts', v_connected_accounts,
      'totalAccounts', v_total_accounts,
      'totalAiSuggestions', v_total_ai_suggestions,
      'totalAutoReplies', v_total_auto_replies
    ),
    'timestamp', now()
  );
END;
$;
