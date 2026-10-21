import { useEffect, useRef } from "react";
import * as blueGlass from "@sebastian-suarez/blue-glass";

/**
Shows that the package's JS entry resolves in an island: it renders the entry's export
count, and an effect, which only runs once the island hydrates, marks it hydrated.
*/
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
