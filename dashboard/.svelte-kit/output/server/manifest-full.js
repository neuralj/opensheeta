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
		client: {start:"_app/immutable/entry/start.Bm1WMt17.js",app:"_app/immutable/entry/app.CNExc2rE.js",imports:["_app/immutable/entry/start.Bm1WMt17.js","_app/immutable/chunks/BZZjnHtX.js","_app/immutable/chunks/-PF2xQ_t.js","_app/immutable/entry/app.CNExc2rE.js","_app/immutable/chunks/-PF2xQ_t.js","_app/immutable/chunks/HclGiUj8.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js'))
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
				id: "/api/files",
				pattern: /^\/api\/files\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/files/_server.ts.js'))
			},
			{
				id: "/api/state",
				pattern: /^\/api\/state\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/state/_server.ts.js'))
			},
			{
				id: "/architecture",
				pattern: /^\/architecture\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/browse",
				pattern: /^\/browse\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
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
