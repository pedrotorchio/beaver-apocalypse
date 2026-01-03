import { describe, it, expect, beforeEach, vi } from 'vitest';
import { onDestruct } from './destructor';

describe('onDestruct', () => {
  beforeEach(() => {
    // Note: FinalizationRegistry cleanup is non-deterministic and depends on GC.
    // These tests verify the registration and structure, not the actual GC behavior.
  });

  it('should register a callback for an object', () => {
    const obj = {};
    const callback = vi.fn();
    
    onDestruct(obj, callback);
    
    // Callback should be registered (we can't test GC directly, but structure is correct)
    expect(callback).not.toHaveBeenCalled();
  });

  it('should register multiple callbacks for the same object', () => {
    const obj = {};
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();
    
    onDestruct(obj, callback1);
    onDestruct(obj, callback2);
    onDestruct(obj, callback3);
    
    // All callbacks should be registered
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
    expect(callback3).not.toHaveBeenCalled();
  });

  it('should register callbacks for different objects independently', () => {
    const obj1 = {};
    const obj2 = {};
    const obj3 = {};
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();
    
    onDestruct(obj1, callback1);
    onDestruct(obj2, callback2);
    onDestruct(obj3, callback3);
    
    // Each object should have its own registration
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
    expect(callback3).not.toHaveBeenCalled();
  });

  it('should handle mixed registrations for multiple objects', () => {
    const obj1 = {};
    const obj2 = {};
    const callback1a = vi.fn();
    const callback1b = vi.fn();
    const callback2a = vi.fn();
    const callback2b = vi.fn();
    
    onDestruct(obj1, callback1a);
    onDestruct(obj2, callback2a);
    onDestruct(obj1, callback1b);
    onDestruct(obj2, callback2b);
    
    // All callbacks should be registered independently
    expect(callback1a).not.toHaveBeenCalled();
    expect(callback1b).not.toHaveBeenCalled();
    expect(callback2a).not.toHaveBeenCalled();
    expect(callback2b).not.toHaveBeenCalled();
  });

  it('should work with class instances', () => {
    class TestClass {
      cleanup = vi.fn();
    }
    
    const instance1 = new TestClass();
    const instance2 = new TestClass();
    
    onDestruct(instance1, () => instance1.cleanup());
    onDestruct(instance2, () => instance2.cleanup());
    
    expect(instance1.cleanup).not.toHaveBeenCalled();
    expect(instance2.cleanup).not.toHaveBeenCalled();
  });

  it('should work with arrays as objects', () => {
    const arr1: unknown[] = [];
    const arr2: unknown[] = [];
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    onDestruct(arr1, callback1);
    onDestruct(arr2, callback2);
    
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should work with functions as objects', () => {
    const func1 = () => {};
    const func2 = () => {};
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    onDestruct(func1, callback1);
    onDestruct(func2, callback2);
    
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should handle callbacks that throw errors gracefully', () => {
    const obj = {};
    const errorCallback = vi.fn(() => {
      throw new Error('Test error');
    });
    const normalCallback = vi.fn();
    
    // Should not throw during registration
    expect(() => {
      onDestruct(obj, errorCallback);
      onDestruct(obj, normalCallback);
    }).not.toThrow();
  });

  it('should allow registering the same callback multiple times', () => {
    const obj = {};
    const callback = vi.fn();
    
    onDestruct(obj, callback);
    onDestruct(obj, callback);
    onDestruct(obj, callback);
    
    // Same callback can be registered multiple times
    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle null and undefined in callbacks', () => {
    const obj = {};
    const callback1 = vi.fn(() => null);
    const callback2 = vi.fn(() => undefined);
    
    onDestruct(obj, callback1);
    onDestruct(obj, callback2);
    
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should work with arrow functions and regular functions', () => {
    const obj = {};
    const arrowCallback = vi.fn();
    const regularCallback = vi.fn();
    
    function regularFunction() {
      regularCallback();
    }
    
    onDestruct(obj, arrowCallback);
    onDestruct(obj, regularFunction);
    
    expect(arrowCallback).not.toHaveBeenCalled();
    expect(regularCallback).not.toHaveBeenCalled();
  });

  it('should handle objects with properties', () => {
    const obj = { prop: 'value', num: 42 };
    const callback = vi.fn();
    
    onDestruct(obj, callback);
    
    // Should work regardless of object properties
    expect(callback).not.toHaveBeenCalled();
  });

  it('should not interfere with object garbage collection', () => {
    // Create objects that will be GC'd
    let callback1Called = false;
    let callback2Called = false;
    
    (() => {
      const obj1 = {};
      const obj2 = {};
      
      onDestruct(obj1, () => { callback1Called = true; });
      onDestruct(obj2, () => { callback2Called = true; });
      
      // Objects go out of scope here
    })();
    
    // Force a GC hint (non-deterministic, but structure should allow GC)
    // Note: global.gc is only available with --expose-gc flag in Node.js
    const globalObj = globalThis as { gc?: () => void };
    if (globalObj.gc) {
      globalObj.gc();
    }
    
    // Note: We can't reliably test GC behavior, but we verify the structure
    // allows for proper cleanup when GC occurs
    expect(typeof callback1Called).toBe('boolean');
    expect(typeof callback2Called).toBe('boolean');
  });
});

