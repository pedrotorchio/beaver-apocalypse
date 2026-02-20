type EventListener<T = any> = (data: T) => void;

// Multi-event EventHub for entities with multiple event types
export class EventHub<Events extends Record<string, any>> {
  readonly #listeners = new Map<keyof Events, Set<EventListener>>();

  on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): () => void {
    const eventListeners = this.#listeners.get(event) ?? new Set();
    eventListeners.add(listener);
    this.#listeners.set(event, eventListeners);
    
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    this.#listeners.get(event)?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.#listeners.get(event)?.forEach(listener => listener(data));
  }

  destroy(): void {
    this.#listeners.clear();
  }
}

// Single-event hub for simple notification patterns
export class SingleEventHub<T> {
  readonly #listeners = new Set<EventListener<T>>();

  addListener(listener: EventListener<T>): void {
    this.#listeners.add(listener);
  }

  removeListener(listener: EventListener<T>): void {
    this.#listeners.delete(listener);
  }

  notify(data: T): void {
    this.#listeners.forEach(listener => listener(data));
  }

  destroy(): void {
    this.#listeners.clear();
  }
}

export const useEventHub = <T>(): SingleEventHub<T> => new SingleEventHub<T>();
