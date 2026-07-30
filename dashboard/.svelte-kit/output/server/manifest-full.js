export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.svg"]),
	mimeTypes: {".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.B3UuJ63C.js",app:"_app/immutable/entry/app.DK0VqQTb.js",imports:["_app/immutable/entry/start.B3UuJ63C.js","_app/immutable/chunks/CdbK5dkV.js","_app/immutable/chunks/Bs94_2Mz.js","_app/immutable/entry/app.DK0VqQTb.js","_app/immutable/chunks/Bs94_2Mz.js","_app/immutable/chunks/HclGiUj8.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/architecture",
				pattern: /^\/api\/architecture\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/architecture/_server.ts.js'))
			},
			{
				id: "/api/context",
				pattern: /^\/api\/context\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/context/_server.ts.js'))
			},
			{
				id: "/api/health",
				pattern: /^\/api\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/health/_server.ts.js'))
			},
			{
				id: "/api/memory",
				pattern: /^\/api\/memory\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/memory/_server.ts.js'))
			},
			{
				id: "/api/memory/[id]",
				pattern: /^\/api\/memory\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/memory/_id_/_server.ts.js'))
			},
			{
				id: "/api/services",
				pattern: /^\/api\/services\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/services/_server.ts.js'))
			},
			{
				id: "/api/state",
				pattern: /^\/api\/state\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/state/_server.ts.js'))
			},
			{
				id: "/api/timeline",
				pattern: /^\/api\/timeline\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/timeline/_server.ts.js'))
			},
			{
				id: "/architecture",
				pattern: /^\/architecture\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/health",
				pattern: /^\/health\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/memory",
				pattern: /^\/memory\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/services",
				pattern: /^\/services\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/timeline",
				pattern: /^\/timeline\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
