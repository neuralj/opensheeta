import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/scheduler/event-bus.js';

describe('EventBus', () => {
  it('should emit and listen to task events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    
    bus.on('task', handler);
    bus.emitTask({ id: 'task1', status: 'completed' });
    
    expect(handler).toHaveBeenCalledWith({ id: 'task1', status: 'completed' });
  });

  it('should emit and listen to status events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    
    bus.on('status', handler);
    bus.emitStatus({ pending: 5, paused: false, cooldowns: [] });
    
    expect(handler).toHaveBeenCalledWith({ pending: 5, paused: false, cooldowns: [] });
  });

  it('should support multiple listeners', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    
    bus.on('task', handler1);
    bus.on('task', handler2);
    bus.emitTask({ id: 'task1', status: 'running' });
    
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should support removing listeners', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    
    bus.on('task', handler);
    bus.off('task', handler);
    bus.emitTask({ id: 'task1', status: 'completed' });
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('should include optional fields in task events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    
    bus.on('task', handler);
    bus.emitTask({ 
      id: 'task1', 
      status: 'failed', 
      error: 'Test error',
      pipeline_id: 'pl1',
      stage: 2 
    });
    
    expect(handler).toHaveBeenCalledWith({
      id: 'task1',
      status: 'failed',
      error: 'Test error',
      pipeline_id: 'pl1',
      stage: 2
    });
  });

  it('should include optional fields in status events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    
    bus.on('status', handler);
    bus.emitStatus({ 
      offline: true, 
      task_id: 'task1',
      pipeline: { id: 'pl1', status: 'running', stage: 1, total: 3 }
    });
    
    expect(handler).toHaveBeenCalledWith({
      offline: true,
      task_id: 'task1',
      pipeline: { id: 'pl1', status: 'running', stage: 1, total: 3 }
    });
  });
});
