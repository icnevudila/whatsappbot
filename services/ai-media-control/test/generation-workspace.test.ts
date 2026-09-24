import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { GenerationWorkspace } from '../src/providers/generation-workspace.js'

describe('GenerationWorkspace', () => {
  let tmpBase: string

  beforeEach(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-ws-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true })
  })

  test('creates dedicated attempt directory and writes prompt, provider, events, and results', () => {
    const ws = new GenerationWorkspace({
      jobId: 'job-123',
      attemptId: 'att-456',
      baseDir: tmpBase,
    })

    assert.equal(fs.existsSync(ws.dir), true)
    assert.equal(ws.dir, path.join(tmpBase, 'job-123', 'att-456'))

    // 1. Log events
    ws.logEvent('PREFLIGHT', 'Checking prerequisites')
    ws.logEvent('ACCOUNT_LEASED', 'Leased cdp-9223')
    ws.logEvent('READY', 'Ready for generation')
    ws.logEvent('SUBMITTED', 'Prompt submitted')
    ws.logEvent('GENERATING', 'Rendering started')
    ws.logEvent('GENERATION_COMPLETED', 'Rendering finished')
    ws.logEvent('DOWNLOAD_STARTED', 'Download started')

    const eventsLog = fs.readFileSync(path.join(ws.dir, 'events.log'), 'utf-8')
    assert.equal(eventsLog.includes('[PREFLIGHT]'), true)
    assert.equal(eventsLog.includes('[ACCOUNT_LEASED]'), true)
    assert.equal(eventsLog.includes('[GENERATING]'), true)
    assert.equal(eventsLog.includes('[DOWNLOAD_STARTED]'), true)

    // 2. Write prompt
    ws.writePrompt({ prompt: 'test prompt', duration: 8 })
    const promptData = JSON.parse(fs.readFileSync(path.join(ws.dir, 'prompt.json'), 'utf-8'))
    assert.equal(promptData.prompt, 'test prompt')

    // 3. Write provider
    ws.writeProvider({ provider: 'GEMINI_NATIVE_VIDEO', account_id: 'cdp-9223' })
    const providerData = JSON.parse(fs.readFileSync(path.join(ws.dir, 'provider.json'), 'utf-8'))
    assert.equal(providerData.provider, 'GEMINI_NATIVE_VIDEO')

    // 4. Create dummy raw video & record
    const dummyVideo = path.join(tmpBase, 'source.mp4')
    fs.writeFileSync(dummyVideo, Buffer.alloc(1024, 0x41))
    const { sha256 } = ws.recordRawVideo(dummyVideo)

    assert.equal(fs.existsSync(path.join(ws.dir, 'raw.mp4')), true)
    assert.equal(fs.existsSync(path.join(ws.dir, 'raw.sha256')), true)
    const savedSha = fs.readFileSync(path.join(ws.dir, 'raw.sha256'), 'utf-8')
    assert.equal(savedSha.includes(sha256), true)

    // 5. Write result
    ws.writeResult({ status: 'COMPLETED', sha256 })
    const resultData = JSON.parse(fs.readFileSync(path.join(ws.dir, 'result.json'), 'utf-8'))
    assert.equal(resultData.status, 'COMPLETED')
  })
})
