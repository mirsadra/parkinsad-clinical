if (import.meta.env.PROD) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

export function sanitiseForLog(obj: unknown): unknown {
  if (import.meta.env.PROD) return "[redacted in production]";
  return obj;
}
