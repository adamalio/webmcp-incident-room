import type { IncidentTool } from "../tools/registry";

export type ModelContextCapability =
  "supported" | "unsupported" | "registration_error";

export function supportsModelContext(): boolean {
  return typeof document.modelContext?.registerTool === "function";
}

export async function registerIncidentTool(
  tool: IncidentTool,
  signal: AbortSignal,
): Promise<void> {
  const modelContext = document.modelContext;
  if (!modelContext) throw new Error("WebMCP is unsupported");
  const abortError = () =>
    signal.reason instanceof Error
      ? signal.reason
      : new DOMException("Registration aborted", "AbortError");
  if (signal.aborted) throw abortError();

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };

    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }

    try {
      const registration = modelContext.registerTool(tool, { signal });
      Promise.resolve(registration).then(
        () => {
          cleanup();
          resolve();
        },
        (error: unknown) => {
          cleanup();
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

interface ActiveRegistration {
  controller: AbortController;
}

export class ToolRegistrationReconciler {
  private readonly registrations = new Map<string, ActiveRegistration>();
  private readonly pendingRegistrations = new Map<string, AbortController>();
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;
  private latestDesiredKey = "";

  reconcile(tools: IncidentTool[]): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error("Tool reconciler is disposed"));
    }

    const desiredNames = new Set(tools.map((tool) => tool.name));
    const desiredKey = [...desiredNames].sort().join("\u0000");
    this.latestDesiredKey = desiredKey;

    for (const [name, controller] of this.pendingRegistrations) {
      if (!desiredNames.has(name)) controller.abort();
    }

    const operation = this.queue.then(() =>
      this.performReconciliation(tools, desiredKey),
    );
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  dispose(): void {
    this.disposed = true;
    this.latestDesiredKey = "";
    for (const registration of this.registrations.values()) {
      registration.controller.abort();
    }
    for (const controller of this.pendingRegistrations.values()) {
      controller.abort();
    }
    this.registrations.clear();
    this.pendingRegistrations.clear();
  }

  private isDisposed(): boolean {
    return this.disposed;
  }

  private async performReconciliation(
    tools: IncidentTool[],
    desiredKey: string,
  ): Promise<void> {
    if (this.disposed || desiredKey !== this.latestDesiredKey) return;

    const desired = new Map(tools.map((tool) => [tool.name, tool]));
    const additions = tools
      .filter((tool) => !this.registrations.has(tool.name))
      .map((tool) => ({ tool, controller: new AbortController() }));

    for (const { tool, controller } of additions) {
      this.pendingRegistrations.set(tool.name, controller);
    }

    try {
      await Promise.all(
        additions.map(async ({ tool, controller }) => {
          try {
            await registerIncidentTool(tool, controller.signal);
          } finally {
            if (this.pendingRegistrations.get(tool.name) === controller) {
              this.pendingRegistrations.delete(tool.name);
            }
          }
        }),
      );
    } catch (error) {
      for (const { controller } of additions) controller.abort();
      if (this.isDisposed() || desiredKey !== this.latestDesiredKey) return;
      throw error;
    }

    if (this.isDisposed() || desiredKey !== this.latestDesiredKey) {
      for (const { controller } of additions) controller.abort();
      return;
    }

    for (const { tool, controller } of additions) {
      this.registrations.set(tool.name, { controller });
    }

    for (const [name, registration] of this.registrations) {
      if (!desired.has(name)) {
        registration.controller.abort();
        this.registrations.delete(name);
      }
    }
  }
}
