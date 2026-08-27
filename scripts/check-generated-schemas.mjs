import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const files = ["tool-inputs.schema.json", "tool-results.schema.json"];
const before = await Promise.all(
  files.map((file) =>
    readFile(
      new URL(`../src/schemas/generated/${file}`, import.meta.url),
      "utf8",
    ),
  ),
);
const generated = spawnSync(
  process.execPath,
  ["scripts/generate-schemas.mjs"],
  {
    encoding: "utf8",
  },
);
if (generated.status !== 0)
  throw new Error(generated.stderr || generated.stdout);
const after = await Promise.all(
  files.map((file) =>
    readFile(
      new URL(`../src/schemas/generated/${file}`, import.meta.url),
      "utf8",
    ),
  ),
);
if (before.some((contents, index) => contents !== after[index])) {
  throw new Error("Generated schemas drifted; run npm run schemas:generate");
}
console.log(
  `Schema drift check passed: ${files.length} files are reproducible.`,
);
