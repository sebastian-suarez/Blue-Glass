import { test } from "vitest";

const target = import.meta.env.BLUE_GLASS_TARGET as "package" | "reference";

/**
A spec the reference fails because of a defect listed in docs/reference-defects.md. On the
reference it must fail, so a fixed reference shows up; on the package it must pass, like every
other spec.
*/
export const referenceDefectTest = target === "reference" ? test.fails : test;
