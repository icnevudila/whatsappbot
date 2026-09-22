import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ContinuityGraph } from '../src/graph/continuity-graph.js'
import type { StoryboardPlan, StoryboardScene } from '../src/planner/storyboard-engine.js'

test('ContinuityGraph - manages DAG execution order, blocking continuations until parent approves', () => {
  const scenes: StoryboardScene[] = [
    {
      sceneId: 'scene_1',
      parentJobId: 'job_test',
      order: 1,
      flowProjectId: 'flow_proj_1',
      durationTargetSec: 8,
      purpose: 'Hook',
      visualDescription: 'Opening visual hook',
      voiceoverSegment: 'Voiceover 1',
      referencesRequired: ['ref_1'],
      environment: 'construction site',
      productState: 'raw brick stack',
      camera: 'tracking push-in',
      lighting: 'morning sun',
      motion: 'steady',
      audio: 'foley',
      negativeConstraints: [],
      isRoot: true, // ROOT scene
    },
    {
      sceneId: 'scene_2',
      parentJobId: 'job_test',
      order: 2,
      flowProjectId: 'flow_proj_2',
      durationTargetSec: 8,
      purpose: 'Usage Demonstration',
      visualDescription: 'Mason placing brick into mortar',
      voiceoverSegment: 'Voiceover 2',
      referencesRequired: ['ref_1'],
      environment: 'construction site',
      productState: 'brick being mortared',
      camera: 'macro medium',
      lighting: 'morning sun',
      motion: 'tactile placement',
      audio: 'mortar contact',
      negativeConstraints: [],
      isRoot: false,
      continuityParentSceneId: 'scene_1', // CONTINUATION of scene_1
    },
    {
      sceneId: 'scene_3',
      parentJobId: 'job_test',
      order: 3,
      flowProjectId: 'flow_proj_3',
      durationTargetSec: 8,
      purpose: 'Payoff',
      visualDescription: 'Finished structural wall section',
      voiceoverSegment: 'Voiceover 3',
      referencesRequired: ['ref_1'],
      environment: 'construction site',
      productState: 'solid masonry wall',
      camera: 'locked hero',
      lighting: 'golden sun',
      motion: 'static hold',
      audio: 'ambient site',
      negativeConstraints: [],
      isRoot: false,
      continuityParentSceneId: 'scene_2', // CONTINUATION of scene_2
    },
  ]

  const plan: StoryboardPlan = {
    storyboardId: 'sb_test',
    parentJobId: 'job_test',
    totalScenes: 3,
    totalDurationSec: 24,
    scenes,
    createdAt: new Date().toISOString(),
  }

  const graph = new ContinuityGraph(plan)

  // Initial state: only Scene 1 (ROOT) should be ready
  const initialReady = graph.getReadyScenes()
  assert.equal(initialReady.length, 1)
  assert.equal(initialReady[0].sceneId, 'scene_1')

  const node2 = graph.getNode('scene_2')
  assert.equal(node2?.executionState, 'WAITING_FOR_PARENT')

  // Approve Scene 1 -> should unblock Scene 2
  const unblockedAfter1 = graph.markSceneApproved('scene_1', '/outputs/scene_1.mp4', {
    lightingProfile: 'bright morning sunlight',
  })
  assert.equal(unblockedAfter1.length, 1)
  assert.equal(unblockedAfter1[0].sceneId, 'scene_2')
  assert.equal(node2?.executionState, 'READY_TO_GENERATE')
  assert.equal(node2?.stateInventory.lightingProfile, 'bright morning sunlight') // State inherited!

  // Scene 3 should still be waiting
  const node3 = graph.getNode('scene_3')
  assert.equal(node3?.executionState, 'WAITING_FOR_PARENT')

  // Approve Scene 2 -> should unblock Scene 3
  const unblockedAfter2 = graph.markSceneApproved('scene_2', '/outputs/scene_2.mp4')
  assert.equal(unblockedAfter2.length, 1)
  assert.equal(unblockedAfter2[0].sceneId, 'scene_3')

  // Approve Scene 3 -> all approved
  graph.markSceneApproved('scene_3', '/outputs/scene_3.mp4')
  assert.equal(graph.isAllApproved(), true)
  assert.equal(graph.hasFailures(), false)
})
