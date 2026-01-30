export type EventHub<T> = {
  addListener: (listener: (payload: T) => void) => () => void;
  notify: (payload: T) => void;
  destroy: () => void;
};

export const useEventHub = <T>(): EventHub<T> => {
  const listeners = new Set<(payload: T) => void>();
  return {
    addListener: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify: (payload) => listeners.forEach((l) => l(payload)),
    destroy: () => listeners.clear(),
  };
};
