export const iterate = <T>(count: number, callback: (index: number, count: number) => T): T[] => {
  return Array.from({ length: count }, (_, index) => callback(index, count));
};

export const makeEnumArray = <T>(entries: [key: string, T][]): Array<T> & Record<string, T> => {
  return Object.assign(entries.map(([, value]) => value), Object.fromEntries(entries))
}

/**
 * Forces TypeScript to evaluate a type alias to its underlying union type.
 * 
 * When a type alias is used (e.g., `StateKey<Config>`), TypeScript may preserve
 * the alias name in type hints. This utility forces TypeScript to expand the alias
 * to show the actual union type (e.g., `"idle" | "attacking"` instead of `StateKey<Config>`).
 * 
 * @template T - The type to evaluate (typically a union type or type alias)
 * @example
 * ```ts
 * type StateKey<T> = "idle" | "attacking";
 * type Evaluated = Evaluate<StateKey<Config>>; // "idle" | "attacking"
 * ```
 */
export type Flatten<T extends string> = { [K in T]: K }[T];