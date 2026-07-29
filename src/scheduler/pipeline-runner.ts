import type { TaskStoreAdapter } from "@/adapters/task-store"
import type { QueueProcessor } from "@/scheduler/queue-processor"
import type { EventBus } from "@/scheduler/event-bus"
import type { OpenCodeAPIClient } from "@/adapters/opencode-api"
import type { Logger } from "@/shared/logger"
import type { TaskRecord, PipelineRecord, PipelineStage } from "@/types/task"

export interface PipelineRunner {
  start(pipelineId: string): Promise<PipelineRecord>
  onTaskCompleted(task: TaskRecord): Promise<void>
  abort(pipelineId: string): Promise<void>
  recoverStale(): Promise<void>
  init(): void
}

export function createPipelineRunner(
  store: TaskStoreAdapter,
  queue: QueueProcessor,
  events: EventBus,
  api: OpenCodeAPIClient,
  logger: Logger,
): PipelineRunner {
  const log = logger.child({ component: "pipeline-runner" })
  const running = new Set<string>()

  async function start(pipelineId: string): Promise<PipelineRecord> {
    const pl = await store.getPipeline(pipelineId)
    if (!pl) throw new Error(`pipeline ${pipelineId} not found`)
    const stages = await store.getStages(pipelineId)
    if (stages.length === 0) throw new Error("pipeline has no stages")

    await store.updatePipeline(pipelineId, {
      status: "running",
      current_stage: 0,
      updated_at: Date.now(),
    })
    running.add(pipelineId)

    await submitStage(pl, stages, 0)
    events.emitStatus({ pipeline: { id: pipelineId, status: "running" } })

    return (await store.getPipeline(pipelineId))!
  }

  async function submitStage(pl: PipelineRecord, stages: PipelineStage[], stageIndex: number): Promise<void> {
    const stage = stages[stageIndex]
    if (!stage) return

    const task: TaskRecord = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      directory: pl.directory,
      prompt: stage.prompt,
      model: stage.model || "",
      status: "pending",
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
      pipeline_id: pl.id,
      agent_id: pl.session_id,
    }

    await store.enqueue(task)

    await store.updateStage(stage.id, {
      status: "running",
      task_id: task.id,
    })

    await store.updatePipeline(pl.id, {
      current_stage: stageIndex,
      updated_at: Date.now(),
    })

    events.emitTask({
      id: task.id,
      status: "pending",
      pipeline_id: pl.id,
      stage: stageIndex,
    })
  }

  async function onTaskCompleted(task: TaskRecord): Promise<void> {
    if (!task.pipeline_id) return

    const pl = await store.getPipeline(task.pipeline_id)
    if (!pl || pl.status !== "running") return

    const stages = await store.getStages(pl.id)
    const stageIndex = stages.findIndex((s) => s.task_id === task.id)
    if (stageIndex < 0) return

    const current = await store.getTask(task.id)
    if (!current) return
    if (current.status === "pending") return
    if (current.status === "running") return

    const stage = stages[stageIndex]

    if (current.status === "completed") {
      await store.updateStage(stage.id, { status: "completed" })

      if (stageIndex === 0 && current.agent_id && !pl.session_id) {
        pl.session_id = current.agent_id
      }

      const nextIndex = stageIndex + 1
      if (nextIndex < stages.length) {
        await store.updatePipeline(pl.id, {
          session_id: pl.session_id,
          current_stage: nextIndex,
          updated_at: Date.now(),
        })
        const updatedStages = await store.getStages(pl.id)
        await submitStage(pl, updatedStages, nextIndex)
        events.emitStatus({
          pipeline: { id: pl.id, status: "running", stage: nextIndex, total: stages.length },
        })
      } else {
        await store.updatePipeline(pl.id, {
          status: "completed",
          updated_at: Date.now(),
        })
        running.delete(pl.id)
        events.emitStatus({ pipeline: { id: pl.id, status: "completed" } })
      }
    } else {
      await store.updateStage(stage.id, {
        status: "failed",
        error: current.error,
      })
      for (let i = stageIndex + 1; i < stages.length; i++) {
        await store.updateStage(stages[i].id, { status: "skipped" })
      }
      await store.updatePipeline(pl.id, {
        status: "failed",
        updated_at: Date.now(),
      })
      running.delete(pl.id)
      events.emitStatus({ pipeline: { id: pl.id, status: "failed" } })
    }
  }

  async function abort(pipelineId: string): Promise<void> {
    const pl = await store.getPipeline(pipelineId)
    if (!pl) throw new Error("pipeline not found")

    const stages = await store.getStages(pipelineId)
    const currentStage = stages[pl.current_stage]
    if (currentStage?.task_id) {
      try {
        await api.abortSession(currentStage.task_id)
      } catch { /* best effort */ }
    }

    for (let i = pl.current_stage; i < stages.length; i++) {
      await store.updateStage(stages[i].id, {
        status: i === pl.current_stage ? "failed" : "skipped",
        error: i === pl.current_stage ? "aborted" : undefined,
      })
    }

    await store.updatePipeline(pipelineId, {
      status: "failed",
      updated_at: Date.now(),
    })
    running.delete(pipelineId)
  }

  async function recoverStale(): Promise<void> {
    const all = await store.listPipelines()
    for (const pl of all) {
      if (pl.status !== "running") continue

      const stages = await store.getStages(pl.id)
      const stage = stages[pl.current_stage]
      if (!stage?.task_id) continue

      const task = await store.getTask(stage.task_id)
      if (!task) {
        await store.updateStage(stage.id, { status: "pending", task_id: undefined })
        continue
      }

      if (task.status === "completed" || task.status === "failed") {
        await onTaskCompleted(task)
      }
    }
  }

  function init(): void {
    recoverStale().catch((err) => {
      log.error("Pipeline recovery failed", { error: String(err) })
    })

    events.on("task", (payload: unknown) => {
      const p = payload as { id?: string; status?: string }
      if (p.id && (p.status === "completed" || p.status === "failed")) {
        store.getTask(p.id).then((task) => {
          if (task?.pipeline_id) onTaskCompleted(task)
        }).catch((err) => {
          log.error("Pipeline event handler error", { error: String(err) })
        })
      }
    })

    log.info("Pipeline runner initialized")
  }

  return { start, onTaskCompleted, abort, recoverStale, init }
}
