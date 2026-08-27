// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IncidentState } from "../../src/domain/incident-machine";
import { useIncidentTools } from "../../src/webmcp/useIncidentTools";

const toolNames = vi.hoisted(() => ({
  idle: ["alpha"],
  investigating: ["alpha", "beta", "gamma"],
}));

vi.mock("../../src/tools/registry", () => ({
  getIncidentTools: (
    phase: "idle" | "investigating",
    handlers: { inspect_incident: () => unknown },
  ) =>
    toolNames[phase].map((name) => ({
      name,
      description: name,
      inputSchema: { type: "object" },
      execute:
        name === "alpha" ? handlers.inspect_incident : () => ({ ok: true }),
    })),
}));

interface RegistrationRecord {
  name: string;
  signal: AbortSignal;
}

function Harness() {
  const [phase, setPhase] = useState<IncidentState["phase"]>("idle");
  const capability = useIncidentTools(
    { phase, timeline: [], latestStatus: phase, queryReceipts: {} },
    {
      inspect_incident: vi.fn(),
      query_signals: vi.fn(),
      propose_mitigation: vi.fn(),
    },
  );
  return (
    <>
      <output>{capability}</output>
      <button
        onClick={() => {
          setPhase("idle");
        }}
      >
        idle
      </button>
      <button
        onClick={() => {
          setPhase("investigating");
        }}
      >
        investigating
      </button>
    </>
  );
}

function AtomicHandlerHarness({
  invokeRetained,
  observed,
}: {
  invokeRetained: () => unknown;
  observed: (value: unknown) => void;
}) {
  const [value, setValue] = useState("investigating");
  const [inspectAfterCommit, setInspectAfterCommit] = useState(false);
  useIncidentTools(
    { phase: "idle", timeline: [], latestStatus: value, queryReceipts: {} },
    {
      inspect_incident: () => value,
      query_signals: vi.fn(),
      propose_mitigation: vi.fn(),
    },
  );
  useLayoutEffect(() => {
    if (inspectAfterCommit) observed(invokeRetained());
  }, [inspectAfterCommit, invokeRetained, observed]);
  return (
    <button
      onClick={() => {
        setValue("idle");
        setInspectAfterCommit(true);
      }}
    >
      reset and inspect
    </button>
  );
}

describe("tool registration reconciliation", () => {
  const original = Object.getOwnPropertyDescriptor(document, "modelContext");

  afterEach(() => {
    cleanup();
    if (original) Object.defineProperty(document, "modelContext", original);
    else Reflect.deleteProperty(document, "modelContext");
  });

  function install(register: (record: RegistrationRecord) => Promise<void>) {
    const records: RegistrationRecord[] = [];
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(
          tool: { name: string },
          options: { signal: AbortSignal },
        ) {
          const record = { name: tool.name, signal: options.signal };
          records.push(record);
          await register(record);
        },
      },
    });
    return records;
  }

  it("exposes the committed handler value before retained tools can run", async () => {
    let retainedExecute: (() => unknown) | undefined;
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(tool: { execute: () => unknown }) {
          retainedExecute ??= tool.execute;
          return Promise.resolve();
        },
      },
    });
    const observed = vi.fn();
    render(
      <AtomicHandlerHarness
        invokeRetained={() => retainedExecute?.()}
        observed={observed}
      />,
    );
    await waitFor(() => {
      expect(retainedExecute).toBeTypeOf("function");
    });

    act(() => {
      screen.getByRole("button", { name: "reset and inspect" }).click();
    });

    expect(observed).toHaveBeenCalledWith("idle");
  });

  it("retains unchanged registrations, registers additions, aborts removals, and disposes on unmount", async () => {
    const records = install(() => Promise.resolve());
    const view = render(<Harness />);
    await waitFor(() => {
      expect(records.map((record) => record.name)).toEqual(["alpha"]);
    });

    act(() => {
      screen.getByRole("button", { name: "investigating" }).click();
    });
    await waitFor(() => {
      expect(records.map((record) => record.name)).toEqual([
        "alpha",
        "beta",
        "gamma",
      ]);
    });
    expect(records[0].signal.aborted).toBe(false);

    act(() => {
      screen.getByRole("button", { name: "idle" }).click();
    });
    await waitFor(() => {
      expect(records.slice(1).every((record) => record.signal.aborted)).toBe(
        true,
      );
    });
    expect(records[0].signal.aborted).toBe(false);
    expect(records.filter((record) => record.name === "alpha")).toHaveLength(1);

    view.unmount();
    expect(records.every((record) => record.signal.aborted)).toBe(true);
  });

  it("rolls back every newly-added registration when one addition fails", async () => {
    const records = install(({ name }) => {
      if (name === "beta") return Promise.reject(new Error("beta failed"));
      return Promise.resolve();
    });
    render(<Harness />);
    await waitFor(() => {
      expect(records).toHaveLength(1);
    });

    act(() => {
      screen.getByRole("button", { name: "investigating" }).click();
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "registration_error",
      );
    });

    expect(records[0].signal.aborted).toBe(false);
    expect(records.slice(1)).toHaveLength(2);
    expect(records.slice(1).every((record) => record.signal.aborted)).toBe(
      true,
    );
  });

  it("clears registration_error after a successful retry", async () => {
    let betaAttempts = 0;
    install(({ name }) => {
      if (name === "beta" && ++betaAttempts === 1)
        return Promise.reject(new Error("first attempt failed"));
      return Promise.resolve();
    });
    render(<Harness />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("supported");
    });

    act(() => {
      screen.getByRole("button", { name: "investigating" }).click();
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "registration_error",
      );
    });
    act(() => {
      screen.getByRole("button", { name: "idle" }).click();
    });
    act(() => {
      screen.getByRole("button", { name: "investigating" }).click();
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("supported");
    });
    expect(betaAttempts).toBe(2);
  });
});
