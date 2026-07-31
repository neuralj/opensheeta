import type { Layer } from './types.js';

export const LAYER_COLORS: Record<Layer, string> = {
	scheduler: '#89b4fa',
	endpoint: '#a6e3a1',
	handler: '#f9e2af',
	adapter: '#cba6f7',
	config: '#94e2d5',
	types: '#f38ba8',
	shared: '#f5c2e7',
	other: '#6c7086',
};

export const ALLOWED_DEPS: Record<Layer, Layer[]> = {
	scheduler: ['handler', 'adapter', 'config', 'types', 'shared'],
	endpoint: ['handler', 'config', 'types', 'shared'],
	handler: ['adapter', 'config', 'types', 'shared'],
	adapter: ['config', 'types', 'shared'],
	config: ['types', 'shared'],
	types: ['shared'],
	shared: [],
	other: [],
};

export const LAYER_ORDER: Layer[] = ['scheduler', 'endpoint', 'handler', 'adapter', 'config', 'types', 'shared'];
