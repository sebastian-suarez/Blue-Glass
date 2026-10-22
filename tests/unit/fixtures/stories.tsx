/**
CSF modules for the stories guard's self-test (tests/unit/stories.test.ts): a probe component, and
Default stories that wire its args, or fail to, in the ways a real stories file can.
*/
import type { composeStories } from "@storybook/react-vite";
import { createContext, use, type CSSProperties, type ReactNode } from "react";
import { useArgs } from "storybook/preview-api";

type StoriesModule = Parameters<typeof composeStories>[0];

/**
A stories module: its meta as `default`, and its stories under their export names.
*/
export type CsfModule = Record<string, unknown> & {
	readonly default: StoriesModule["default"];
};

type ProbeProps = {
	readonly label?: string;
	readonly tone?: "plain" | "loud";
	readonly value?: string;
	readonly selected?: boolean;
	readonly style?: CSSProperties;
};

export function Probe({ label = "probe", tone = "plain", style }: ProbeProps) {
	return (
		<span data-tone={tone} style={style}>
			{label}
		</span>
	);
}

const GroupValueContext = createContext<string | undefined>(undefined);

/**
Owns its items' selection, as ToggleButtonGroup does.
*/
function ProbeGroup({
	value,
	children,
}: {
	readonly value: string;
	readonly children: ReactNode;
}) {
	return <GroupValueContext value={value}>{children}</GroupValueContext>;
}

/**
Selected by its own prop alone, and by the group's value in a group.
*/
export function ProbeItem({ value = "a", selected = false }: ProbeProps) {
	const group = use(GroupValueContext);
	return (
		<span data-selected={group === undefined ? selected : group === value}>
			{value}
		</span>
	);
}

/**
A story's own helper, which passes the args on.
*/
function Wrapper(props: ProbeProps) {
	return (
		<div>
			<Probe {...props} />
		</div>
	);
}

/**
A story render that keeps its state in the args, through useArgs.
*/
function LabelSwitch(props: ProbeProps) {
	const [, updateArgs] = useArgs<ProbeProps>();
	return (
		<button
			type="button"
			onClick={() => {
				updateArgs({ label: props.label === "a" ? "b" : "a" });
			}}
		>
			{props.label}
		</button>
	);
}

const meta = { title: "Fixtures/Probe", component: Probe };
const args = { label: "probe", tone: "plain" } as const;
const listed = (...keys: string[]) => ({
	controls: { disable: false, include: keys },
});
const off = { controls: { disable: true } };

const good = {
	args,
	parameters: listed("label", "tone"),
	render: (props: ProbeProps) => <Probe {...props} />,
};

/* eslint-disable @typescript-eslint/naming-convention -- the keys are CSF export names */

/**
Each must fail the guard with its problem.
*/
export const failing: Record<
	string,
	{ readonly module: CsfModule; readonly problem: string }
> = {
	ignoredArg: {
		module: {
			default: meta,
			Default: {
				args,
				parameters: listed("label"),
				render: (_props: ProbeProps) => <Probe label="fixed" />,
			},
		},
		problem: "label doesn't change the render",
	},
	overriddenArg: {
		module: {
			default: meta,
			Default: {
				args,
				parameters: listed("label"),
				render: (props: ProbeProps) => <Probe {...props} label="fixed" />,
			},
		},
		problem: "label doesn't change the render",
	},
	droppedArg: {
		module: {
			default: meta,
			Default: {
				args,
				parameters: listed("label", "tone"),
				render: ({ tone }: ProbeProps) => <Probe tone={tone} />,
			},
		},
		problem: "label doesn't change the render",
	},
	groupOwnedArg: {
		module: {
			default: { ...meta, component: ProbeItem },
			Default: {
				args: { value: "a", selected: false },
				parameters: listed("selected"),
				render: (props: ProbeProps) => (
					<ProbeGroup value="a">
						<ProbeItem {...props} />
					</ProbeGroup>
				),
			},
		},
		problem: "selected doesn't change the render",
	},
	controlsOnElsewhere: {
		module: {
			default: meta,
			Default: good,
			Variants: {
				parameters: { controls: { disable: false } },
				render: () => <Probe />,
			},
		},
		problem: "Variants leaves Controls on",
	},
	nothingListed: {
		module: {
			default: meta,
			Default: { ...good, parameters: { controls: { disable: false } } },
		},
		problem: "Default lists no args in controls.include",
	},
	defaultOff: {
		module: { default: meta, Default: { ...good, parameters: off } },
		problem: "Default turns Controls off",
	},
	objectArg: {
		module: {
			default: meta,
			Default: {
				...good,
				args: { ...args, style: { color: "red" } },
				parameters: listed("style"),
			},
		},
		problem: "style has no boolean, number or string value",
	},
	notAProp: {
		module: {
			default: meta,
			Default: {
				args: { ...args, mood: "calm" },
				parameters: listed("mood"),
				render: ({ mood }: { mood?: string }) => <Probe label={mood} />,
			},
		},
		problem: "mood isn't a prop of Probe, so it needs argTypes",
	},
	noDefault: {
		module: {
			default: meta,
			Variants: { parameters: off, render: () => <Probe /> },
		},
		problem: "no Default story",
	},
};

/**
Each must pass the guard.
*/
export const passing: Record<string, CsfModule> = {
	defaultParameter: {
		default: meta,
		Default: {
			...good,
			render: (props: ProbeProps = {}) => <Probe {...props} />,
		},
	},
	inheritedRender: {
		default: { ...meta, render: (props: ProbeProps) => <Probe {...props} /> },
		Default: { args, parameters: listed("label", "tone") },
	},
	componentRender: {
		default: meta,
		Default: { args, parameters: listed("label", "tone") },
	},
	wrappingHelper: {
		default: meta,
		Default: { ...good, render: (props: ProbeProps) => <Wrapper {...props} /> },
	},
	optionsArg: {
		default: meta,
		Default: {
			...good,
			argTypes: { tone: { options: ["plain", "loud"] } },
		},
	},
	bridgedState: {
		default: meta,
		Default: {
			args: { label: "a" },
			argTypes: { label: { control: "inline-radio", options: ["a", "b"] } },
			parameters: listed("label"),
			render: LabelSwitch,
		},
	},
	declaredArg: {
		default: meta,
		Default: {
			args: { mood: "calm" },
			argTypes: {
				mood: { control: "inline-radio", options: ["calm", "keen"] },
			},
			parameters: listed("mood"),
			render: ({ mood }: { mood?: string }) => <Probe label={mood} />,
		},
	},
	otherStoriesOff: {
		default: meta,
		Default: good,
		Variants: { parameters: off, render: () => <Probe /> },
	},
};

/* eslint-enable @typescript-eslint/naming-convention */
