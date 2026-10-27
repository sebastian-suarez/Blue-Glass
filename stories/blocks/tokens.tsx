import { Unstyled } from "@storybook/addon-docs/blocks";
import type { CSSProperties, ReactNode } from "react";
import tokens from "../../design-system/tokens/tokens.json" with { type: "json" };

type Token = {
	readonly name: string;
	readonly value: string;
	readonly usage: string;
};

const alias = /^\{(?<target>[^\{\}]+)\}$/v;

function describe(token: Token, family: readonly Token[]): string {
	const target = alias.exec(token.value)?.groups?.target;
	if (target === undefined) {
		return token.value;
	}

	const resolved = family.find(({ name }) => name === target)?.value;
	return `${resolved ?? token.value}, from --${target}`;
}

const block: CSSProperties = {
	color: "var(--color-ink)",
	fontFamily: "var(--font-sans)",
	margin: "16px 0 40px",
};

const mono: CSSProperties = {
	fontFamily: "var(--font-mono)",
	fontSize: 13,
	lineHeight: 1.5,
};

const note: CSSProperties = {
	margin: 0,
	fontSize: 13,
	lineHeight: 1.6,
	color: "var(--color-muted)",
};

export function ColorSwatches() {
	const family = tokens.color.tokens;
	return (
		<Unstyled
			style={{
				...block,
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
				gap: 16,
			}}
		>
			{family.map((token) => (
				<figure
					key={token.name}
					style={{
						display: "grid",
						alignContent: "start",
						gap: 8,
						margin: 0,
					}}
				>
					<div
						style={{
							height: 72,
							borderRadius: 14,
							border: "1px solid var(--color-line)",
							background: `linear-gradient(var(--${token.name}), var(--${token.name})), var(--color-canvas)`,
						}}
					/>
					<figcaption style={{ display: "grid", gap: 2 }}>
						<code style={{ ...mono, fontWeight: 600 }}>--{token.name}</code>
						<code
							style={{ ...mono, fontSize: 12, color: "var(--color-muted)" }}
						>
							{describe(token, family)}
						</code>
						<span style={{ ...note, fontSize: 12, lineHeight: 1.5 }}>
							{token.usage}
						</span>
					</figcaption>
				</figure>
			))}
		</Unstyled>
	);
}

type TypeStyle = {
	readonly name: string;
	readonly fontSize: string;
	readonly lineHeight: number | string;
	readonly fontWeight: number;
	readonly letterSpacing?: string;
	readonly usage: string;
	readonly sample?: string;
};

const typeGroups: ReadonlyArray<{
	readonly name: string;
	readonly styles: readonly TypeStyle[];
}> = tokens.type.groups;

const fallbackSample =
	"Cut PDF generation from about 6 seconds to 10–20 milliseconds.";

export function TypeStyles() {
	return (
		<Unstyled style={{ ...block, display: "grid", gap: 40 }}>
			{typeGroups.map((group) => (
				<section key={group.name} style={{ display: "grid", gap: 24 }}>
					<h3 className="text-label" style={{ margin: 0 }}>
						{group.name}
					</h3>
					{group.styles.map((style) => (
						<div key={style.name} style={{ display: "grid", gap: 8 }}>
							<p className={style.name} style={{ margin: 0 }}>
								{style.sample ?? fallbackSample}
							</p>
							<p
								style={{ ...note, display: "flex", flexWrap: "wrap", gap: 12 }}
							>
								<code style={{ ...mono, color: "var(--color-ink)" }}>
									.{style.name}
								</code>
								<span>
									{[
										style.fontSize,
										`/ ${style.lineHeight}`,
										style.fontWeight,
										style.letterSpacing,
									]
										.filter((part) => part !== undefined)
										.join(" ")}
								</span>
								<span>{style.usage}</span>
							</p>
						</div>
					))}
				</section>
			))}
		</Unstyled>
	);
}

type Family =
	| "spacing"
	| "radius"
	| "shadow"
	| "blur"
	| "easing"
	| "duration"
	| "zIndex"
	| "size";

const samples: Partial<Record<Family, (variable: string) => ReactNode>> = {
	spacing: (variable) => (
		<div
			style={{
				width: `var(${variable})`,
				height: 12,
				borderRadius: 3,
				background: "var(--color-blue)",
			}}
		/>
	),
	radius: (variable) => (
		<div
			style={{
				width: 96,
				height: 64,
				borderRadius: `var(${variable})`,
				border: "1.5px solid var(--dg-edge)",
				background: "var(--glass-raised)",
			}}
		/>
	),
	shadow: (variable) => (
		<div
			style={{
				width: 72,
				height: 44,
				borderRadius: 12,
				background: "#fff",
				boxShadow: `var(${variable})`,
			}}
		/>
	),
};

const cell: CSSProperties = {
	padding: "12px 16px 12px 0",
	borderTop: "1px solid var(--color-line)",
	fontSize: 13,
	lineHeight: "20px",
	textAlign: "left",
	verticalAlign: "top",
};

export function TokenTable({ family }: { readonly family: Family }) {
	const group: { readonly note?: string; readonly tokens: readonly Token[] } =
		tokens[family];
	const sample = samples[family];
	const gutter = (column: string) =>
		column === "Sample" || (column === "Note" && sample !== undefined) ? 16 : 0;
	return (
		<Unstyled style={{ ...block, display: "grid", gap: 12 }}>
			{group.note === undefined ? null : <p style={note}>{group.note}</p>}
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead>
					<tr>
						{["Token", "Value", sample ? "Sample" : null, "Note"]
							.filter((heading) => heading !== null)
							.map((heading) => (
								<th
									key={heading}
									scope="col"
									className="text-label"
									style={{
										...cell,
										width: heading === "Token" ? 220 : undefined,
										paddingLeft: gutter(heading),
										borderTop: "none",
										color: "var(--color-muted)",
									}}
								>
									{heading}
								</th>
							))}
					</tr>
				</thead>
				<tbody>
					{group.tokens.map((token) => (
						<tr key={token.name}>
							<td style={{ ...cell, whiteSpace: "nowrap" }}>
								<code
									style={{ ...mono, lineHeight: "inherit", fontWeight: 600 }}
								>
									--{token.name}
								</code>
							</td>
							<td style={cell}>
								<code style={{ ...mono, lineHeight: "inherit" }}>
									{token.value}
								</code>
							</td>
							{sample ? (
								<td
									style={{
										...cell,
										background: "var(--color-canvas)",
										paddingLeft: gutter("Sample"),
									}}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											minHeight: 20,
										}}
									>
										{sample(`--${token.name}`)}
									</div>
								</td>
							) : null}
							<td
								style={{
									...cell,
									paddingLeft: gutter("Note"),
									color: "var(--color-muted)",
								}}
							>
								{token.usage}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Unstyled>
	);
}
