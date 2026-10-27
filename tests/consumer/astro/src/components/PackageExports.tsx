import { useEffect, useRef } from "react";
import * as blueGlass from "@sebastian-suarez/blue-glass";

export function PackageExports() {
	const ref = useRef<HTMLParagraphElement>(null);
	useEffect(() => {
		ref.current?.setAttribute("data-hydrated", "");
	}, []);

	return (
		<p ref={ref} id="package-exports">
			The package entry exports <output>{Object.keys(blueGlass).length}</output>{" "}
			values.
		</p>
	);
}
