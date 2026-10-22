import { LightField } from "../src/components/LightField/index.ts";

/**
The field behind every frame, as the reference previews draw it: `<LightField variant="compact" />`.
*/
export function FrameField() {
	return <LightField variant="compact" />;
}
