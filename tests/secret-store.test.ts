import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSecretStore } from '../src/adapters/secret-store.js';
import { createLogger } from '../src/shared/logger.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_FILE = '/tmp/test-secret-store.json';

describe('SecretStore', () => {
  beforeEach(() => {
    if (existsSync(TEST_FILE)) unlinkSync(TEST_FILE);
  });

  afterEach(() => {
    if (existsSync(TEST_FILE)) unlinkSync(TEST_FILE);
  });

  it('should store and retrieve secrets', () => {
    const logger = createLogger('error');
    const store = createSecretStore(TEST_FILE, logger);
    
    store.put('api-key', { value: 'sk-test-12345' });
    
    const value = store.get('api-key');
    expect(value).toEqual({ value: 'sk-test-12345' });
  });

  it('should return null for non-existent secret', () => {
    const logger = createLogger('error');
    const store = createSecretStore(TEST_FILE, logger);
    
    const value = store.get('nonexistent');
    expect(value).toBeNull();
  });

  it('should update existing secret', () => {
    const logger = createLogger('error');
    const store = createSecretStore(TEST_FILE, logger);
    
    store.put('api-key', { value: 'old-value' });
    store.put('api-key', { value: 'new-value' });
    
    const value = store.get('api-key');
    expect(value).toEqual({ value: 'new-value' });
  });

  it('should delete secret', () => {
    const logger = createLogger('error');
    const store = createSecretStore(TEST_FILE, logger);
    
    store.put('api-key', { value: 'sk-test-12345' });
    store.delete('api-key');
    
    const value = store.get('api-key');
    expect(value).toBeNull();
  });

  it('should list all profiles with keys', () => {
    const logger = createLogger('error');
    const store = createSecretStore(TEST_FILE, logger);
    
    store.put('profile1', { key1: 'value1', key2: 'value2' });
    store.put('profile2', { apiKey: 'abc123' });
    
    const status = store.status();
    expect(status).toHaveLength(2);
    expect(status.find(s => s.profile === 'profile1')?.keys).toEqual(['key1', 'key2']);
    expect(status.find(s => s.profile === 'profile2')?.keys).toEqual(['apiKey']);
  });

  it('should persist secrets across store instances', () => {
    const logger = createLogger('error');
    
    const store1 = createSecretStore(TEST_FILE, logger);
    store1.put('persistent-key', { value: 'persistent-value' });
    
    const store2 = createSecretStore(TEST_FILE, logger);
    const value = store2.get('persistent-key');
    expect(value).toEqual({ value: 'persistent-value' });
  });

  it('should handle complex objects', () => {
    const logger = createLogger('error');
    const store = createSecretStore(TEST_FILE, logger);
    
    const complexData = {
      apiKey: 'sk-test-12345',
      metadata: {
        created: '2024-01-01',
        tags: ['production', 'api'],
      },
      enabled: true,
    };
    store.put('complex-profile', complexData);
    
    const value = store.get('complex-profile');
    expect(value).toEqual(complexData);
  });
});
