import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import {
  inspectIncidentInputSchema,
  inspectIncidentResultSchema,
  proposeMitigationInputSchema,
  querySignalsInputSchema,
  toolFailureResultSchema,
} from "../src/domain/schemas.ts";

const directory = new URL("../src/schemas/generated/", import.meta.url);
const schemas = [
  [
    "tool-inputs.schema.json",
    {
      inspect_incident: z.toJSONSchema(inspectIncidentInputSchema),
      query_signals: z.toJSONSchema(querySignalsInputSchema),
      propose_mitigation: z.toJSONSchema(proposeMitigationInputSchema),
    },
  ],
  [
    "tool-results.schema.json",
    {
      inspect_incident: z.toJSONSchema(inspectIncidentResultSchema),
      failure: z.toJSONSchema(toolFailureResultSchema),
    },
  ],
];

await mkdir(directory, { recursive: true });
for (const [filename, schema] of schemas) {
  await writeFile(
    new URL(filename, directory),
    `${JSON.stringify(schema, null, 2)}\n`,
  );
}
