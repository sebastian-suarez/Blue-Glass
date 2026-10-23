import fs from "node:fs";
import path from "node:path";
import { root } from "./lib/reference.ts";

fs.rmSync(path.join(root, "dist"), { recursive: true, force: true });
