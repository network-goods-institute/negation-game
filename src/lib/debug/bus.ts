export type LogLevel = "log" | "info" | "warn" | "error";
export type LogEntry = {
  ts: number;
  level: LogLevel;
  message: string;
  args: any[];
};

const MAX_BUFFER = 300;
const buffer: LogEntry[] = [];
const subscribers = new Set<(e: LogEntry) => void>();

export const getLogBuffer = (): LogEntry[] => buffer.slice();

export const subscribeLogs = (cb: (e: LogEntry) => void): (() => void) => {
  subscribers.add(cb);
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  return () => subscribers.delete(cb);
};

export const emitLog = (entry: LogEntry) => {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  for (const cb of subscribers) {
    try {
      cb(entry);
    } catch {}
  }
};

export const formatArgs = (args: any[]): string => {
  try {
    return args
      .map((a) =>
        typeof a === "string"
          ? a
          : a instanceof Error
            ? a.message
            : (() => {
                try {
                  return JSON.stringify(a);
                } catch {
                  return String(a);
                }
              })()
      )
      .join(" ");
  } catch {
    return args.map((a) => String(a)).join(" ");
  }
};
