import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueueProcessor } from '../src/scheduler/queue-processor.js';
import { createTaskStore } from '../src/adapters/task-store.js';
import { createMockOpenCodeAPIClient } from '../src/adapters/mock-opencode-api.js';
import { createLogger } from '../src/shared/logger.js';
import { EventBus } from '../src/scheduler/event-bus.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '/tmp/test-queue-processor.db';

describe('QueueProcessor', () => {
  let processor: ReturnType<typeof createQueueProcessor>;
  let store: Awaited<ReturnType<typeof createTaskStore>>;
  let api: ReturnType<typeof createMockOpenCodeAPIClient>;
  let eventBus: EventBus;

  beforeEach(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    const logger = createLogger('error');
    store = await createTaskStore(TEST_DB, logger);
    api = createMockOpenCodeAPIClient(logger);
    eventBus = new EventBus();
    processor = createQueueProcessor(api, store, eventBus, logger);
  });

  it('should process a pending task', async () => {
    const task = {
      id: 'test-task-1',
      prompt: 'Test task',
      status: 'pending' as const,
      directory: '',
      model: '',
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await store.enqueue(task);

    const processed = await processor.processOne();
    expect(processed).toBe(true);

    const updated = await store.getTask(task.id);
    expect(updated?.status).toBe('completed');
  });

  it('should skip when no tasks are pending', async () => {
    const processed = await processor.processOne();
    expect(processed).toBe(false);
  });

  it('should pause and resume processing', async () => {
    const task = {
      id: 'test-task-pause',
      prompt: 'Test task',
      status: 'pending' as const,
      directory: '',
      model: '',
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await store.enqueue(task);

    processor.pause();
    const processedWhilePaused = await processor.processOne();
    expect(processedWhilePaused).toBe(false);

    processor.resume();
    const processedAfterResume = await processor.processOne();
    expect(processedAfterResume).toBe(true);
  });

  it('should emit events on task completion', async () => {
    const task = {
      id: 'test-task-event',
      prompt: 'Test task',
      status: 'pending' as const,
      directory: '',
      model: '',
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await store.enqueue(task);

    const eventHandler = vi.fn();
    eventBus.on('task', eventHandler);

    await processor.processOne();

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: task.id,
        status: 'completed',
      })
    );
  });

  it('should handle task chain on success', async () => {
    const task = {
      id: 'test-task-chain-success',
      prompt: 'First task',
      status: 'pending' as const,
      directory: '',
      model: '',
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
      on_success: 'Second task',
    };
    await store.enqueue(task);

    await processor.processOne();

    const tasks = await store.listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[1].prompt).toBe('Second task');
    expect(tasks[1].parent_task_id).toBe(task.id);
  });

  it('should handle task chain on failure', async () => {
    vi.spyOn(api, 'sendMessage').mockRejectedValueOnce(new Error('API error'));

    const task = {
      id: 'test-task-chain-failure',
      prompt: 'Failing task',
      status: 'pending' as const,
      directory: '',
      model: '',
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
      on_failure: 'Recovery task',
    };
    await store.enqueue(task);

    await processor.processOne();

    const tasks = await store.listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[1].prompt).toBe('Recovery task');
  });

  it('should respect max chain depth', async () => {
    const task = {
      id: 'test-task-max-depth',
      prompt: 'Task 1',
      status: 'pending' as const,
      directory: '',
      model: '',
      attempts: 0,
      max_attempts: 5,
      created_at: Date.now(),
      updated_at: Date.now(),
      on_success: 'Task 2',
      chain_depth: 9,
      max_chain_depth: 10,
    };
    await store.enqueue(task);

    await processor.processOne();

    const tasks = await store.listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[1].chain_depth).toBe(10);

    // Try to chain again - should not create another task
    await processor.processOne();
    const finalTasks = await store.listTasks();
    expect(finalTasks).toHaveLength(2); // No new task created
  });
});
