import type { StoryboardScene, StoryboardPlan } from '../planner/storyboard-engine.js'

export interface VisualStateInventory {
  productAppearance: string
  productPosition: string
  presenter?: string
  clothing?: string
  environment: string
  timeOfDay: string
  props: string[]
  cameraSide: 'left' | 'right' | 'center' | 'macro'
  lightingProfile: string
  lastFrameSummary?: string
}

export type SceneExecutionState =
  | 'PENDING'
  | 'WAITING_FOR_PARENT'
  | 'KEYFRAME_PLANNING'
  | 'KEYFRAME_QA'
  | 'READY_TO_GENERATE'
  | 'GENERATING'
  | 'SCENE_QA'
  | 'APPROVED'
  | 'FAILED'

export interface ContinuityNode {
  scene: StoryboardScene
  isRoot: boolean
  parentSceneId?: string
  childrenSceneIds: string[]
  stateInventory: VisualStateInventory
  executionState: SceneExecutionState
  approvedKeyframePath?: string
  approvedVideoPath?: string
  qaError?: string
}

export class ContinuityGraph {
  private nodes = new Map<string, ContinuityNode>()

  constructor(public readonly storyboardPlan: StoryboardPlan) {
    this.buildGraph()
  }

  private buildGraph(): void {
    for (const scene of this.storyboardPlan.scenes) {
      const isRoot = scene.isRoot || !scene.continuityParentSceneId

      const initialInventory: VisualStateInventory = {
        productAppearance: scene.productState,
        productPosition: 'prominent center-frame',
        environment: scene.environment,
        timeOfDay: 'daylight',
        props: [],
        cameraSide: 'center',
        lightingProfile: scene.lighting,
      }

      this.nodes.set(scene.sceneId, {
        scene,
        isRoot,
        parentSceneId: isRoot ? undefined : scene.continuityParentSceneId,
        childrenSceneIds: [],
        stateInventory: initialInventory,
        executionState: isRoot ? 'READY_TO_GENERATE' : 'WAITING_FOR_PARENT',
      })
    }

    // Connect children
    for (const node of this.nodes.values()) {
      if (node.parentSceneId && this.nodes.has(node.parentSceneId)) {
        this.nodes.get(node.parentSceneId)!.childrenSceneIds.push(node.scene.sceneId)
      }
    }
  }

  getNode(sceneId: string): ContinuityNode | undefined {
    return this.nodes.get(sceneId)
  }

  getAllNodes(): ContinuityNode[] {
    return Array.from(this.nodes.values())
  }

  getRootNodes(): ContinuityNode[] {
    return this.getAllNodes().filter(n => n.isRoot)
  }

  /**
   * Returns scenes that are currently unblocked and ready to generate.
   * Independent ROOT scenes are ready immediately;
   * CONTINUATION scenes become ready ONLY after parent node is APPROVED.
   */
  getReadyScenes(): StoryboardScene[] {
    const ready: StoryboardScene[] = []
    for (const node of this.nodes.values()) {
      if (node.executionState === 'READY_TO_GENERATE') {
        ready.push(node.scene)
      }
    }
    return ready
  }

  /**
   * Called when a scene finishes generation and passes QA.
   * Propagates visual state to continuation children and unblocks them.
   */
  markSceneApproved(
    sceneId: string,
    approvedVideoPath: string,
    updatedState?: Partial<VisualStateInventory>
  ): StoryboardScene[] {
    const node = this.nodes.get(sceneId)
    if (!node) throw new Error(`ContinuityNode not found: ${sceneId}`)

    node.executionState = 'APPROVED'
    node.approvedVideoPath = approvedVideoPath

    if (updatedState) {
      node.stateInventory = { ...node.stateInventory, ...updatedState }
    }

    const unblockedChildren: StoryboardScene[] = []
    for (const childId of node.childrenSceneIds) {
      const childNode = this.nodes.get(childId)
      if (childNode && childNode.executionState === 'WAITING_FOR_PARENT') {
        // Inherit parent visual state
        childNode.stateInventory = {
          ...childNode.stateInventory,
          productAppearance: node.stateInventory.productAppearance,
          environment: node.stateInventory.environment,
          timeOfDay: node.stateInventory.timeOfDay,
          lightingProfile: node.stateInventory.lightingProfile,
          lastFrameSummary: `Continuity from parent ${sceneId}`,
        }
        childNode.executionState = 'READY_TO_GENERATE'
        unblockedChildren.push(childNode.scene)
      }
    }

    return unblockedChildren
  }

  markSceneFailed(sceneId: string, error: string): void {
    const node = this.nodes.get(sceneId)
    if (node) {
      node.executionState = 'FAILED'
      node.qaError = error
    }
  }

  isAllApproved(): boolean {
    return this.getAllNodes().every(n => n.executionState === 'APPROVED')
  }

  hasFailures(): boolean {
    return this.getAllNodes().some(n => n.executionState === 'FAILED')
  }
}
