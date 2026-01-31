import * as planck from "planck-js";
import type { CCWRad } from "./coordinateSystem";

export type Vec2Like = {
  x: number;
  y: number;
}

/**
 * Converts an angle (CCWRad: 0=right, π/2=up) to a unit vector.
 * This function is not available in planck.js, so it's kept here.
 * Returns a planck.Vec2 instance. In Y-down physics, π/2 points down.
 */
export const fromAngle = (angle: CCWRad): planck.Vec2 => {
  return planck.Vec2(Math.cos(angle), Math.sin(angle));
};

export const UP = () => planck.Vec2(0, -1);
export const DOWN = () => planck.Vec2(0, 1);
export const LEFT = () => planck.Vec2(-1, 0);
export const RIGHT = () => planck.Vec2(1, 0);
export const ZERO = () => planck.Vec2(0, 0);

/**
 * Projects one vector onto another.
 * Returns the projection of projectThis onto ontoThis.
 */
export const project = (projectThis: Vec2Like, ontoThis: Vec2Like, multiplier: number = 1): planck.Vec2 => {
  const dot = projectThis.x * ontoThis.x + projectThis.y * ontoThis.y;
  const magSq = ontoThis.x * ontoThis.x + ontoThis.y * ontoThis.y;
  
  if (magSq === 0) {
    return planck.Vec2(0, 0);
  }
  
  const scale = dot * multiplier / magSq;
  return planck.Vec2(ontoThis.x * scale, ontoThis.y * scale);
};