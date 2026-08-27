export interface ModelContextFake {
  invoke(name: string, input: unknown): Promise<unknown>;
  registeredNames(): string[];
  restore(): void;
}

export interface ModelContextFakeOptions {
  register?: (registration: {
    name: string;
    signal?: AbortSignal;
  }) => Promise<void>;
}

interface RegisteredTool {
  name: string;
  execute: WebMCP.ToolExecuteCallback;
}

function abortError(): DOMException {
  return new DOMException("Tool registration was aborted", "AbortError");
}

function awaitRegistration(
  registration: Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  if (!signal) return registration;
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    registration.then(
      () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export function installModelContextFake(
  fakeOptions: ModelContextFakeOptions = {},
): ModelContextFake {
  const original = Object.getOwnPropertyDescriptor(document, "modelContext");
  const registrations = new Map<string, RegisteredTool>();
  const pendingNames = new Set<string>();
  const modelContext = {
    async registerTool(
      tool: RegisteredTool,
      options: { signal?: AbortSignal } = {},
    ): Promise<void> {
      if (options.signal?.aborted) {
        throw abortError();
      }
      if (registrations.has(tool.name) || pendingNames.has(tool.name)) {
        throw new Error(`Duplicate tool: ${tool.name}`);
      }
      pendingNames.add(tool.name);
      try {
        await awaitRegistration(
          fakeOptions.register?.({
            name: tool.name,
            signal: options.signal,
          }) ?? Promise.resolve(),
          options.signal,
        );
        if (options.signal?.aborted) {
          throw abortError();
        }
        registrations.set(tool.name, tool);
        options.signal?.addEventListener(
          "abort",
          () => registrations.delete(tool.name),
          { once: true },
        );
      } finally {
        pendingNames.delete(tool.name);
      }
    },
  };

  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: modelContext,
  });

  return {
    invoke(name, input) {
      const tool = registrations.get(name);
      if (!tool) throw new Error(`Tool is not registered: ${name}`);
      return Promise.resolve(
        tool.execute(input as Record<string, unknown>, {
          signal: new AbortController().signal,
        }),
      );
    },
    registeredNames() {
      return [...registrations.keys()].sort();
    },
    restore() {
      if (original) Object.defineProperty(document, "modelContext", original);
      else Reflect.deleteProperty(document, "modelContext");
    },
  };
}
