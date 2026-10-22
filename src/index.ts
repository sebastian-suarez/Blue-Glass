// Blue Glass: the public API. Each phase adds the modules it ports (tests/phases.json),
// and tests/api checks the exports against design-system/source/index.d.ts.
export {
	GLYPHS,
	Icon,
	iconNames,
	SvgIcon,
	type IconName,
	type IconProps,
	type SvgIconProps,
} from "./components/Icon/index.js";
export {
	LightField,
	type LightFieldProps,
} from "./components/LightField/index.js";
