"use client";
import React from "react";
import { emitLog, formatArgs, getLogBuffer, LogEntry, LogLevel, subscribeLogs } from "@/lib/debug/bus";

type ConsolePatched = {
  original?: Partial<Record<LogLevel, (...args: any[]) => void>>;
  active?: boolean;
};

const ensureConsolePatched = () => {
  if (typeof window === "undefined") return;
  const key = "__ng_debug_console_patched__" as const;
  const state: ConsolePatched = (window as any)[key] || {};
  if (state.active) return;
  state.original = state.original || {
    log: console.log.bind(console),
    info: console.info?.bind(console) || console.log.bind(console),
    warn: console.warn?.bind(console) || console.log.bind(console),
    error: console.error?.bind(console) || console.log.bind(console),
  };
  const wrap = (level: LogLevel) =>
    (...args: any[]) => {
      try {
        emitLog({ ts: Date.now(), level, message: formatArgs(args), args });
      } catch {}
      try { state.original?.[level]?.(...args); } catch {}
    };
  console.log = wrap('log');
  console.info = wrap('info');
  console.warn = wrap('warn');
  console.error = wrap('error');
  state.active = true;
  (window as any)[key] = state;
};

const levelColor = (level: LogLevel) =>
  level === 'error' ? 'text-red-600'
  : level === 'warn' ? 'text-amber-600'
  : level === 'info' ? 'text-blue-600'
  : 'text-stone-700';

export const DebugPanel: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [entries, setEntries] = React.useState<LogEntry[]>([]);
  const [filter, setFilter] = React.useState("");
  const [levels, setLevels] = React.useState<Record<LogLevel, boolean>>({ log: true, info: true, warn: true, error: true });

  React.useEffect(() => {
    ensureConsolePatched();
    setEntries(getLogBuffer());
    return subscribeLogs((e) => setEntries((prev) => [...prev, e].slice(-300)));
  }, []);

  const filtered = React.useMemo(() => {
    const f = filter.trim().toLowerCase();
    return entries.filter((e) => levels[e.level] && (f ? e.message.toLowerCase().includes(f) : true));
  }, [entries, filter, levels]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-md border bg-white shadow text-xs text-stone-700 hover:bg-stone-50"
        title={open ? 'Hide debug' : 'Show debug'}
      >
        {open ? 'Close Debug' : 'Open Debug'}
      </button>
      {open && (
        <div className="fixed bottom-14 right-4 z-50 w-[520px] max-h-[60vh] bg-white border rounded-lg shadow-xl flex flex-col">
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter (e.g. [mp] or [yjs])"
              className="flex-1 border rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-stone-300"
            />
            {(['log','info','warn','error'] as LogLevel[]).map((lvl) => (
              <label key={lvl} className="flex items-center gap-1 text-xs text-stone-700">
                <input type="checkbox" checked={levels[lvl]} onChange={(e) => setLevels((s) => ({ ...s, [lvl]: e.target.checked }))} />
                <span className={levelColor(lvl)}>{lvl}</span>
              </label>
            ))}
          </div>
          <div className="p-2 text-[11px] leading-snug overflow-auto font-mono">
            {filtered.length === 0 ? (
              <div className="text-stone-400">No logs</div>
            ) : (
              filtered.slice(-200).map((e, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  <span className="text-stone-400">{new Date(e.ts).toLocaleTimeString()}</span>{' '}
                  <span className={`${levelColor(e.level)} font-semibold`}>[{e.level}]</span>{' '}
                  <span className="text-stone-700">{e.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

