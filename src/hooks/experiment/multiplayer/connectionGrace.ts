type Cleanup = () => void;

export interface ConnectionGraceController {
  onStatus: (connected: boolean) => void;
  forceDisconnectNow: () => void;
  dispose: Cleanup;
}

export const createConnectionGrace = (
  graceMs: number,
  onChange: (connected: boolean) => void
): ConnectionGraceController => {
  let current: boolean | null = null;
  let timer: number | null = null;

  const clear = () => {
    if (timer != null && typeof window !== "undefined") {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  const emit = (next: boolean) => {
    if (current === next) return;
    current = next;
    onChange(next);
  };

  const onStatus = (connected: boolean) => {
    if (connected) {
      clear();
      emit(true);
      return;
    }
    if (current === false) return;
    clear();
    if (typeof window === "undefined" || graceMs <= 0) {
      emit(false);
      return;
    }
    timer = window.setTimeout(() => {
      timer = null;
      emit(false);
    }, graceMs);
  };

  const forceDisconnectNow = () => {
    clear();
    emit(false);
  };

  const dispose = () => {
    clear();
  };

  return { onStatus, forceDisconnectNow, dispose };
};

export default createConnectionGrace;

