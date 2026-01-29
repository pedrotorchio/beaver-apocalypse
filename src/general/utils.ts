export const createTwoWayDictionary = <K1 extends string, K2 extends string>(
  dictionary: Record<K1, K2>
): Record<K1 | K2, K1 | K2> =>
  Object.assign(
    { ...dictionary },
    Object.fromEntries(Object.entries(dictionary).map(([k, v]) => [v, k]))
  ) as Record<K1 | K2, K1 | K2>;

export const iterate = <T>(count: number, callback: (index: number, count: number) => T): T[] => {
  return Array.from({ length: count }, (_, index) => callback(index, count));
};

export const makeEnumArray = <T>(entries: [key: string, T][]): Array<T> & Record<string, T> => {
  return Object.assign(entries.map(([, value]) => value), Object.fromEntries(entries))
}

export type TuplePick<
  T extends readonly unknown[],
  K extends readonly number[]
> = {
    [I in keyof K]: T[K[I]]
  };

export type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;