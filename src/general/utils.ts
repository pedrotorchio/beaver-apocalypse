export const iterate = <T>(count: number, callback: (index: number) => T): T[] => {
  return Array.from({ length: count }, (_, index) => callback(index));
};
