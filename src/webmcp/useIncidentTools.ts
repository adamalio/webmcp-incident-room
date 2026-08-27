import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { IncidentState } from "../domain/incident-machine";
import { getIncidentTools, type ToolHandlers } from "../tools/registry";
import {
  supportsModelContext,
  ToolRegistrationReconciler,
  type ModelContextCapability,
} from "./model-context";

export function useIncidentTools(
  state: IncidentState,
  handlers: ToolHandlers,
): ModelContextCapability {
  const handlersRef = useRef(handlers);
  const [capability, setCapability] = useState<ModelContextCapability>(() =>
    supportsModelContext() ? "supported" : "unsupported",
  );

  useLayoutEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const reconcilerRef = useRef<ToolRegistrationReconciler | null>(null);

  useEffect(() => {
    if (!supportsModelContext()) return;
    const reconciler = new ToolRegistrationReconciler();
    reconcilerRef.current = reconciler;
    return () => {
      reconciler.dispose();
      if (reconcilerRef.current === reconciler) reconcilerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!supportsModelContext()) return;

    let cancelled = false;
    const tools = getIncidentTools(state.phase, {
      inspect_incident: (input, options) =>
        handlersRef.current.inspect_incident(input, options),
      query_signals: (input, options) =>
        handlersRef.current.query_signals(input, options),
      propose_mitigation: (input, options) =>
        handlersRef.current.propose_mitigation(input, options),
    });

    void reconcilerRef.current?.reconcile(tools).then(
      () => {
        if (!cancelled) setCapability("supported");
      },
      () => {
        if (!cancelled) setCapability("registration_error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  return capability;
}
