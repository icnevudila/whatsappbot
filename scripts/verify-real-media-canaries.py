"""Verify downloaded Wizard canaries against the captured production receipts."""
import hashlib
import json
import struct
from datetime import datetime
from pathlib import Path

root = Path(__file__).resolve().parents[1]
evidence = root / 'artifacts/ai-media-real-2026-10-17'
snapshot = next(json.loads(line) for line in (evidence / 'final-db-receipts.log').read_text(encoding='utf-8-sig').splitlines() if line.startswith('{'))
files = {
    'a80011b8-4d01-5b96-af3a-ed8fb14be7e8': 'mesajify-canary.png',
    'ea575cb5-6300-59c4-a695-2315815bcb11': 'bofe-16l-canary.png',
    '696e94a6-59b7-5024-a768-09b0808d45ba': 'ayvaz-canary.png',
}
summary = []
for row in snapshot['creatives']:
    receipt = row['image_receipt']
    assert row['status'] == 'ready' and row['source'] == 'ai'
    assert receipt['creativeId'] == row['id'] and receipt['orgId'] == row['org_id']
    assert receipt['storagePath'] == row['storage_path']
    assert receipt['storagePath'].startswith(f"{row['org_id']}/{row['id']}/")
    assert receipt['jobId'] == row['last_image_job']['id']
    reference = receipt['referenceReceipt']
    assert reference['job_id'] == reference['conversation_owner_job_id'] == receipt['jobId']
    assert all(reference[k] == 2 for k in ['expected_reference_count', 'resolved_reference_count', 'uploaded_reference_count', 'composer_attachment_count'])
    data = (evidence / files[row['id']]).read_bytes()
    assert data[:8] == bytes.fromhex('89504e470d0a1a0a')
    assert struct.unpack('>II', data[16:24]) == (receipt['width'], receipt['height']) == (1254, 1254)
    assert len(data) == receipt['size']
    assert hashlib.sha256(data).hexdigest() == receipt['sha256']
    jobs = next(job for job in snapshot['render_jobs'] if job['creative_id'] == row['id'])
    assert jobs['render_job_count'] == 1 and jobs['statuses'] == ['done']
    duration = (datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00')) - datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))).total_seconds()
    summary.append({'creative_id': row['id'], 'org_id': row['org_id'], 'job_id': receipt['jobId'],
        'sha256': receipt['sha256'], 'bytes': len(data), 'width': 1254, 'height': 1254,
        'created_to_last_update_seconds': round(duration, 3), 'render_records': 1,
        'reference_count': 2, 'technical_receipt_result': 'PASS', 'visual_quality': 'NEEDS_REVIEW',
        'actual_provider_cost': None})
assert len(summary) == len({row['org_id'] for row in summary}) == 3
video = snapshot['video'][0]
assert video['state'] == 'FAILED' and video['error_message'] == 'Cannot find default execution context'
result = {'scope': 'three real image canaries, not the 3/5/10 concurrent matrix',
    'images': summary, 'video': video, 'production_acceptance': 'NO-GO', 'per_job_credit_settlement': 'UNRECONCILED'}
postdeploy = evidence / 'postdeploy-video-events.log'
if postdeploy.exists():
    observed = json.loads(postdeploy.read_text(encoding='utf-8-sig').strip())
    current = observed['job'][0]
    assert current['id'] == '32e6bfc8-a1ad-5eb1-a45e-2337acc02386'
    assert current['org_id'] == '2881f690-6853-4064-8768-307463ae6255'
    assert current['state'] == 'FAILED' and observed['outputs'] == []
    transitions = [event['to_state'] for event in observed['events']]
    assert all(state in transitions for state in ['LEASED', 'OPENING_PROJECT', 'INGREDIENTS_VERIFIED', 'GENERATING', 'FAILED'])
    generation = (evidence / 'postdeploy-generation.log').read_text(encoding='utf-8')
    assert '"migrated.submit_observed"' in generation and '"status": 4' in generation
    contention = json.loads((evidence / 'postdeploy-postgres-contention.log').read_text(encoding='utf-8-sig').strip())
    assert all(contention[key] is True for key in ['sameAccountWaitObserved', 'competingClaimRejected',
        'differentAccountClaimed', 'auditFailureRolledBackJobAndAccount'])
    assert contention['publicCustomerRowsWritten'] == 0
    heartbeat = json.loads((evidence / 'postdeploy-lease-sql.log').read_text(encoding='utf-8-sig').strip())
    assert heartbeat['pass'] and heartbeat['transactionRolledBack']
    result['postdeploy_video'] = current
    result['deployed_sql_checks'] = {'contention': contention, 'heartbeat': heartbeat}
(evidence / 'verified-canaries.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
for tap in evidence.glob('*.tap'):
    tap.write_text('\n'.join(line if line.strip() else '' for line in tap.read_text(encoding='utf-8').splitlines()) + '\n', encoding='utf-8')
manifest = {'algorithm': 'SHA-256', 'files': {}}
for artifact in sorted(evidence.iterdir()):
    if not artifact.is_file() or artifact.name == 'SHA256_MANIFEST.json':
        continue
    raw = artifact.suffix == '.png'
    data = artifact.read_bytes()
    manifest['files'][artifact.relative_to(root).as_posix()] = {
        'sha256': hashlib.sha256(data if raw else data.replace(b'\r\n', b'\n')).hexdigest(),
        'normalization': 'raw' if raw else 'CRLF to LF',
    }
(evidence / 'SHA256_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'verified_images': len(summary), 'distinct_orgs': 3, 'video': video['state']}))
