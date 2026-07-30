import { describe, it, expect, vi } from 'vitest';
import { createGUIBroadcast } from '../src/adapters/gui-broadcast.js';
import { createLogger } from '../src/shared/logger.js';

describe('GUIBroadcast', () => {
  it('should register and unregister connections', () => {
    const logger = createLogger('error');
    const broadcast = createGUIBroadcast(logger);
    
    const ws = { readyState: 1, send: vi.fn() } as any;
    
    broadcast.register('session1', ws);
    broadcast.unregister('session1');
    
    // Should not throw
    expect(true).toBe(true);
  });

  it('should broadcast to specific session', () => {
    const logger = createLogger('error');
    const broadcast = createGUIBroadcast(logger);
    
    const ws1 = { readyState: 1, OPEN: 1, send: vi.fn() } as any;
    const ws2 = { readyState: 1, OPEN: 1, send: vi.fn() } as any;
    
    broadcast.register('session1', ws1);
    broadcast.register('session2', ws2);
    
    broadcast.broadcast('session1', { type: 'test', data: { msg: 'hello' } } as any);
    
    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify({ type: 'test', data: { msg: 'hello' } }));
    expect(ws2.send).not.toHaveBeenCalled();
  });

  it('should broadcast to all sessions', () => {
    const logger = createLogger('error');
    const broadcast = createGUIBroadcast(logger);
    
    const ws1 = { readyState: 1, OPEN: 1, send: vi.fn() } as any;
    const ws2 = { readyState: 1, OPEN: 1, send: vi.fn() } as any;
    
    broadcast.register('session1', ws1);
    broadcast.register('session2', ws2);
    
    broadcast.broadcastAll({ type: 'test', data: { msg: 'broadcast' } } as any);
    
    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });

  it('should not send to closed connections', () => {
    const logger = createLogger('error');
    const broadcast = createGUIBroadcast(logger);
    
    const ws = { readyState: 3, OPEN: 1, send: vi.fn() } as any; // 3 = CLOSED
    
    broadcast.register('session1', ws);
    broadcast.broadcast('session1', { type: 'test', data: {} } as any);
    
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('should handle multiple connections per session', () => {
    const logger = createLogger('error');
    const broadcast = createGUIBroadcast(logger);
    
    const ws1 = { readyState: 1, OPEN: 1, send: vi.fn() } as any;
    const ws2 = { readyState: 1, OPEN: 1, send: vi.fn() } as any;
    
    broadcast.register('session1', ws1);
    broadcast.register('session1', ws2);
    
    broadcast.broadcast('session1', { type: 'test', data: {} } as any);
    
    expect(ws1.send).toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });
});
