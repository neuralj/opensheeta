const manifest = (() => {
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
		client: {start:"_app/immutable/entry/start.DSJJDHC6.js",app:"_app/immutable/entry/app.BWiw17pt.js",imports:["_app/immutable/entry/start.DSJJDHC6.js","_app/immutable/chunks/CpwKoztI.js","_app/immutable/chunks/DPlfsHk4.js","_app/immutable/entry/app.BWiw17pt.js","_app/immutable/chunks/DPlfsHk4.js","_app/immutable/chunks/HclGiUj8.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js-D86aQh0P.js')),
			__memo(() => import('./nodes/1.js-k-6BNJnS.js')),
			__memo(() => import('./nodes/2.js-B3fLNGuN.js')),
			__memo(() => import('./nodes/3.js-CpsFgUXk.js')),
			__memo(() => import('./nodes/4.js-9f2NwJ78.js')),
			__memo(() => import('./nodes/5.js-BoFkZ7Ul.js')),
			__memo(() => import('./nodes/6.js-BaJOo1gV.js')),
			__memo(() => import('./nodes/7.js-BP0lSOzE.js')),
			__memo(() => import('./nodes/8.js-BIc-NyV6.js'))
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
				endpoint: __memo(() => import('./entries/endpoints/api/architecture/_server.ts.js-BxrD6YPt.js'))
			},
			{
				id: "/api/churn",
				pattern: /^\/api\/churn\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/churn/_server.ts.js-Bd6wBvIi.js'))
			},
			{
				id: "/api/context",
				pattern: /^\/api\/context\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/context/_server.ts.js-WSR8xdfH.js'))
			},
			{
				id: "/api/drift",
				pattern: /^\/api\/drift\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/drift/_server.ts.js-BoNmH5bV.js'))
			},
			{
				id: "/api/files",
				pattern: /^\/api\/files\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/files/_server.ts.js-BrBkzxFY.js'))
			},
			{
				id: "/api/health",
				pattern: /^\/api\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/health/_server.ts.js-BdBWUeUt.js'))
			},
			{
				id: "/api/memory",
				pattern: /^\/api\/memory\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/memory/_server.ts.js-BPdgxyJU.js'))
			},
			{
				id: "/api/memory/[id]",
				pattern: /^\/api\/memory\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/memory/_id_/_server.ts.js-BvQIgznI.js'))
			},
			{
				id: "/api/quality",
				pattern: /^\/api\/quality\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/quality/_server.ts.js-CMVmIMhx.js'))
			},
			{
				id: "/api/services",
				pattern: /^\/api\/services\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/services/_server.ts.js-Ct8iLSov.js'))
			},
			{
				id: "/api/state",
				pattern: /^\/api\/state\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/state/_server.ts.js-DJFirbLC.js'))
			},
			{
				id: "/api/timeline",
				pattern: /^\/api\/timeline\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/timeline/_server.ts.js-B8-nvSeS.js'))
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
			},
			{
				id: "/health",
				pattern: /^\/health\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/memory",
				pattern: /^\/memory\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/services",
				pattern: /^\/services\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/timeline",
				pattern: /^\/timeline\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
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

export { manifest as m };
//# sourceMappingURL=manifest.js-Dc0I96Yp.js.map
