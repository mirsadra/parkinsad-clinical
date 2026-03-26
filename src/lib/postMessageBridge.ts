type ContextChangeHandler = (patientId: string) => void;

let _handler: ContextChangeHandler | null = null;

export function registerContextChangeHandler(fn: ContextChangeHandler): void {
  _handler = fn;
}

export function initPostMessageBridge(): () => void {
  function handleMessage(event: MessageEvent) {
    if (
      typeof event.data === "object" &&
      event.data?.type === "PATIENT_CONTEXT_CHANGE" &&
      typeof event.data.patientId === "string"
    ) {
      _handler?.(event.data.patientId);
    }
  }

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}
