export const iterate = <T>(count: number, callback: (index: number, count: number) => T): T[] => {
  return Array.from({ length: count }, (_, index) => callback(index, count));
};

export const makeEnumArray = <T>(entries: [key: string, T][]): Array<T> & Record<string, T> => {
  return Object.assign(entries.map(([, value]) => value), Object.fromEntries(entries))
}