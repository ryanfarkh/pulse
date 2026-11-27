export function createStoreNotify() {
  const listeners = new Set<() => void>();
  let queued = false;
  return {
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    notify(): void {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        for (const fn of listeners) fn();
      });
    },
  };
}
