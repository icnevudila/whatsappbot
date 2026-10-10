-- Atomic, service-only publication of the exact explicitly reviewed revision.
create or replace function public.approve_creative_video_review(
 p_org uuid, p_creative uuid, p_output uuid, p_sha text,
 p_updated timestamptz, p_reviewer uuid
) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.creatives%rowtype; o public.ai_media_outputs%rowtype; j public.ai_media_jobs%rowtype;
begin
 select * into c from public.creatives where id=p_creative and org_id=p_org for update;
 select * into o from public.ai_media_outputs where id=p_output and org_id=p_org for update;
 select * into j from public.ai_media_jobs where id=o.job_id and org_id=p_org for update;
 if not coalesce(c.id is not null and o.id is not null and j.id is not null
   and c.status='needs_review' and c.format='video' and c.updated_at=p_updated
   and c.public_url ~ ('/api/ai-media/outputs/' || p_output::text || '([?].*)?$')
   and (c.payload->'flowJob'->>'id')=j.id::text
   and j.state::text='NEEDS_REVIEW' and o.verified=true and o.is_approved=false
   and o.sha256=p_sha and p_sha ~ '^[a-fA-F0-9]{64}$' and o.byte_size>0
   and (nullif(o.storage_url,'') is not null or nullif(o.file_path,'') is not null)
   and o.width>=720 and o.height>=1280 and abs(o.width::numeric/nullif(o.height,0)-9.0/16)<=0.01
   and (case when to_jsonb(o)->>'product_type'='LONG_FORM_VIDEO_V1' then o.duration_seconds>=24
     else abs(o.duration_seconds-10)<=0.1 end),false) then return false; end if;
 update public.ai_media_outputs set is_approved=true where id=p_output and org_id=p_org;
 update public.creatives set status='ready', payload=coalesce(payload,'{}'::jsonb)||jsonb_build_object(
   'videoHumanReview',jsonb_build_object('reviewerId',p_reviewer,'reviewedAt',now(),
   'identityConfirmed',true,'commerceConfirmed',true,'source','CUSTOMER_EXPLICIT_REVIEW',
   'outputId',p_output,'jobId',j.id,'sha256',p_sha)) where id=p_creative and org_id=p_org;
 return true;
end $$;
revoke all on function public.approve_creative_video_review(uuid,uuid,uuid,text,timestamptz,uuid) from public;
grant execute on function public.approve_creative_video_review(uuid,uuid,uuid,text,timestamptz,uuid) to service_role;
