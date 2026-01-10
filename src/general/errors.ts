/**
 * Utility function that throws an error with the given message.
 *
 * This function is designed to be used with the nullish coalescing operator (??)
 * to provide concise error handling when a value is null or undefined.
 *
 * @example
 * const ctx = canvas.getContext("2d") ?? throwError("Failed to get 2d context");
 *
 * @param message - The error message to throw
 * @throws {Error} Always throws an error with the provided message
 * @returns {never} This function never returns (always throws)
 */
export function throwError(message: string): never {
  throw new Error(message);
}




