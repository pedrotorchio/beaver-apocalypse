export const UP = { x: 0, y: 1 };
export const DOWN = { x: 0, y: -1 };
export const LEFT = { x: -1, y: 0 };
export const RIGHT = { x: 1, y: 0 };
export const ZERO = { x: 0, y: 0 };

export const up = (magnitude: number): Vec2Like => scale(UP, magnitude);
export const down = (magnitude: number): Vec2Like => scale(DOWN, magnitude);
export const left = (magnitude: number): Vec2Like => scale(LEFT, magnitude);
export const right = (magnitude: number): Vec2Like => scale(RIGHT, magnitude);
export const zero = (): Vec2Like => ZERO;
/**
 * Generic 2D vector utility functions.
 * These are pure mathematical operations that work with any 2D vector-like objects.
 */

export interface Vec2Like {
  x: number;
  y: number;
}

/**
 * Calculates the distance between two points.
 */
export const distance = (a: Vec2Like, b: Vec2Like): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculates the magnitude (length) of a vector.
 */
export const magnitude = (v: Vec2Like): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y);
};

/**
 * Normalizes a vector to unit length.
 * Returns a zero vector if the input vector has zero magnitude.
 */
export const normalize = (v: Vec2Like): Vec2Like => {
  const mag = magnitude(v);
  if (mag <= 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / mag, y: v.y / mag };
};

/**
 * Calculates the dot product of two vectors.
 */
export const dot = (a: Vec2Like, b: Vec2Like): number => {
  return a.x * b.x + a.y * b.y;
};

/**
 * Converts an angle (in radians) to a unit vector.
 */
export const fromAngle = (angle: number): Vec2Like => {
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

/**
 * Scales a vector by a scalar value.
 */
export const scale = (v: Vec2Like, scalar: number): Vec2Like => {
  return { x: v.x * scalar, y: v.y * scalar };
};

/**
 * Adds two vectors together.
 */
export const add = (a: Vec2Like, b: Vec2Like): Vec2Like => {
  return { x: a.x + b.x, y: a.y + b.y };
};

/**
 * Subtracts vector b from vector a.
 */
export const subtract = (a: Vec2Like, b: Vec2Like): Vec2Like => {
  return { x: a.x - b.x, y: a.y - b.y };
};

/**
 * Checks if two vectors are equal.
 */
export const equals = (a: Vec2Like, b: Vec2Like): boolean => {
  return a.x === b.x && a.y === b.y;
};