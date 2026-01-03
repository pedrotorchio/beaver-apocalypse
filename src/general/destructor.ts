// Map from reference object to its unique token
const referenceToToken = new WeakMap<object, object>();

// Map from token to array of cleanup callbacks
const tokenToCallbacks = new Map<object, Array<() => void>>();

const registry = new FinalizationRegistry((token: object) => {
  const callbacks = tokenToCallbacks.get(token);
  if (callbacks) {
    callbacks.forEach(cb => cb());
    tokenToCallbacks.delete(token);
  }
});

export function onDestruct(reference: object, callback: () => void): void {
  // Get or create token for this reference
  let token = referenceToToken.get(reference);
  
  if (!token) {
    // First callback for this reference - create token and register
    token = {}; // Unique token object
    referenceToToken.set(reference, token);
    tokenToCallbacks.set(token, []);
    registry.register(reference, token);
  }
  
  // Add callback to this token's array
  tokenToCallbacks.get(token)!.push(callback);
}

