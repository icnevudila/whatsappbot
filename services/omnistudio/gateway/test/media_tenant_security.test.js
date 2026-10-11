'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

// Setup isolated directories
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-security-test-'));
const outputDir = path.join(tempDir, 'outputs');
fs.mkdirSync(outputDir, { recursive: true });

process.env.OUTPUT_DIR = outputDir;
process.env.MEDIA_SIGNING_SECRET = 'test-secret-salt-2026';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'test-gateway-admin-token';
process.env.WORKER_CONTROL_TOKEN = 'test-worker-control-secret';
process.env.PORT = '0';

const {
  registerMediaOwner,
  getMediaOwner,
  signMediaAccess,
  verifyMediaAccess,
  getSigningSecret,
  clearMediaRegistry
} = require('../public_output_access.js');
const { server } = require('../server.js');

let serverPort;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      baseUrl = `http://127.0.0.1:${serverPort}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  await new Promise((resolve) => server.close(resolve));
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  clearMediaRegistry();
});

test('GATEWAY MEDIA PRIVACY: Anonymous access to generated image is rejected (401)', async () => {
  const filename = 'brand_isolated_product.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('fake-png-content'));
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  const res = await fetch(`${baseUrl}/outputs/${filename}`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'UNAUTHORIZED_MEDIA_ACCESS');
});

test('GATEWAY MEDIA PRIVACY: Spoofed client X-Tenant-Id header alone is rejected (401)', async () => {
  const filename = 'confidential_design.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('alpha-secret-image'));
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  // Client attempts to claim identity by simply passing header without credentials
  const res = await fetch(`${baseUrl}/outputs/${filename}`, {
    headers: { 'X-Tenant-Id': 'tenant-alpha' }
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'UNAUTHENTICATED_TENANT_HEADER');
});

test('GATEWAY MEDIA PRIVACY: Authenticated internal proxy/worker with X-Tenant-Id succeeds (200)', async () => {
  const filename = 'proxy_delivered_image.png';
  const content = 'verified-customer-image';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(content));
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  const res = await fetch(`${baseUrl}/outputs/${filename}`, {
    headers: {
      'Authorization': 'Bearer test-gateway-admin-token',
      'X-Tenant-Id': 'tenant-alpha'
    }
  });
  assert.equal(res.status, 200);
  const bodyText = await res.text();
  assert.equal(bodyText, content);
});

test('GATEWAY MEDIA PRIVACY: Signed URL allows authorized tenant access (200)', async () => {
  const filename = 'campaign_banner_signed.png';
  const content = 'banner-pixels';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(content));
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  const bodyText = await res.text();
  assert.equal(bodyText, content);
});

test('GATEWAY MEDIA PRIVACY: Signed URL for wrong tenant is rejected (403 Cross-Tenant)', async () => {
  const filename = 'top_secret_product.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('private-stuff'));
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  // Signed for tenant-beta
  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-beta',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'CROSS_TENANT_ACCESS_DENIED');
});

test('GATEWAY MEDIA PRIVACY: Tampered signature is rejected (401)', async () => {
  const filename = 'tamper_test.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('bytes'));
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const tamperedUrl = `${baseUrl}/outputs/${filename}?sig=bad${signed.sig.slice(3)}&exp=${signed.exp}&tid=tenant-alpha`;
  const res = await fetch(tamperedUrl);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'INVALID_MEDIA_SIGNATURE');
});

test('GATEWAY MEDIA PRIVACY: Expired signed URL is rejected (401)', async () => {
  const filename = 'expired_test.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('bytes'));
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  const expired = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: -10, // already expired
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${expired.queryString}`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'MEDIA_SIGNATURE_EXPIRED');
});

test('GATEWAY MEDIA PRIVACY: File with unresolvable/unknown owner is rejected (403 Fail-Closed)', async () => {
  const filename = 'orphan_untracked_image.png';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from('orphan-bytes'));
  // Do NOT register owner; no owner metadata exists
  clearMediaRegistry();

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`);
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.equal(data.error, 'TENANT_OWNER_UNRESOLVABLE');
});

test('GATEWAY MEDIA PRIVACY: Restart recovery restores owner from disk sidecar', async () => {
  const filename = 'restart_resilient_video.mp4';
  const content = 'video-payload-content';
  fs.writeFileSync(path.join(outputDir, filename), Buffer.from(content));
  registerMediaOwner(filename, 'tenant-gamma', outputDir);

  // Simulate Gateway restart by clearing in-memory registry
  clearMediaRegistry();

  // Owner should be recovered from outputDir on disk
  const recoveredOwner = getMediaOwner(filename, outputDir);
  assert.equal(recoveredOwner, 'tenant-gamma');

  // Clear again and verify that HTTP route automatically recovers from disk sidecar
  clearMediaRegistry();
  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-gamma',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`);
  assert.equal(res.status, 200);
});

test('GATEWAY MEDIA PRIVACY: Video Range streaming (HTTP 206) is preserved for authorized signed requests', async () => {
  const filename = 'commercial_reel.mp4';
  const dummyVideo = Buffer.alloc(1000, 42);
  fs.writeFileSync(path.join(outputDir, filename), dummyVideo);
  registerMediaOwner(filename, 'tenant-alpha', outputDir);

  const signed = signMediaAccess({
    filename,
    tenantId: 'tenant-alpha',
    ttlSeconds: 300,
    secret: process.env.MEDIA_SIGNING_SECRET
  });

  const res = await fetch(`${baseUrl}/outputs/${filename}?${signed.queryString}`, {
    headers: { 'Range': 'bytes=0-99' }
  });

  assert.equal(res.status, 206);
  assert.equal(res.headers.get('content-range'), 'bytes 0-99/1000');
  assert.equal(res.headers.get('accept-ranges'), 'bytes');
  assert.equal(res.headers.get('content-length'), '100');
  assert.equal(res.headers.get('content-type'), 'video/mp4');

  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.length, 100);
  assert.equal(buf[0], 42);
});

test('GATEWAY MEDIA PRIVACY: Missing MEDIA_SIGNING_SECRET throws configuration error without fallback', () => {
  const originalSecret = process.env.MEDIA_SIGNING_SECRET;
  const originalToken = process.env.OMNISTUDIO_GATEWAY_TOKEN;
  delete process.env.MEDIA_SIGNING_SECRET;
  delete process.env.OMNISTUDIO_GATEWAY_TOKEN;

  try {
    assert.throws(
      () => getSigningSecret(),
      (err) => {
        assert.equal(err.message, 'CONFIG_ERROR_MEDIA_SIGNING_SECRET_REQUIRED');
        assert.equal(err.statusCode, 500);
        return true;
      }
    );
  } finally {
    process.env.MEDIA_SIGNING_SECRET = originalSecret;
    process.env.OMNISTUDIO_GATEWAY_TOKEN = originalToken;
  }
});
