
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/architecture" | "/api/changes" | "/api/churn" | "/api/context" | "/api/drift" | "/api/files" | "/api/health" | "/api/memory" | "/api/memory/[id]" | "/api/quality" | "/api/services" | "/api/state" | "/api/timeline" | "/architecture" | "/browse" | "/health" | "/memory" | "/services" | "/timeline";
		RouteParams(): {
			"/api/memory/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string | undefined };
			"/api": { id?: string | undefined };
			"/api/architecture": Record<string, never>;
			"/api/changes": Record<string, never>;
			"/api/churn": Record<string, never>;
			"/api/context": Record<string, never>;
			"/api/drift": Record<string, never>;
			"/api/files": Record<string, never>;
			"/api/health": Record<string, never>;
			"/api/memory": { id?: string | undefined };
			"/api/memory/[id]": { id: string };
			"/api/quality": Record<string, never>;
			"/api/services": Record<string, never>;
			"/api/state": Record<string, never>;
			"/api/timeline": Record<string, never>;
			"/architecture": Record<string, never>;
			"/browse": Record<string, never>;
			"/health": Record<string, never>;
			"/memory": Record<string, never>;
			"/services": Record<string, never>;
			"/timeline": Record<string, never>
		};
		Pathname(): "/" | "/api/architecture" | "/api/churn" | "/api/context" | "/api/drift" | "/api/files" | "/api/health" | "/api/memory" | `/api/memory/${string}` & {} | "/api/quality" | "/api/services" | "/api/state" | "/api/timeline" | "/architecture" | "/browse" | "/health" | "/memory" | "/services" | "/timeline";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.svg" | string & {};
	}
}