# Independent integration audit tools

Run from this directory, using Node 22+:

```powershell
npm.cmd ci --ignore-scripts --workspaces=false
node snapshot.cjs
node truth-audit.cjs
node --test audit.test.cjs
node_modules/.bin/tsc --project tsconfig.json
node report.cjs
node secret-scan.cjs
```

The later Sales snapshot is separate from the initial evidence:

```powershell
node follow-up.cjs
$env:AUDIT_SALES_SHA = '0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a'
node --test audit.test.cjs
Remove-Item Env:AUDIT_SALES_SHA
```

The invoice-failure test expects the corrected suspension behavior on the follow-up SHA; all initial defect-reproduction expectations remain pinned to their original snapshot. Keep outputs in separate files.

Sources are loaded with `git show` at the fixed SHAs in `source.cjs`. Never execute the other bots' browser/customer runners or copy their environment files. The tests use synthetic tenants, randomly generated per-run keys and embedded PostgreSQL only. Provider initialization is excluded. The HTTP fixture binds an ephemeral loopback port, executes the pinned Gateway media-handler block, and closes all connections. No real payment, AI job, WhatsApp send or customer database access occurs.

`REPRODUCTION` tests deliberately assert the defective behavior to preserve a reproducible audit. A passing reproduction means the defect was confirmed, **not** that the release is safe. Fix owners must replace those expectations with the safe behavior on a new explicitly pinned snapshot. PGlite validates actual PL/pgSQL but cannot establish multi-process PostgreSQL race correctness or deployed PostgREST/RLS behavior. Next imports and Supabase transport are test doubles; the actual route bodies run, so these are isolated integration tests, not real Next browser E2E.

Snapshot metadata is immutable: ref drift exits 2. For a new audit create a separate evidence directory or version the snapshot loader. `git merge-tree` does not merge active worktrees. The scope-only secret scanner prints rule/path/line, never matching bytes; it is not a complete historical secret audit.

Because Sales advanced during this audit, rerunning the original `snapshot.cjs` against the updated remote refs intentionally reports drift and exits 2. Use the already committed initial snapshot plus `follow-up.cjs`; this is a protection result, not a test failure to suppress.

The TypeScript contract is a proposal only, with disabled-by-default and non-executable markers. It is not wired to production.

The shared repository pre-commit hook requires `scripts/check_secrets.js`, which is not present on the frozen main baseline used for this audit. Commit this delivery with its own checked-in scanner hook without editing shared hook configuration:

```powershell
git -c core.hooksPath=tests/integration-readiness/hooks commit -m "audit: integration evidence"
```
