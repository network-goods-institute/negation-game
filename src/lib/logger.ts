/**
 * Logger utility that only logs to BROWSER console in development, it should always log to server console regardless of environment
 * Use this instead of console for any custom logging
 *
 * To force all logs in production, set: NEXT_PUBLIC_ENABLE_LOGS=true
 */
const isServer = typeof window === "undefined";

const shouldLog = () => {
  if (isServer) return true;
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_LOGS === "true"
  );
};

export const logger = {
  log: (...args: any[]) => {
    if (shouldLog()) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog()) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (shouldLog()) {
      console.error(...args);
    }
  },
  info: (...args: any[]) => {
    if (shouldLog()) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (shouldLog()) {
      console.debug(...args);
    }
  },
  group: (label: string) => {
    if (shouldLog()) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (shouldLog()) {
      console.groupEnd();
    }
  },
  table: (...args: any[]) => {
    if (shouldLog()) {
      console.table(...args);
    }
  },
};
