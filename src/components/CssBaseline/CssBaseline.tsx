"use client";
import type * as React from "react";
import { useIsoLayoutEffect } from "../../internal/hooks.js";

const css = `
@layer gl-base {
  html { -webkit-text-size-adjust: 100%; tab-size: 4; color-scheme: light; }
  @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
  h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd, pre { margin: 0; }
  h1, h2, h3, h4 { font-weight: 500; line-height: 1.15; text-wrap: balance; }
  p { text-wrap: pretty; }
  ul, ol, menu { margin: 0; padding: 0; list-style: none; }
  img, svg, video, canvas { display: block; vertical-align: middle; }
  img, video { max-width: 100%; height: auto; }
  button, input, select, textarea { font: inherit; color: inherit; letter-spacing: inherit; }
  button { background: none; border: 0; padding: 0; cursor: pointer; }
  a { color: inherit; text-decoration: none; -webkit-tap-highlight-color: transparent; }
  table { border-collapse: collapse; }
  [hidden]:where(:not([hidden="until-found"])) { display: none !important; }
}`;

let users = 0;
let styleElement: HTMLStyleElement | undefined;

export type CssBaselineProps = {
	children?: React.ReactNode;
};

export function CssBaseline({
	children,
}: CssBaselineProps): React.ReactElement {
	useIsoLayoutEffect(() => {
		users += 1;
		if (styleElement === undefined) {
			styleElement = document.createElement("style");
			styleElement.dataset.gl = "css-baseline";
			styleElement.textContent = css;
			document.head.prepend(styleElement);
		}

		return () => {
			users -= 1;
			if (styleElement === undefined || users > 0) {
				return;
			}

			styleElement.remove();
			styleElement = undefined;
		};
	}, []);
	return <>{children}</>;
}
