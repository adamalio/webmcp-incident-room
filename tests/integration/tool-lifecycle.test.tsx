// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../src/app/App";
import {
  installModelContextFake,
  type ModelContextFake,
} from "../../src/test/model-context-fake";

describe("start and inspect tracer", () => {
  let modelContext: ModelContextFake | undefined;

  afterEach(() => {
    cleanup();
    modelContext?.restore();
    modelContext = undefined;
  });

  it("does not render a browser capability banner when WebMCP is unsupported", () => {
    render(<App />);

    expect(
      screen.queryByText(/Agent tools unavailable in this browser/i),
    ).not.toBeInTheDocument();
  });

  it("registers the supported set and shows a stable inspect receipt", async () => {
    modelContext = installModelContextFake();
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    act(() => {
      screen.getByRole("button", { name: "Start incident" }).click();
    });

    await waitFor(() => {
      expect(modelContext?.registeredNames()).toEqual([
        "inspect_incident",
        "propose_mitigation",
        "query_signals",
      ]);
    });

    await act(async () => {
      await modelContext?.invoke("inspect_incident", {
        incidentId: "inc_checkout_20260827_001",
      });
      await modelContext?.invoke("inspect_incident", {
        incidentId: "inc_checkout_20260827_001",
      });
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Incident inspected · ins_001",
    );
    expect(
      screen.getByRole("list", { name: "Incident timeline" }),
    ).toHaveTextContent("Incident inspectedins_001");
    expect(screen.getAllByText("Incident inspected")).toHaveLength(1);
  });

  it("removes every tool on Reset and restores one exact set on restart", async () => {
    modelContext = installModelContextFake();
    render(<App />);
    const expectedTools = [
      "inspect_incident",
      "propose_mitigation",
      "query_signals",
    ];

    act(() => {
      screen.getByRole("button", { name: "Start incident" }).click();
    });
    await waitFor(() => {
      expect(modelContext?.registeredNames()).toEqual(expectedTools);
    });

    act(() => {
      screen.getByRole("button", { name: "Reset" }).click();
    });
    await waitFor(() => {
      expect(modelContext?.registeredNames()).toEqual([]);
    });
    await expect(
      Promise.resolve().then(() =>
        modelContext?.invoke("inspect_incident", {
          incidentId: "inc_checkout_20260827_001",
        }),
      ),
    ).rejects.toThrow("Tool is not registered: inspect_incident");

    act(() => {
      screen.getByRole("button", { name: "Start incident" }).click();
    });
    await waitFor(() => {
      expect(modelContext?.registeredNames()).toEqual(expectedTools);
    });
  });
});
