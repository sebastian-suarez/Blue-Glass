import { test } from "vitest";

const target = import.meta.env.BLUE_GLASS_TARGET as "package" | "reference";

export const referenceDefectTest = target === "reference" ? test.fails : test;
