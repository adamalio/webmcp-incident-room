// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerIncidentTool,
  ToolRegistrationReconciler,
} from "../../src/webmcp/model-context";
import type { IncidentTool } from "../../src/tools/registry";

const tool = (name: string): IncidentTool => ({
  name,
  description: name,
  inputSchema: { type: "object" },
  execute: () => ({ ok: true }),
});

describe("registration supersession", () => {
  const original = Object.getOwnPropertyDescriptor(document, "modelContext");

  afterEach(() => {
    if (original) Object.defineProperty(document, "modelContext", original);
    else Reflect.deleteProperty(document, "modelContext");
  });

  it("cancels an obsolete pending registration immediately", async () => {
    let pendingSignal: AbortSignal | undefined;
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(_tool: IncidentTool, options: { signal?: AbortSignal }) {
          pendingSignal = options.signal;
          return new Promise<void>(() => undefined);
        },
      },
    });
    const reconciler = new ToolRegistrationReconciler();
    void reconciler.reconcile([tool("inspect_incident")]);
    await Promise.resolve();
    expect(pendingSignal).toBeDefined();

    void reconciler.reconcile([]);
    await Promise.resolve();

    expect(pendingSignal?.aborted).toBe(true);
    reconciler.dispose();
  });

  it("rejects an already-aborted registration without invoking the platform", async () => {
    const registerTool = vi.fn(() => new Promise<void>(() => undefined));
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: { registerTool },
    });
    const controller = new AbortController();
    controller.abort(new DOMException("Superseded", "AbortError"));

    const outcome = await Promise.race([
      registerIncidentTool(tool("inspect_incident"), controller.signal).then(
        () => "resolved",
        (error: unknown) => (error as Error).name,
      ),
      new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve("timeout");
        }, 25);
      }),
    ]);

    expect(outcome).toBe("AbortError");
    expect(registerTool).not.toHaveBeenCalled();
  });

  it("does not commit removals when a mixed desired-set update fails", async () => {
    const signals = new Map<string, AbortSignal>();
    let failBeta = false;
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(current: IncidentTool, options: { signal?: AbortSignal }) {
          if (options.signal) signals.set(current.name, options.signal);
          if (current.name === "beta" && failBeta)
            return Promise.reject(new Error("beta failed"));
          return Promise.resolve();
        },
      },
    });
    const reconciler = new ToolRegistrationReconciler();
    await reconciler.reconcile([tool("alpha"), tool("obsolete")]);
    failBeta = true;

    await expect(
      reconciler.reconcile([tool("alpha"), tool("beta")]),
    ).rejects.toThrow("beta failed");

    expect(signals.get("alpha")?.aborted).toBe(false);
    expect(signals.get("obsolete")?.aborted).toBe(false);
    expect(signals.get("beta")?.aborted).toBe(true);
    reconciler.dispose();
  });
});
