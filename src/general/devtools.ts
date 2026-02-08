type DevtoolsData = {
  [key: string]: unknown;
}
const SYMBOL_DEVTOOLS = Symbol('devtools');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const spy = (fn: (...args: any[]) => void, message?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    console.group(message || fn.name || "spy");
    console.log("Running with args:", ...args);
    const result = fn(...args);
    console.log("Result:", result);
    console.groupEnd();
    return result;
  };
};

export const expose = <K extends keyof DevtoolsData>(key: K, value: DevtoolsData[K]) => {
  window[SYMBOL_DEVTOOLS] ??= {};
  window[SYMBOL_DEVTOOLS][key] ??= [] as DevtoolsData[K][];
  window[SYMBOL_DEVTOOLS][key].push(value);
}
declare global {
  interface Window {
    [SYMBOL_DEVTOOLS]: {
      [key in keyof DevtoolsData]: DevtoolsData[key][];
    }
  }
}