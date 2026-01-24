import * as planck from "planck-js";

export type Vec2Like = {
  x: number;
  y: number;
}

/**
 * Converts an angle (in radians) to a unit vector.
 * This function is not available in planck.js, so it's kept here.
 * Returns a planck.Vec2 instance.
 */
export const fromAngle = (angle: number): planck.Vec2 => {
  return planck.Vec2(Math.cos(angle), Math.sin(angle));
};

export const UP = planck.Vec2(0, 1);
export const DOWN = planck.Vec2(0, -1);
export const LEFT = planck.Vec2(-1, 0);
export const RIGHT = planck.Vec2(1, 0);
export const ZERO = planck.Vec2(0, 0);