"""Durable fail-closed invocation identity. Held attempts never auto-resubmit."""
import sqlite3
import json

class IdentityHeld(Exception):
    pass

class IdentityConflict(Exception):
    pass

class InvocationIdentity:
    def __init__(self, path):
        self.db=sqlite3.connect(str(path),timeout=10)
        self.db.execute('PRAGMA synchronous=FULL')
        self.db.execute('CREATE TABLE IF NOT EXISTS invocations (job TEXT PRIMARY KEY, org TEXT NOT NULL, attempt TEXT NOT NULL, account TEXT NOT NULL, project TEXT UNIQUE, state TEXT NOT NULL)')
        columns = {row[1] for row in self.db.execute('PRAGMA table_info(invocations)')}
        if 'result_json' not in columns:
            self.db.execute('ALTER TABLE invocations ADD COLUMN result_json TEXT')
        self.db.commit()

    def reserve(self,job,org,attempt,account,requested_project=None,recovery=False):
        self.db.execute('BEGIN IMMEDIATE')
        try:
            row=self.db.execute('SELECT org,attempt,account,project,state FROM invocations WHERE job=?',(job,)).fetchone()
            if row:
                if row[:3]!=(org,attempt,account) or (requested_project and requested_project!=row[3]):
                    raise IdentityConflict('Job/account/attempt/project ownership mismatch')
                raise IdentityHeld('Existing invocation requires reconciliation; no generation resubmitted')
            if requested_project or recovery:
                raise IdentityConflict('Recovery requires an existing durable owned invocation')
            self.db.execute('INSERT INTO invocations (job,org,attempt,account,project,state) VALUES (?,?,?,?,NULL,?)',(job,org,attempt,account,'PROJECT_CREATING'))
            self.db.commit()
        except BaseException:
            self.db.rollback();raise

    def bind_project(self,job,project):
        if not isinstance(project,str) or not project.strip():
            raise IdentityConflict('Provider returned no project identity')
        try:
            cursor=self.db.execute("UPDATE invocations SET project=?,state='PROJECT_BOUND' WHERE job=? AND state='PROJECT_CREATING'",(project,job))
            if cursor.rowcount!=1: raise IdentityConflict('Project ownership transition lost')
            self.db.commit()
        except sqlite3.IntegrityError as error:
            self.db.rollback();raise IdentityConflict('Project already belongs to another invocation') from error

    def mark_submitting(self,job):
        cursor=self.db.execute("UPDATE invocations SET state='SUBMISSION_UNCERTAIN' WHERE job=? AND state='PROJECT_BOUND' AND project IS NOT NULL",(job,))
        if cursor.rowcount!=1:
            self.db.rollback();raise IdentityHeld('Invocation already submitted or not durably bound')
        self.db.commit()

    def close(self):
        self.db.close()

    def persist_completed(self, job, result):
        row = self.db.execute('SELECT org,attempt,account,project,state FROM invocations WHERE job=?',(job,)).fetchone()
        if not row or row[4] != 'SUBMISSION_UNCERTAIN' or (
            result.get('org_id'),result.get('attempt_id'),result.get('account_id'),result.get('real_flow_project_uuid')) != row[:4]:
            raise IdentityConflict('Completed output ownership mismatch')
        receipt = result.get('output_receipt') or {}
        if receipt.get('job_id') != job or not receipt.get('decoded') or not receipt.get('sha256'):
            raise IdentityConflict('Validated output receipt missing')
        cursor = self.db.execute("UPDATE invocations SET state='COMPLETED',result_json=? WHERE job=? AND state='SUBMISSION_UNCERTAIN'",(json.dumps(result,sort_keys=True),job))
        if cursor.rowcount != 1:
            self.db.rollback();raise IdentityHeld('Completion fence lost')
        self.db.commit()

    def completed_result(self, job, org, attempt, account):
        row = self.db.execute('SELECT org,attempt,account,state,result_json FROM invocations WHERE job=?',(job,)).fetchone()
        if not row:
            return None
        if row[:3] != (org,attempt,account):
            raise IdentityConflict('Completed job identity mismatch')
        return json.loads(row[4]) if row[3]=='COMPLETED' and row[4] else None
