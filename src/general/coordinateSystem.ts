/**
 * Runtime-tagged angle types for different coordinate system conventions.
 * Angles are Number instances with _brand attached via defineProperty, so they
 * behave as numbers (Math.cos, arithmetic) while carrying runtime _brand for toCCWRad.
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
 * Use tagged types to prevent mixing angles from different conventions.
 * Use toCCWRad() to convert any angle to the game's canonical CCWRad.
 */

type AngleBrand = 'CCWRad' | 'CCWDeg' | 'CWRad' | 'CWDeg' | 'MCCWRad' | 'MCCWDeg' | 'MCWRad' | 'MCWDeg';

type Angle<T extends AngleBrand> = Number & { readonly _brand: T };

function createAngle<T extends AngleBrand>(value: number, brand: T): Angle<T> {
    const num = new Number(value) as Angle<T>;
    Object.defineProperty(num, '_brand', { value: brand, writable: false, enumerable: true });
    return num;
}

/** Radians, CCW from right (math convention, Y-up). Game canonical. */
export type CCWRad = Angle<'CCWRad'>;

/** Degrees, CCW from right (math convention, Y-up). */
export type CCWDeg = Angle<'CCWDeg'>;

/** Radians, CW from right (screen convention, Y-down). */
export type CWRad = Angle<'CWRad'>;

/** Degrees, CW from right (screen convention, Y-down). */
export type CWDeg = Angle<'CWDeg'>;

/** Radians, CCW mirrored (CCW in Y-down space). */
export type MCCWRad = Angle<'MCCWRad'>;

/** Degrees, CCW mirrored (CCW in Y-down space). */
export type MCCWDeg = Angle<'MCCWDeg'>;

/** Radians, CW mirrored (CW in Y-up space). */
export type MCWRad = Angle<'MCWRad'>;

/** Degrees, CW mirrored (CW in Y-up space). */
export type MCWDeg = Angle<'MCWDeg'>;

export type AnyAngle = CCWRad | CCWDeg | CWRad | CWDeg | MCCWRad | MCCWDeg | MCWRad | MCWDeg;

/** Create CCWRad. Use when the value is known to be in math convention (π/2 = up). */
export const CCWRad = (n: number): CCWRad => createAngle(n, 'CCWRad');

/** Create CCWDeg. */
export const CCWDeg = (n: number): CCWDeg => createAngle(n, 'CCWDeg');

/** Create CWRad. Use when the value is in Planck/screen convention (π/2 = down). */
export const CWRad = (n: number): CWRad => createAngle(n, 'CWRad');

/** Create CWDeg. */
export const CWDeg = (n: number): CWDeg => createAngle(n, 'CWDeg');

/** Create MCCWRad. */
export const MCCWRad = (n: number): MCCWRad => createAngle(n, 'MCCWRad');

/** Create MCCWDeg. */
export const MCCWDeg = (n: number): MCCWDeg => createAngle(n, 'MCCWDeg');

/** Create MCWRad. */
export const MCWRad = (n: number): MCWRad => createAngle(n, 'MCWRad');

/** Create MCWDeg. */
export const MCWDeg = (n: number): MCWDeg => createAngle(n, 'MCWDeg');

/** Convert any angle to CCWRad (game canonical). Runtime-checked via _brand. */
export const toCCWRad = (angle: AnyAngle): CCWRad => {
    const v = Number(angle);
    switch (angle._brand) {
        case 'CCWRad': return angle;
        case 'CCWDeg': return CCWRad((v * Math.PI) / 180);
        case 'CWRad': return CCWRad(-v);
        case 'CWDeg': return CCWRad(-(v * Math.PI) / 180);
        case 'MCCWRad': return CCWRad(v);
        case 'MCCWDeg': return CCWRad((v * Math.PI) / 180);
        case 'MCWRad': return CCWRad(-v);
        case 'MCWDeg': return CCWRad(-(v * Math.PI) / 180);
    }
};

/** Convert CCWDeg to CCWRad. */
export const ccwdeg2rad = (deg: CCWDeg): CCWRad => CCWRad((Number(deg) * Math.PI) / 180);

/** Convert CWDeg to CWRad. */
export const cwdeg2rad = (deg: CWDeg): CWRad => CWRad((Number(deg) * Math.PI) / 180);
