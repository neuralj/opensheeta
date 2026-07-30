import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPipelineRunner } from '../src/scheduler/pipeline-runner.js';
import { createTaskStore } from '../src/adapters/task-store.js';
import { createMockOpenCodeAPIClient } from '../src/adapters/mock-opencode-api.js';
import { createLogger } from '../src/shared/logger.js';
import { EventBus } from '../src/scheduler/event-bus.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '/tmp/test-pipeline-runner.db';

describe('PipelineRunner', () => {
  let runner: ReturnType<typeof createPipelineRunner>;
  let store: Awaited<ReturnType<typeof createTaskStore>>;
  let api: ReturnType<typeof createMockOpenCodeAPIClient>;
  let eventBus: EventBus;
  let mockQueue: { pause: () => void; resume: () => void };

  beforeEach(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    const logger = createLogger('error');
    store = await createTaskStore(TEST_DB, logger);
    api = createMockOpenCodeAPIClient(logger);
    eventBus = new EventBus();
    mockQueue = { pause: vi.fn(), resume: vi.fn() };
    runner = createPipelineRunner(store, mockQueue as any, eventBus, api, logger);
  });

  it('should start a pipeline and create first stage task', async () => {
    const now = Date.now();
    await store.addPipeline({
      id: 'pl1',
      name: 'Test Pipeline',
      directory: '',
      status: 'pending',
      current_stage: 0,
      created_at: now,
      updated_at: now,
    });
    await store.addStage({
      id: 'stg1',
      pipeline_id: 'pl1',
      stage_index: 0,
      label: 'Stage 1',
      prompt: 'Stage 1 prompt',
      status: 'pending',
    });
    await store.addStage({
      id: 'stg2',
      pipeline_id: 'pl1',
      stage_index: 1,
      label: 'Stage 2',
      prompt: 'Stage 2 prompt',
      status: 'pending',
    });

    const pipeline = await runner.start('pl1');
    expect(pipeline.status).toBe('running');

    const tasks = await store.listTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].prompt).toBe('Stage 1 prompt');
    expect(tasks[0].pipeline_id).toBe('pl1');
  });

  it('should advance to next stage on task completion', async () => {
    const now = Date.now();
    await store.addPipeline({
      id: 'pl1',
      name: 'Test Pipeline',
      directory: '',
      status: 'pending',
      current_stage: 0,
      created_at: now,
      updated_at: now,
    });
    await store.addStage({
      id: 'stg1',
      pipeline_id: 'pl1',
      stage_index: 0,
      label: 'Stage 1',
      prompt: 'Stage 1 prompt',
      status: 'pending',
    });
    await store.addStage({
      id: 'stg2',
      pipeline_id: 'pl1',
      stage_index: 1,
      label: 'Stage 2',
      prompt: 'Stage 2 prompt',
      status: 'pending',
    });

    await runner.start('pl1');

    const tasks = await store.listTasks();
    const task = tasks[0];

    await store.markRunning(task.id);
    await store.markCompleted(task.id);

    const completedTask = await store.getTask(task.id);
    await runner.onTaskCompleted(completedTask!);

    const updatedPipeline = await store.getPipeline('pl1');
    expect(updatedPipeline?.current_stage).toBe(1);

    const updatedTasks = await store.listTasks();
    expect(updatedTasks).toHaveLength(2);
    expect(updatedTasks[1].prompt).toBe('Stage 2 prompt');
  });

  it('should mark pipeline as completed when all stages done', async () => {
    const now = Date.now();
    await store.addPipeline({
      id: 'pl1',
      name: 'Test Pipeline',
      directory: '',
      status: 'pending',
      current_stage: 0,
      created_at: now,
      updated_at: now,
    });
    await store.addStage({
      id: 'stg1',
      pipeline_id: 'pl1',
      stage_index: 0,
      label: 'Stage 1',
      prompt: 'Stage 1',
      status: 'pending',
    });
    await store.addStage({
      id: 'stg2',
      pipeline_id: 'pl1',
      stage_index: 1,
      label: 'Stage 2',
      prompt: 'Stage 2',
      status: 'pending',
    });

    await runner.start('pl1');

    const tasks = await store.listTasks();
    
    // Complete first task
    await store.markRunning(tasks[0].id);
    await store.markCompleted(tasks[0].id);
    let completedTask = await store.getTask(tasks[0].id);
    await runner.onTaskCompleted(completedTask!);

    // Complete second task
    const updatedTasks = await store.listTasks();
    await store.markRunning(updatedTasks[1].id);
    await store.markCompleted(updatedTasks[1].id);
    completedTask = await store.getTask(updatedTasks[1].id);
    await runner.onTaskCompleted(completedTask!);

    const finalPipeline = await store.getPipeline('pl1');
    expect(finalPipeline?.status).toBe('completed');
  });

  it('should mark pipeline as failed when a task fails', async () => {
    const now = Date.now();
    await store.addPipeline({
      id: 'pl1',
      name: 'Test Pipeline',
      directory: '',
      status: 'pending',
      current_stage: 0,
      created_at: now,
      updated_at: now,
    });
    await store.addStage({
      id: 'stg1',
      pipeline_id: 'pl1',
      stage_index: 0,
      label: 'Stage 1',
      prompt: 'Stage 1',
      status: 'pending',
    });
    await store.addStage({
      id: 'stg2',
      pipeline_id: 'pl1',
      stage_index: 1,
      label: 'Stage 2',
      prompt: 'Stage 2',
      status: 'pending',
    });

    await runner.start('pl1');

    const tasks = await store.listTasks();
    await store.markRunning(tasks[0].id);
    // Directly update to failed status to bypass retry logic
    await store.updateTask(tasks[0].id, { status: 'failed', error: 'Test error' });

    const failedTask = await store.getTask(tasks[0].id);
    expect(failedTask?.status).toBe('failed');
    
    await runner.onTaskCompleted(failedTask!);

    const finalPipeline = await store.getPipeline('pl1');
    expect(finalPipeline?.status).toBe('failed');
  });

  it('should emit events on stage transitions', async () => {
    const now = Date.now();
    await store.addPipeline({
      id: 'pl1',
      name: 'Test Pipeline',
      directory: '',
      status: 'pending',
      current_stage: 0,
      created_at: now,
      updated_at: now,
    });
    await store.addStage({
      id: 'stg1',
      pipeline_id: 'pl1',
      stage_index: 0,
      label: 'Stage 1',
      prompt: 'Stage 1',
      status: 'pending',
    });
    await store.addStage({
      id: 'stg2',
      pipeline_id: 'pl1',
      stage_index: 1,
      label: 'Stage 2',
      prompt: 'Stage 2',
      status: 'pending',
    });

    const eventHandler = vi.fn();
    eventBus.on('status', eventHandler);

    await runner.start('pl1');

    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        pipeline: expect.objectContaining({
          id: 'pl1',
          status: 'running',
        }),
      })
    );
  });

  it('should skip remaining stages on failure', async () => {
    const now = Date.now();
    await store.addPipeline({
      id: 'pl1',
      name: 'Test Pipeline',
      directory: '',
      status: 'pending',
      current_stage: 0,
      created_at: now,
      updated_at: now,
    });
    await store.addStage({
      id: 'stg1',
      pipeline_id: 'pl1',
      stage_index: 0,
      label: 'Stage 1',
      prompt: 'Stage 1',
      status: 'pending',
    });
    await store.addStage({
      id: 'stg2',
      pipeline_id: 'pl1',
      stage_index: 1,
      label: 'Stage 2',
      prompt: 'Stage 2',
      status: 'pending',
    });

    await runner.start('pl1');

    const tasks = await store.listTasks();
    await store.markRunning(tasks[0].id);
    // Directly update to failed status to bypass retry logic
    await store.updateTask(tasks[0].id, { status: 'failed', error: 'Test error' });

    const failedTask = await store.getTask(tasks[0].id);
    expect(failedTask?.status).toBe('failed');
    
    await runner.onTaskCompleted(failedTask!);

    const stages = await store.getStages('pl1');
    expect(stages[1].status).toBe('skipped');
  });

  it('should abort a running pipeline', async () => {
    const now = Date.now();
    await store.addPipeline({
      id: 'pl1',
      name: 'Test Pipeline',
      directory: '',
      status: 'pending',
      current_stage: 0,
      created_at: now,
      updated_at: now,
    });
    await store.addStage({
      id: 'stg1',
      pipeline_id: 'pl1',
      stage_index: 0,
      label: 'Stage 1',
      prompt: 'Stage 1',
      status: 'pending',
    });

    await runner.start('pl1');
    await runner.abort('pl1');

    const pipeline = await store.getPipeline('pl1');
    expect(pipeline?.status).toBe('failed');
  });
});
