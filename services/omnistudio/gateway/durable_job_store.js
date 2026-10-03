'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const JOB_ID = /^job_[a-f0-9]{16}$/;

// This directory must be private and persistent, never inside public outputs.
// Each transition is committed before acknowledging acceptance or handing out a lease.
class DurableJobStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(this.directory, 0o700);
  }

  save(job) {
    if (!JOB_ID.test(job.id)) throw new Error('INVALID_DURABLE_JOB_ID');
    const terminal = job.status === 'completed' || job.status === 'failed';
    const state = terminal ? {
      ...job, originalPrompt: (job.originalPrompt || '').slice(0,100),
      prompt: null, rawPrompt: null, systemPrompt: null, affordancePrompt: null,
      incomingMessage: null, conversationHistory: null, companyContext: null,
      referenceImages: [], resultB64: null, fallbackResult: null,
    } : job;
    const payload = JSON.stringify(state);
    const record = JSON.stringify({ version: 1, sha256: crypto.createHash('sha256').update(payload).digest('hex'), payload });
    const target = path.join(this.directory, job.id + '.json');
    const temporary = target + '.tmp';
    const fd = fs.openSync(temporary, 'w', 0o600);
    try {
      fs.writeFileSync(fd, record);
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, target);
    // Directory fsync makes rename durable on Linux; Windows does not support it.
    if (process.platform !== 'win32') {
      const directoryFd = fs.openSync(this.directory, 'r');
      try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
    }
  }

  load() {
    const jobs = [];
    for (const filename of fs.readdirSync(this.directory).sort()) {
      if (!/^job_[a-f0-9]{16}\.json$/.test(filename)) continue;
      jobs.push(this.read(filename.slice(0,-5)));
    }
    return jobs.sort((a, b) => a.createdAt - b.createdAt);
  }

  read(id) {
      if (!JOB_ID.test(id)) return null;
      const filename = id + '.json';
      let contents;
      try { contents = fs.readFileSync(path.join(this.directory, filename), 'utf8'); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
      const record = JSON.parse(contents);
      if (record.version !== 1 || typeof record.payload !== 'string' || crypto.createHash('sha256').update(record.payload).digest('hex') !== record.sha256) {
        throw new Error('DURABLE_JOB_STATE_CORRUPT: ' + filename);
      }
      const job = JSON.parse(record.payload);
      if (!JOB_ID.test(job.id) || filename !== job.id + '.json' || !['pending','processing','completed','failed','reconciliation_required'].includes(job.status)) {
        throw new Error('DURABLE_JOB_STATE_INVALID: ' + filename);
      }
      return job;
  }
}

module.exports = { DurableJobStore };
