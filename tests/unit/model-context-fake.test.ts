// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installModelContextFake,
  type ModelContextFake,
} from "../../src/test/model-context-fake";

describe("model context fake contract", () => {
  let fake: ModelContextFake | undefined;

  afterEach(() => fake?.restore());

  it("models async registration and passes execute an AbortSignal context", async () => {
    fake = installModelContextFake();
    const execute = vi.fn<WebMCP.ToolExecuteCallback>(() => ({ ok: true }));
    const controller = new AbortController();

    const registration = document.modelContext?.registerTool(
      {
        name: "inspect_incident",
        description: "Inspect incident",
        inputSchema: { type: "object" },
        execute,
      },
      { signal: controller.signal },
    );

    expect(registration).toBeInstanceOf(Promise);
    await registration;
    await fake.invoke("inspect_incident", { incidentId: "inc_001" });
    expect(execute).toHaveBeenCalledOnce();
    const [receivedInput, receivedOptions] = execute.mock.calls[0] ?? [];
    expect(receivedInput).toEqual({ incidentId: "inc_001" });
    expect(receivedOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  it("asynchronously rejects registration with an already-aborted signal", async () => {
    fake = installModelContextFake();
    const controller = new AbortController();
    controller.abort();

    const registration = document.modelContext?.registerTool(
      {
        name: "inspect_incident",
        description: "Inspect incident",
        inputSchema: { type: "object" },
        execute: vi.fn(),
      },
      { signal: controller.signal },
    );

    expect(registration).toBeInstanceOf(Promise);
    await expect(registration).rejects.toMatchObject({ name: "AbortError" });
    expect(fake.registeredNames()).toEqual([]);
  });

  it("waits for deterministic injected registration success or failure", async () => {
    let resolveRegistration!: () => void;
    let rejectRegistration!: (reason: Error) => void;
    const outcomes = [
      new Promise<void>((resolve) => {
        resolveRegistration = resolve;
      }),
      new Promise<void>((_resolve, reject) => {
        rejectRegistration = reject;
      }),
    ];
    fake = installModelContextFake({
      register: () => outcomes.shift() ?? Promise.resolve(),
    });
    const tool = {
      name: "inspect_incident",
      description: "Inspect incident",
      inputSchema: { type: "object" },
      execute: vi.fn(),
    };

    const successful = document.modelContext?.registerTool(tool);
    await Promise.resolve();
    expect(fake.registeredNames()).toEqual([]);
    resolveRegistration();
    await successful;
    expect(fake.registeredNames()).toEqual(["inspect_incident"]);

    const failed = document.modelContext?.registerTool({
      ...tool,
      name: "query_signals",
    });
    rejectRegistration(new Error("injected registration failure"));
    await expect(failed).rejects.toThrow("injected registration failure");
    expect(fake.registeredNames()).toEqual(["inspect_incident"]);
  });

  it("exposes and promptly rejects cancellation during delayed registration", async () => {
    let injectedSignal: AbortSignal | undefined;
    fake = installModelContextFake({
      register: ({ signal }) => {
        injectedSignal = signal;
        return new Promise<void>(() => undefined);
      },
    });
    const controller = new AbortController();
    let rejectionName: string | undefined;
    document.modelContext
      ?.registerTool(
        {
          name: "inspect_incident",
          description: "Inspect incident",
          inputSchema: { type: "object" },
          execute: vi.fn(),
        },
        { signal: controller.signal },
      )
      .catch((error: unknown) => {
        rejectionName = error instanceof DOMException ? error.name : "other";
      });
    await Promise.resolve();

    expect(injectedSignal).toBe(controller.signal);
    controller.abort();
    await Promise.resolve();
    await Promise.resolve();

    expect(rejectionName).toBe("AbortError");
    expect(fake.registeredNames()).toEqual([]);
  });
});
