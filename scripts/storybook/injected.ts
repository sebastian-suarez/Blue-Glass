import type { Check } from "./run.ts";

export const recordEvents = `(() => {
	const w = window;
	w.__glEvents = [];
	w.__glErrors = [];
	w.__glFired = 0;
	w.addEventListener("error", (event) => {
		w.__glErrors.push(String(event.message));
	});
	w.addEventListener("unhandledrejection", (event) => {
		w.__glErrors.push(String((event.reason && event.reason.message) || event.reason));
	});
	const watched = ["storyRendered", "storyArgsUpdated", "docsRendered", "storyErrored", "storyThrewException", "storyMissing", "playFunctionThrewException"];
	const plain = (payload) => {
		try {
			return JSON.parse(JSON.stringify(payload));
		} catch {
			return String(payload);
		}
	};
	const hooks = [];
	let channel;
	w.__glOnChannel = (hook) => {
		hooks.push(hook);
		if (channel) hook(channel);
	};
	Object.defineProperty(w, "__STORYBOOK_ADDONS_CHANNEL__", {
		configurable: true,
		get: () => channel,
		set(next) {
			channel = next;
			for (const type of watched) {
				next.on(type, (payload) => {
					w.__glEvents.push({ type, payload: plain(payload) });
				});
			}
			for (const hook of hooks) hook(next);
		},
	});
})();`;

export type Mutation = {
	name: string;
	story: string;
	where: "canvas" | "docs";
	check: Check;
	detail?: RegExp;
	script: string;
};

const inPreview = `if (!location.pathname.endsWith("/iframe.html")) return;`;
const selection = `(window.__STORYBOOK_PREVIEW__ && window.__STORYBOOK_PREVIEW__.currentSelection) || {}`;

export const mutations: Mutation[] = [
	{
		name: "the preview drops the panel's arg updates",
		story: "inputs-button--default",
		where: "canvas",
		check: "controls",
		script: `window.__glOnChannel((channel) => {
			${inPreview}
			const transport = channel.transports[0];
			const handler = transport.handler;
			transport.handler = function (event, ...rest) {
				if (event && event.type === "updateStoryArgs" && event.args && event.args[0] && event.args[0].storyId === TARGET) {
					window.__glFired++;
					return;
				}
				return handler.call(this, event, ...rest);
			};
		});`,
	},
	{
		name: "the preview takes the panel's arg update and changes nothing",
		story: "inputs-button--default",
		where: "canvas",
		check: "controls",
		detail: /changes nothing in the story/v,
		script: `window.__glOnChannel((channel) => {
			${inPreview}
			const transport = channel.transports[0];
			const handler = transport.handler;
			transport.handler = function (event, ...rest) {
				if (event && event.type === "updateStoryArgs" && event.args && event.args[0] && event.args[0].storyId === TARGET) {
					window.__glFired++;
					return handler.call(this, { ...event, args: [{ ...event.args[0], updatedArgs: {} }, ...event.args.slice(1)] }, ...rest);
				}
				return handler.call(this, event, ...rest);
			};
		});`,
	},
	{
		name: "the story's updateArgs never reaches the panel",
		story: "navigation-tabs--default",
		where: "canvas",
		check: "interactions",
		script: `window.__glOnChannel((channel) => {
			${inPreview}
			const transport = channel.transports[0];
			const send = transport.send;
			transport.send = function (event, ...rest) {
				if (event && event.type === "storyArgsUpdated" && event.args && event.args[0] && event.args[0].storyId === TARGET) {
					window.__glFired++;
					return;
				}
				return send.call(this, event, ...rest);
			};
		});`,
	},
	{
		name: "the first click inside the story throws",
		story: "surfaces-accordion--default",
		where: "canvas",
		check: "interactions",
		script: `let thrown = false;
		window.addEventListener("click", (event) => {
			${inPreview}
			const current = ${selection};
			if (!thrown && current.storyId === TARGET && current.viewMode === "story" && event.target.closest && event.target.closest("#storybook-root")) {
				thrown = true;
				window.__glFired++;
				throw new Error("Planted: the first click in the story throws");
			}
		}, true);`,
	},
	{
		name: "the docs page swallows clicks in its story blocks",
		story: "inputs-togglebutton--default",
		where: "docs",
		check: "interactions",
		script: `window.addEventListener("click", (event) => {
			${inPreview}
			const current = ${selection};
			if (current.viewMode === "docs" && event.target.closest && event.target.closest("#anchor--" + TARGET)) {
				event.stopImmediatePropagation();
				event.preventDefault();
				window.__glFired++;
			}
		}, true);`,
	},
	{
		name: "the docs page writes its change to the args",
		story: "navigation-tabs--default",
		where: "docs",
		check: "interactions",
		script: `window.addEventListener("click", (event) => {
			${inPreview}
			const current = ${selection};
			if (current.viewMode === "docs" && event.target.closest && event.target.closest("#anchor--" + TARGET)) {
				setTimeout(() => {
					window.__STORYBOOK_ADDONS_CHANNEL__.emit("updateStoryArgs", { storyId: TARGET, updatedArgs: { value: "projects" } });
					window.__glFired++;
				}, 0);
			}
		}, true);`,
	},
	{
		name: "the docs page writes its change to the args, then resets them",
		story: "navigation-tabs--default",
		where: "docs",
		check: "interactions",
		detail: /wrote the story's args/v,
		script: `window.addEventListener("click", (event) => {
			${inPreview}
			const current = ${selection};
			if (current.viewMode === "docs" && event.target.closest && event.target.closest("#anchor--" + TARGET)) {
				setTimeout(() => {
					const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
					channel.emit("updateStoryArgs", { storyId: TARGET, updatedArgs: { value: "projects" } });
					channel.emit("resetStoryArgs", { storyId: TARGET, argNames: ["value"] });
					window.__glFired++;
				}, 0);
			}
		}, true);`,
	},
	{
		name: "the panel hides one listed control",
		story: "inputs-button--default",
		where: "canvas",
		check: "panel",
		script: `window.__glOnChannel((channel) => {
			${inPreview}
			const transport = channel.transports[0];
			const send = transport.send;
			transport.send = function (event, ...rest) {
				const prepared = event && event.type === "storyPrepared" && event.args && event.args[0];
				if (prepared && prepared.id === TARGET && prepared.argTypes && prepared.argTypes.size) {
					const argTypes = { ...prepared.argTypes };
					delete argTypes.size;
					window.__glFired++;
					return send.call(this, { ...event, args: [{ ...prepared, argTypes }, ...event.args.slice(1)] }, ...rest);
				}
				return send.call(this, event, ...rest);
			};
		});`,
	},
];
