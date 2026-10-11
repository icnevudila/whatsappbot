#!/usr/bin/env node
/**
 * Pre-commit Secret Scanner
 * Scans git staged diffs for accidental commits of plain-text passwords, tokens, and credentials.
 */

const { execSync } = require('child_process');

function scanStagedFiles() {
  let stagedDiff = '';
  try {
    stagedDiff = execSync('git diff --cached --unified=0', { encoding: 'utf-8' });
  } catch (e) {
    // If not a git repo or no staged files, exit cleanly
    process.exit(0);
  }

  if (!stagedDiff.trim()) {
    process.exit(0);
  }

  const lines = stagedDiff.split('\n');
  let currentFile = 'unknown';
  const violations = [];

  const secretPatterns = [
    { name: 'Postgres Connection String with Password', regex: /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@[^\s/:]+/i },
    { name: 'Plaintext Private Key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i },
    { name: 'Generic Secret Token / Bearer in Source Code', regex: /(?:Bearer\s+[A-Za-z0-9_\-]{40,}|token\s*=\s*['"][A-Za-z0-9_\-]{40,}['"])/i },
    { name: 'Supabase / OpenAI Service Key or Secret', regex: /(?:sbp_[a-zA-Z0-9]{32,}|sk-[a-zA-Z0-9]{32,})/i },
    { name: 'Hardcoded Password Assignment', regex: /(?:password|passwd|secret)\s*[:=]\s*['"][^'"]{8,}['"]/i },
  ];

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim();
      continue;
    }

    // Only scan newly added lines (+)
    if (!line.startsWith('+') || line.startsWith('+++')) {
      continue;
    }

    const addedContent = line.slice(1);

    // Skip comments that describe env vars or placeholders
    if (addedContent.includes('process.env.') || addedContent.includes('dummy') || addedContent.includes('placeholder')) {
      continue;
    }

    for (const pattern of secretPatterns) {
      if (pattern.regex.test(addedContent)) {
        violations.push({
          file: currentFile,
          rule: pattern.name,
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n🚨 [SECURITY ALERT] Plaintext secret pattern detected in staged files:');
    for (const v of violations) {
      console.error(`  - File: ${v.file} (Violation: ${v.rule})`);
    }
    console.error('\nCommit aborted. Use environment variables (process.env.*) instead of hardcoding secrets.\n');
    process.exit(1);
  }
}

scanStagedFiles();
