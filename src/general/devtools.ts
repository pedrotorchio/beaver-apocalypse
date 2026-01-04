import { consola } from "consola";

export const spy = (fn: (...args: any[]) => void, message?: string) => {
  const logger = consola.withTag(message || fn.name || "spy");
  return (...args: any[]) => {
    console.group(message || fn.name || "spy");
    logger.log("Running with args:", ...args);
    const result = fn(...args);
    logger.log("Result:", result);
    console.groupEnd();
    return result;
  };
};
