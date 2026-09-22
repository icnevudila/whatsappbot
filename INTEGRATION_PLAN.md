# Integration Plan: Creative Video Orchestrator (`CREATIVE_VIDEO_ORCHESTRATOR=v1`)

> **Notice to Reviewers & DevOps**:
> This document details how the isolated `@wa/creative-video-orchestrator` service connects to `ai-media-control`, `gflow-engine`, Supabase DB, and Canlı Takip UI once the parallel infrastructure agent has completed their work.
> No production files or running services have been modified in this phase.

---

## 1. Architectural Overview & Boundary of Concerns

```
                  ┌──────────────────────────────────────────────┐
                  │               Canlı Takip UI                 │
                  │             /canli-takip/ai-media            │
                  └──────────────────────┬───────────────────────┘
                                         │ Timeline & Stage Queries
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │               ai-media-control               │
                  │  (State Owner, Queue Worker, Supabase Audit) │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        │                                                                 │
        │ [Feature Flag: CREATIVE_VIDEO_ORCHESTRATOR=v1]                  │ [Feature Flag: disabled / v0]
        ▼                                                                 ▼
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────┐
│         creative-video-orchestrator          │        │ Legacy direct single-pass prompt │
│  • BrandContextSnapshot & ReferenceRegistry  │        │ (direct gflow-engine dispatch)   │
│  • Strategy Router (Short vs Long DAG)       │        └──────────────────────────────────┘
│  • Master Voice-Over (Non-overlapping)       │
│  • Storyboard & Keyframe-First Generation    │
│  • Deterministic Finishing (Exact Branding)  │
│  • Multi-Stage Fail-Closed CreativeQA        │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                 gflow-engine                 │
│         (Pure Execution Provider)            │
│  • Pinned gflow-cli wrapper                  │
│  • Concurrency = 1 per Flow account          │
│  • 1 Scene = 1 Unique flow_project_id        │
│  • Actual attached ingredients reporting     │
└──────────────────────────────────────────────┘
```

---

## 2. Integration with `services/ai-media-control`

### 2.1 Dependency Hook
In `services/ai-media-control/package.json`:
```json
{
  "dependencies": {
    "@wa/creative-video-orchestrator": "file:../creative-video-orchestrator"
  }
}
```

### 2.2 Feature Flag Gate (`orchestrator.ts`)
In `services/ai-media-control/src/orchestrator.ts`, during the `QUEUED` / `LEASED` transition:

```typescript
import { CreativeVideoOrchestrator } from '@wa/creative-video-orchestrator'

const isCreativeOrchestratorEnabled = process.env.CREATIVE_VIDEO_ORCHESTRATOR === 'v1'

if (isCreativeOrchestratorEnabled) {
  // Delegate creative planning, reference binding, and execution to CreativeVideoOrchestrator
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: new HttpGFlowProvider(gflowEngineUrl),
    ffmpegAdapter: new NativeFFmpegAdapter(),
    creativeModel: new OpenAICreativeModelAdapter(), // or GeminiCreativeModelAdapter
    imageProvider: new FlowImageGenerationAdapter(gflowEngineUrl),
    accountId: account.id,
  })

  const result = await orchestrator.executeCreativeJob(job.id, {
    org_id: job.org_id,
    brand_name: job.metadata?.brand_name || 'Brand',
    sector_profile: job.metadata?.sector_profile || 'generic_commercial',
    logo_asset_id: job.metadata?.logo_asset_id,
    logo_sha256: job.metadata?.logo_sha256,
    products: job.metadata?.products || [],
    campaign: {
      objective: job.title,
      cta: job.metadata?.cta || 'Daha Fazla Bilgi Alın',
      offer: job.metadata?.offer,
      price: job.metadata?.price,
    },
    requested_duration: job.duration_seconds,
    output_type: job.duration_seconds > 15 ? 'LONG_VIDEO' : 'SHORT_VIDEO',
  })

  // Store full cryptographic provenance & QA reports in ai_media_jobs metadata
  await supabase
    .from('ai_media_jobs')
    .update({
      metadata: {
        ...job.metadata,
        creative_provenance: result.provenance,
        qa_reports: result.sceneQAReports,
      },
    })
    .eq('id', job.id)
}
```

---

## 3. Integration with `services/gflow-engine`

### 3.1 Capabilities Probe Endpoint
To support dynamic model and reference routing without hardcoding:
In `services/gflow-engine/server.py`, add endpoint:
```python
@app.get("/v1/accounts/{account_id}/capabilities")
async def get_account_capabilities(account_id: str):
    return {
        "accountId": account_id,
        "supportsR2V": True,
        "maxReferenceImages": 3,
        "supportsI2V": True,
        "supportsExtend": False,
        "supportsMovieScene": False,
        "supportsChain": False,
        "supportsStartEndFrames": False, # Deprecated in Sept 2026 UI
        "preferredModel": "veo-fast"
    }
```

### 3.2 Actual Reference Invariant Reporting
In `services/gflow-engine/server.py` `GenerateResponse`:
Ensure `actual_attached_reference_ids` contains the exact array of file/asset IDs attached by `gflow-cli` so the post-execution gate can enforce `expected === actual`.

---

## 4. Canlı Takip Timeline UI Specification (`/canli-takip/ai-media`)

### 4.1 Short Video Stages
```
[Brand Context] ➔ [References Verified] ➔ [Keyframe / R2V] ➔ [Generation] ➔ [Scene QA] ➔ [Deterministic Finishing] ➔ [Delivered]
```

### 4.2 Long Video Stages & Scene Cards
```
[Campaign Arc] ➔ [Master Voice-Over] ➔ [Storyboard DAG] ➔ [Parallel Scenes] ➔ [Scene QAs] ➔ [FFmpeg Assembly] ➔ [Final QA] ➔ [Ready]
```

#### Scene Card UI Contract:
Each scene card renders:
- **Scene Number**: `Scene #1`, `Scene #2`, etc.
- **Purpose**: e.g., "Hook / Problem", "Product Demonstration", "Emotional Payoff".
- **Duration**: Target vs Actual (e.g. `8.0s`).
- **Required References**: List of canonical chips (e.g., `@BrandLogo`, `@HeroProduct`).
- **Keyframe Preview**: Thumbnail with Keyframe QA badge (PASS/FAIL).
- **Flow Account & Unique Project ID**: `flow_proj_<jobId>_s1` (guaranteeing scene isolation).
- **Generation State**: `WAITING_FOR_PARENT`, `READY_TO_GENERATE`, `GENERATING`, `APPROVED`, `FAILED`.
- **Preview Player**: Inline MP4 player.
- **QA Metrics**: ffprobe details (fps, codec, duration), visual QA score, text OCR verification.
- **Retry Action**: Retry specific failed scene without invalidating already approved scenes.

---

## 5. Migration & Deployment Strategy

1. **Step 1**: Infrastructure agent completes and merges `ai-media-control`, `gflow-engine`, and Supabase schema.
2. **Step 2**: Merge `feature/creative-video-orchestrator` branch into `main`.
3. **Step 3**: Set environment variable `CREATIVE_VIDEO_ORCHESTRATOR=v1` on `ai-media-control`.
4. **Step 4**: Run smoke test with Bofe, Ayvazoğlu, and Veri Burada test jobs.
5. **Step 5**: Enable Canlı Takip enhanced timeline in `apps/customer/src/app/canli-takip/live-dashboard.tsx`.
