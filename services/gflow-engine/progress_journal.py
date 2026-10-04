"""Attempt-scoped provider evidence; no database access or inferred stages."""
import json
import re
from pathlib import Path
from datetime import datetime, timezone

SAFE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$')
STAGES = ['OPENING_PROJECT', 'ATTACHING_INGREDIENTS', 'INGREDIENTS_VERIFIED', 'GENERATING']


def journal_path(base, org, job, attempt):
    if not all(isinstance(v, str) and SAFE.fullmatch(v) for v in (org, job, attempt)):
        raise ValueError('Invalid progress identity')
    return Path(base) / org / job / attempt / 'progress.jsonl'


def read_progress(base, org, job, attempt):
    path = journal_path(base, org, job, attempt)
    if not path.exists():
        return []
    events = []
    for line in path.read_text().splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            break  # An in-flight append is not evidence yet.
        if (event.get('org_id'), event.get('job_id'), event.get('attempt_id')) != (org, job, attempt):
            raise ValueError('Progress identity mismatch')
        events.append(event)
    return events


class ProgressJournal:
    def __init__(self, base, org, job, attempt):
        self.path = journal_path(base, org, job, attempt)
        self.identity = dict(org_id=org, job_id=job, attempt_id=attempt)
        self.seen = []
        if self.path.exists():
            raise ValueError('Progress attempt already exists')

    def emit(self, stage, **evidence):
        if stage in self.seen:
            return
        if stage != STAGES[len(self.seen)]:
            raise ValueError('Out-of-order provider stage')
        if stage == 'INGREDIENTS_VERIFIED':
            assets = evidence.get('verified_assets') or []
            media = [a.get('attached_media_id') for a in assets]
            if not assets or not all(media) or len(set(media)) != len(assets):
                raise ValueError('Physical attachment proof missing')
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open('a', encoding='utf-8') as f:
            f.write(json.dumps({**self.identity, 'sequence': len(self.seen) + 1,
                'stage': stage, 'observed_at': datetime.now(timezone.utc).isoformat(),
                **evidence}) + '\n')
            f.flush()
        self.seen.append(stage)
