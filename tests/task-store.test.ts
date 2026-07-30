import { describe, it, expect, beforeEach } from "vitest"
import { createTaskStore, type TaskStoreAdapter } from "../src/adapters/task-store"
import { createLogger } from "../src/shared/logger"
import type { TaskRecord } from "../src/types/task"
import { unlinkSync, existsSync } from "fs"

const TEST_DB = "/tmp/test-tasks.db"

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    directory: "",
    prompt: "test prompt",
    model: "",
    status: "pending",
    attempts: 0,
    max_attempts: 5,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  }
}

describe("TaskStore", () => {
  let store: TaskStoreAdapter

  beforeEach(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
    store = await createTaskStore(TEST_DB, createLogger("error"))
  })

  it("enqueues and retrieves a task", async () => {
    const task = makeTask({ id: "t1", prompt: "hello" })
    await store.enqueue(task)
    const retrieved = await store.getTask("t1")
    expect(retrieved).not.toBeNull()
    expect(retrieved!.prompt).toBe("hello")
  })

  it("peekPending returns the oldest pending task", async () => {
    await store.enqueue(makeTask({ id: "t1", created_at: 100 }))
    await store.enqueue(makeTask({ id: "t2", created_at: 50 }))
    const pending = await store.peekPending()
    expect(pending!.id).toBe("t2")
  })

  it("marks task running", async () => {
    await store.enqueue(makeTask({ id: "t1" }))
    await store.markRunning("t1")
    const task = await store.getTask("t1")
    expect(task!.status).toBe("running")
    expect(task!.attempts).toBe(1)
  })

  it("marks task completed", async () => {
    await store.enqueue(makeTask({ id: "t1" }))
    await store.markRunning("t1")
    await store.markCompleted("t1")
    const task = await store.getTask("t1")
    expect(task!.status).toBe("completed")
  })

  it("marks task failed with retry", async () => {
    await store.enqueue(makeTask({ id: "t1", attempts: 0, max_attempts: 3 }))
    await store.markFailed("t1", "error")
    const task = await store.getTask("t1")
    expect(task!.status).toBe("pending")
    expect(task!.error).toBe("error")
  })

  it("marks task failed permanently when max attempts reached", async () => {
    await store.enqueue(makeTask({ id: "t1", attempts: 3, max_attempts: 3 }))
    await store.markFailed("t1", "final error")
    const task = await store.getTask("t1")
    expect(task!.status).toBe("failed")
  })

  it("lists tasks with status filter", async () => {
    await store.enqueue(makeTask({ id: "t1", status: "pending" }))
    await store.enqueue(makeTask({ id: "t2", status: "completed" }))
    await store.enqueue(makeTask({ id: "t3", status: "pending" }))
    const pending = await store.listTasks({ status: "pending" })
    expect(pending).toHaveLength(2)
  })

  it("handles pipeline CRUD", async () => {
    await store.addPipeline({
      id: "pl1", name: "Test", directory: "", status: "pending",
      current_stage: 0, created_at: Date.now(), updated_at: Date.now(),
    })
    const pl = await store.getPipeline("pl1")
    expect(pl).not.toBeNull()
    expect(pl!.name).toBe("Test")

    await store.addStage({
      id: "stg1", pipeline_id: "pl1", stage_index: 0,
      label: "Stage 1", prompt: "do something", status: "pending",
    })
    const stages = await store.getStages("pl1")
    expect(stages).toHaveLength(1)

    await store.removePipeline("pl1")
    const deleted = await store.getPipeline("pl1")
    expect(deleted).toBeNull()
  })

  it("handles recurring CRUD", async () => {
    await store.addRecurring({
      id: "r1", name: "Daily", directory: "", prompt: "run",
      model: "", cron: "0 0 * * *", enabled: true,
    })
    const items = await store.listRecurring()
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe("Daily")

    await store.updateRecurring("r1", { enabled: false })
    const updated = await store.getRecurring("r1")
    expect(updated!.enabled).toBe(false)

    await store.removeRecurring("r1")
    const after = await store.listRecurring()
    expect(after).toHaveLength(0)
  })
})
