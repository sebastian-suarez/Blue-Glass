import type { composeStories } from "@storybook/react-vite";
import {
	createContext,
	memo,
	use,
	useState,
	type CSSProperties,
	type ReactNode,
} from "react";
import { useArgs } from "storybook/preview-api";

type StoriesModule = Parameters<typeof composeStories>[0];

export type CsfModule = Record<string, unknown> & {
	readonly default: StoriesModule["default"];
};

type ProbeProps = {
	readonly label?: string;
	readonly defaultLabel?: string;
	readonly tone?: "plain" | "loud";
	readonly value?: string;
	readonly selected?: boolean;
	readonly style?: CSSProperties;
};

export function Probe({
	label,
	defaultLabel = "probe",
	tone = "plain",
	style,
}: ProbeProps) {
	const [initial] = useState(defaultLabel);
	return (
		<span data-tone={tone} style={style}>
			{label ?? initial}
		</span>
	);
}

export const MemoProbe = memo(Probe);

export const AnonymousProbe = memo((props: ProbeProps) => <Probe {...props} />);

const GroupValueContext = createContext<string | undefined>(undefined);

function ProbeGroup({
	value,
	children,
}: {
	readonly value: string;
	readonly children: ReactNode;
}) {
	return <GroupValueContext value={value}>{children}</GroupValueContext>;
}

export function ProbeItem({ value = "a", selected = false }: ProbeProps) {
	const group = use(GroupValueContext);
	return (
		<span data-selected={group === undefined ? selected : group === value}>
			{value}
		</span>
	);
}

function Wrapper(props: ProbeProps) {
	return (
		<div>
			<Probe {...props} />
		</div>
	);
}

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
	defaultParameter: {
		module: {
			default: meta,
			Default: {
				...good,
				render: (props: ProbeProps = {}) => <Probe {...props} />,
			},
		},
		problem: "Default's render takes no args",
	},
	mountOnlyArg: {
		module: {
			default: meta,
			Default: {
				...good,
				args: { defaultLabel: "first" },
				parameters: listed("defaultLabel"),
			},
		},
		problem: "defaultLabel is read only at mount",
	},
	unsetArg: {
		module: {
			default: meta,
			Default: {
				...good,
				args: { label: "probe" },
				parameters: listed("tone"),
			},
		},
		problem: "tone has no value in args",
	},
	singleOption: {
		module: {
			default: meta,
			Default: {
				...good,
				argTypes: { tone: { control: "inline-radio", options: ["plain"] } },
			},
		},
		problem: "tone has no other option",
	},
	deadOption: {
		module: {
			default: meta,
			Default: {
				...good,
				argTypes: {
					tone: {
						control: "inline-radio",
						options: ["plain", "loud", "quiet"],
					},
				},
				render: ({
					tone,
					...props
				}: Omit<ProbeProps, "tone"> & { tone?: string }) => (
					<Probe {...props} tone={tone === "loud" ? "loud" : "plain"} />
				),
			},
		},
		problem: 'tone doesn\'t change the render: "quiet" renders like "plain"',
	},
	alikeOptions: {
		module: {
			default: meta,
			Default: {
				...good,
				argTypes: {
					tone: {
						control: "inline-radio",
						options: ["plain", "loud", "quiet"],
					},
				},
				render: ({
					tone,
					...props
				}: Omit<ProbeProps, "tone"> & { tone?: string }) => (
					<Probe {...props} tone={tone === "plain" ? "plain" : "loud"} />
				),
			},
		},
		problem: 'tone doesn\'t change the render: "quiet" renders like "loud"',
	},
};

export const passing: Record<string, CsfModule> = {
	memoComponent: {
		default: { ...meta, component: MemoProbe },
		Default: { args, parameters: listed("label", "tone") },
	},
	anonymousComponent: {
		default: { ...meta, component: AnonymousProbe },
		Default: { args, parameters: listed("label", "tone") },
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

const phone = { viewport: { value: "phone", isRotated: false } };

export const phoneFailing: Record<
	string,
	{ readonly module: CsfModule; readonly problem: string }
> = {
	notPinned: {
		module: { default: meta, Default: good },
		problem: "no story pinned to phone",
	},
	twinOnDocs: {
		module: {
			default: meta,
			Default: good,
			DefaultOnPhone: { ...good, globals: phone },
		},
		problem: "DefaultOnPhone shows on the docs page",
	},
};

export const phonePassing: CsfModule = {
	default: meta,
	Default: good,
	DefaultOnPhone: { ...good, tags: ["!autodocs"], globals: phone },
};

/* eslint-enable @typescript-eslint/naming-convention */
