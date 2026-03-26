export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["assets/models/README.md","assets/textures/507_0/README.md","assets/textures/7_44/README.md"]),
	mimeTypes: {".md":"text/markdown"},
	_: {
		client: {start:"_app/immutable/entry/start.C5FzW1__.js",app:"_app/immutable/entry/app.DPVe3E6c.js",imports:["_app/immutable/entry/start.C5FzW1__.js","_app/immutable/chunks/3ih-b17J.js","_app/immutable/chunks/DmyYDtSF.js","_app/immutable/chunks/Dw6Ka_Vn.js","_app/immutable/chunks/BUApaBEI.js","_app/immutable/entry/app.DPVe3E6c.js","_app/immutable/chunks/DmyYDtSF.js","_app/immutable/chunks/IJ4SYC2v.js","_app/immutable/chunks/Bxc7W1O4.js","_app/immutable/chunks/Dw6Ka_Vn.js","_app/immutable/chunks/D1BUG9yL.js","_app/immutable/chunks/-_YMUeiT.js","_app/immutable/chunks/WHZHqRvX.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
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
				id: "/builder",
				pattern: /^\/builder\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/share/[slug]",
				pattern: /^\/share\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/u/[steamId]",
				pattern: /^\/u\/([^/]+?)\/?$/,
				params: [{"name":"steamId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
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
