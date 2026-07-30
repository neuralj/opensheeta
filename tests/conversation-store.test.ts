import { describe, it, expect, beforeEach } from 'vitest';
import { createConversationStore } from '../src/adapters/conversation-store.js';
import { createLogger } from '../src/shared/logger.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB = '/tmp/test-conversation-store.db';

describe('ConversationStore', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it('should create and retrieve a conversation', async () => {
    const logger = createLogger('error');
    const store = await createConversationStore(TEST_DB, logger);
    
    await store.save({
      session_id: 'session1',
      workspace: '/test/workspace',
      title: 'Test Conversation',
      model: 'gpt-4',
      mode: 'interactive',
      agent: 'coder',
      message_count: 0,
      updated_at: new Date().toISOString(),
      pinned: false,
      archived: false,
    });

    const conversation = await store.load('session1');
    expect(conversation).toBeDefined();
    expect(conversation?.title).toBe('Test Conversation');
    expect(conversation?.model).toBe('gpt-4');
  });

  it('should list all conversations', async () => {
    const logger = createLogger('error');
    const store = await createConversationStore(TEST_DB, logger);
    
    await store.save({
      session_id: 'session1',
      workspace: '/test/workspace1',
      title: 'Conversation 1',
      model: 'gpt-4',
      mode: 'interactive',
      agent: 'coder',
      message_count: 5,
      updated_at: new Date().toISOString(),
      pinned: false,
      archived: false,
    });

    await store.save({
      session_id: 'session2',
      workspace: '/test/workspace2',
      title: 'Conversation 2',
      model: 'claude-3',
      mode: 'auto',
      agent: 'researcher',
      message_count: 10,
      updated_at: new Date().toISOString(),
      pinned: true,
      archived: false,
    });

    const conversations = await store.list();
    expect(conversations).toHaveLength(2);
  });

  it('should update conversation title', async () => {
    const logger = createLogger('error');
    const store = await createConversationStore(TEST_DB, logger);
    
    await store.save({
      session_id: 'session1',
      workspace: '/test/workspace',
      title: 'Original Title',
      model: 'gpt-4',
      mode: 'interactive',
      agent: 'coder',
      message_count: 0,
      updated_at: new Date().toISOString(),
      pinned: false,
      archived: false,
    });

    await store.setTitle('session1', 'Updated Title');

    const conversation = await store.load('session1');
    expect(conversation?.title).toBe('Updated Title');
  });

  it('should pin and unpin conversations', async () => {
    const logger = createLogger('error');
    const store = await createConversationStore(TEST_DB, logger);
    
    await store.save({
      session_id: 'session1',
      workspace: '/test/workspace',
      title: 'Test',
      model: 'gpt-4',
      mode: 'interactive',
      agent: 'coder',
      message_count: 0,
      updated_at: new Date().toISOString(),
      pinned: false,
      archived: false,
    });

    await store.setFlags('session1', { pinned: true });
    let conversation = await store.load('session1');
    expect(conversation?.pinned).toBe(true);

    await store.setFlags('session1', { pinned: false });
    conversation = await store.load('session1');
    expect(conversation?.pinned).toBe(false);
  });

  it('should archive and unarchive conversations', async () => {
    const logger = createLogger('error');
    const store = await createConversationStore(TEST_DB, logger);
    
    await store.save({
      session_id: 'session1',
      workspace: '/test/workspace',
      title: 'Test',
      model: 'gpt-4',
      mode: 'interactive',
      agent: 'coder',
      message_count: 0,
      updated_at: new Date().toISOString(),
      pinned: false,
      archived: false,
    });

    await store.setFlags('session1', { archived: true });
    let conversation = await store.load('session1');
    expect(conversation?.archived).toBe(true);

    await store.setFlags('session1', { archived: false });
    conversation = await store.load('session1');
    expect(conversation?.archived).toBe(false);
  });

  it('should return null for non-existent conversation', async () => {
    const logger = createLogger('error');
    const store = await createConversationStore(TEST_DB, logger);
    
    const conversation = await store.load('nonexistent');
    expect(conversation).toBeNull();
  });
});
