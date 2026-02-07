/**
 * Compile-time branded angle types for different coordinate system conventions.
 * Angles are plain numbers - typeof returns "number", native numeric operations work.
 * Use per-type conversion functions to convert to CCWRad (game canonical).
 *
 * ## Naming Convention
 *
 * All systems assume:
 * - **X-axis**: increases to the right (never named, always implied)
 * - **Angle zero**: points right (positive X direction, never named)
 *
 * Names encode only what varies:
 * - **CCW** = counterclockwise from right = positive angle (math convention, Y-up)
 * - **CW** = clockwise from right = positive angle (screen convention, Y-down)
 * - **Rad** = radians
 * - **Deg** = degrees
 *
 * ## Angle Direction Reference
 *
 * | Convention | Y-axis | Positive angle direction | Typical use |
 * |------------|--------|--------------------------|-------------|
 * | CCW        | Y-up   | Up (counterclockwise)    | Math.atan2, Aim |
 * | CW         | Y-down | Down (clockwise)         | PlanckJS, Canvas |
 *
 * ## Usage
 *
 * Use branded types to prevent mixing angles from different conventions.
 * Use the per-type toCCWRad functions to convert to game canonical.
 */

import { DIRECTION_LEFT, DIRECTION_RIGHT, Direction } from "../core/types/Entity.type";

declare const __angleBrand: unique symbol;
type AngleBrand<B extends string> = number & { readonly [__angleBrand]: B };

/** Radians, CCW from right (math convention, Y-up). Game canonical. */
export type CCWRad = AngleBrand<'CCWRad'>;

/** Degrees, CCW from right (math convention, Y-up). */
export type CCWDeg = AngleBrand<'CCWDeg'>;

/** Radians, CW from right (screen convention, Y-down). */
export type CWRad = AngleBrand<'CWRad'>;

/** Degrees, CW from right (screen convention, Y-down). */
export type CWDeg = AngleBrand<'CWDeg'>;

/** Radians, relative to a local horizontal direction. */
export type RelativeRad = {
    angle: number;
    facing: Direction;
}

/** Cast a number to CCWRad. Use when the value is known to be in math convention (π/2 = up). */
export const CCWRad = (n: number): CCWRad => n as CCWRad;

/** Cast a number to CCWDeg. */
export const CCWDeg = (n: number): CCWDeg => n as CCWDeg;

/** Cast a number to CWRad. Use when the value is in Planck/screen convention (π/2 = down). */
export const CWRad = (n: number): CWRad => n as CWRad;

/** Cast a number to CWDeg. */
export const CWDeg = (n: number): CWDeg => n as CWDeg;

type RadEquivalentType<D> = D extends CCWDeg ? CCWRad : CWRad
export const toRadians = <D extends CCWDeg | CWDeg>(a: D): RadEquivalentType<D> => {
    return a * Math.PI / 180 as RadEquivalentType<D>
}

/** Convert CCWRad to CCWRad (identity). */
export const ccwrad2ccwrad = (a: CCWRad): CCWRad => a;

/** Convert CCWDeg to CCWRad. */
export const ccwdeg2ccwrad = (a: CCWDeg): CCWRad => CCWRad((a * Math.PI) / 180);

/** Convert CWRad to CCWRad. */
export const cwrad2ccwrad = (a: CWRad): CCWRad => CCWRad(-a);

/** Convert CCWRad to CWRad. */
export const ccwrad2cwrad = (a: CCWRad): CWRad => CWRad(-a);

/** Convert CWDeg to CCWRad. */
export const cwdeg2ccwrad = (a: CWDeg): CCWRad => CCWRad(-(a * Math.PI) / 180);

/** Convert CCWDeg to CCWRad. */
export const ccwdeg2rad = (deg: CCWDeg): CCWRad => CCWRad((deg * Math.PI) / 180);

/** Convert CWDeg to CWRad. */
export const cwdeg2rad = (deg: CWDeg): CWRad => CWRad((deg * Math.PI) / 180);

/** Convert RelativeRad to CCWRad (world angle). Facing right: 0=right. Facing left: 0=left (π). */
export const relativerad2ccwrad = (a: RelativeRad): CCWRad => {
    if (a.facing === DIRECTION_RIGHT) return CCWRad(a.angle);
    if (a.facing === DIRECTION_LEFT) return CCWRad(mirrorRadians(a.angle));
    throw new Error(`Invalid direction: ${a.facing}`);
}

/** Mirror angle horizontally (left↔right). */
export const mirrorRadians = (angle: number): number => Math.PI - angle;

/** Normalize radians to [0, 2π). */
export const normalizeRadians = <A extends CCWRad | CWRad | number>(angle: A): A => {
    return (angle - 2 * Math.PI * Math.floor(angle / (2 * Math.PI))) as A;
};


/**
 * Factory for relative radians. When facing is set, transforms angle: left = CCW→CW, right = CW→CCW.
 * @returns {RelativeRad} An object with angle and facing properties.
 */
export const RelativeRad = (angle: CCWRad, facing: Direction): RelativeRad => {
    const normalizedAngle = normalizeRadians(angle);
    const RAD_000 = toRadians(CCWDeg(0));
    const RAD_180 = toRadians(CCWDeg(180));
    const RAD_360 = toRadians(CCWDeg(360));

    const isBetween = (min: number, max: number) => normalizedAngle >= min && normalizedAngle <= max;
    const isFacing = (dir: Direction) => dir === facing;

    const isRightFacing = isFacing(DIRECTION_RIGHT);
    const isUpHalf = isBetween(RAD_000, RAD_180);

    const resolvedAngle = ((): CCWRad | CWRad => {
        if (isRightFacing && isUpHalf) return normalizedAngle;
        if (isRightFacing && !isUpHalf) return CCWRad(normalizedAngle - RAD_360);
        return CWRad(RAD_180 - normalizedAngle);
    })();

    return {
        angle: resolvedAngle,
        facing,
    }
};