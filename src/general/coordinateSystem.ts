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
 * - **M** prefix = mirrored (negated/flipped interpretation; same value, opposite Y-axis context)
 *
 * ## Angle Direction Reference
 *
 * | Convention | Y-axis | Positive angle direction | Typical use |
 * |------------|--------|--------------------------|-------------|
 * | CCW        | Y-up   | Up (counterclockwise)    | Math.atan2, Aim |
 * | CW         | Y-down | Down (clockwise)         | PlanckJS, Canvas |
 * | MCCW       | Y-down | Up (CCW mirrored)        | CCW angle in Y-down space |
 * | MCW        | Y-up   | Down (CW mirrored)        | CW angle in Y-up space |
 *
 * ## Usage
 *
 * Use branded types to prevent mixing angles from different conventions.
 * Use the per-type toCCWRad functions to convert to game canonical.
 */

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

/** Radians, CCW mirrored (CCW in Y-down space). */
export type MCCWRad = AngleBrand<'MCCWRad'>;

/** Degrees, CCW mirrored (CCW in Y-down space). */
export type MCCWDeg = AngleBrand<'MCCWDeg'>;

/** Radians, CW mirrored (CW in Y-up space). */
export type MCWRad = AngleBrand<'MCWRad'>;

/** Degrees, CW mirrored (CW in Y-up space). */
export type MCWDeg = AngleBrand<'MCWDeg'>;

/** Cast a number to CCWRad. Use when the value is known to be in math convention (π/2 = up). */
export const CCWRad = (n: number): CCWRad => n as CCWRad;

/** Cast a number to CCWDeg. */
export const CCWDeg = (n: number): CCWDeg => n as CCWDeg;

/** Cast a number to CWRad. Use when the value is in Planck/screen convention (π/2 = down). */
export const CWRad = (n: number): CWRad => n as CWRad;

/** Cast a number to CWDeg. */
export const CWDeg = (n: number): CWDeg => n as CWDeg;

/** Cast a number to MCCWRad. */
export const MCCWRad = (n: number): MCCWRad => n as MCCWRad;

/** Cast a number to MCCWDeg. */
export const MCCWDeg = (n: number): MCCWDeg => n as MCCWDeg;

/** Cast a number to MCWRad. */
export const MCWRad = (n: number): MCWRad => n as MCWRad;

/** Cast a number to MCWDeg. */
export const MCWDeg = (n: number): MCWDeg => n as MCWDeg;

/** Convert CCWRad to CCWRad (identity). */
export const ccwrad2ccwrad = (a: CCWRad): CCWRad => a;

/** Convert CCWDeg to CCWRad. */
export const ccwdeg2ccwrad = (a: CCWDeg): CCWRad => CCWRad((a * Math.PI) / 180);

/** Convert CWRad to CCWRad. */
export const cwrad2ccwrad = (a: CWRad): CCWRad => CCWRad(-a);

/** Convert CWDeg to CCWRad. */
export const cwdeg2ccwrad = (a: CWDeg): CCWRad => CCWRad(-(a * Math.PI) / 180);

/** Convert MCCWRad to CCWRad. */
export const mccwrad2ccwrad = (a: MCCWRad): CCWRad => CCWRad(a);

/** Convert MCCWDeg to CCWRad. */
export const mccwdeg2ccwrad = (a: MCCWDeg): CCWRad => CCWRad((a * Math.PI) / 180);

/** Convert MCWRad to CCWRad. */
export const mcwrad2ccwrad = (a: MCWRad): CCWRad => CCWRad(-a);

/** Convert MCWDeg to CCWRad. */
export const mcwdeg2ccwrad = (a: MCWDeg): CCWRad => CCWRad(-(a * Math.PI) / 180);

/** Convert CCWDeg to CCWRad. */
export const ccwdeg2rad = (deg: CCWDeg): CCWRad => CCWRad((deg * Math.PI) / 180);

/** Convert CWDeg to CWRad. */
export const cwdeg2rad = (deg: CWDeg): CWRad => CWRad((deg * Math.PI) / 180);
