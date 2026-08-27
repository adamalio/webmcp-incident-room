import { existsSync } from "node:fs";

const generatedSchemaDirectory = new URL(
  "../src/schemas/generated/",
  import.meta.url,
);

if (existsSync(generatedSchemaDirectory)) {
  throw new Error("Generated schemas are outside Tracer 0 scope");
}

console.log("Schema check passed: Tracer 0 has no generated schemas.");
