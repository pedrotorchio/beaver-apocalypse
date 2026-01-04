export const spy = (fn: (...args: any[]) => void, message?: string) => {
  return (...args: any[]) => {
    console.group(message || fn.name || "spy");
    console.log("Running with args:", ...args);
    const result = fn(...args);
    console.log("Result:", result);
    console.groupEnd();
    return result;
  };
};
