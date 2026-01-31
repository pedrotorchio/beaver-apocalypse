# Angle and Coordinate Reference Systems

A reference for understanding the different coordinate and angle systems used in the game.

---

## External Systems

### Canvas (HTML5)

| Property | Value |
|----------|-------|
| **Position units** | Pixels |
| **Origin** | Top-left corner (0, 0) |
| **X-axis** | Increases right |
| **Y-axis** | Increases **downward** |
| **Angles** | Not used directly; drawing uses pixel coordinates |

Canvas has no built-in angle system. You convert angles to positions using `cos`/`sin` yourself.

---

### Math / JavaScript

| Property | Value |
|----------|-------|
| **Angle units** | Radians |
| **`Math.atan2(y, x)`** | Returns angle from positive X-axis to point (x, y) |
| **Range** | -π to π |
| **0 radians** | Right (positive X) |
| **π/2 radians (90°)** | Up (positive Y in **math** coordinates) |
| **-π/2 radians (-90°)** | Down |
| **π or -π radians (180°)** | Left |
| **Direction** | Counterclockwise from right = positive angle |

**Important:** `atan2` uses **math convention** (Y-up). In a Y-down system (like Canvas), π/2 points **down** on screen.

---

### PlanckJS (Box2D)

| Property | Value |
|----------|-------|
| **Position units** | Meters (scaled in this game) |
| **Origin** | Bottom-left in Box2D default; this game uses same as Canvas |
| **X-axis** | Increases right |
| **Y-axis** | Increases **downward** (gravity is `Vec2(0, 50)`) |
| **Angle units** | Radians |
| **`planck.Rot(angle)`** | Rotation; `Rot.mulVec2(rot, Vec2(1,0))` gives direction |
| **0 radians** | Right |
| **π/2 radians** | Down (matches Y-down; `Vec2(0, 1)`) |
| **-π/2 radians** | Up |
| **π radians** | Left |

PlanckJS follows Box2D. With Y-down gravity, positive angle = clockwise from right = downward.

---

## Game-Specific Angle Usage

### 1. Aim entity (`src/entities/Aim.ts`)

| Property | Value |
|----------|-------|
| **Units** | Radians |
| **0** | Forward (right when facing right) |
| **π/2** | Up |
| **-π/2** | Down |
| **Range** | [-π/2, π/2] |
| **Convention** | Math-style (positive = up), **relative to facing right** |

Stored angle is always in "facing right" reference. When facing left, other code transforms it.

---

### 2. `vec.fromAngle` (`src/general/vector.ts`)

| Property | Value |
|----------|-------|
| **Input** | Radians |
| **Output** | `Vec2(cos(θ), sin(θ))` |
| **0** | (1, 0) = right |
| **π/2** | (0, 1) = **down** in Y-down physics |
| **-π/2** | (0, -1) = up |

Uses standard math formula. In this game's Y-down physics, π/2 = down.

---

### 3. Beaver fire angle (`Beaver.ts`, `WeaponManager.ts`)

| Property | Value |
|----------|-------|
| **Input** | Aim angle (Aim convention) |
| **Transform when facing left** | `fireAngle = π - aimAngle` |
| **Output** | World angle for `fromAngle` |

Aim says π/2 = up. `fromAngle` says π/2 = down. There may be a convention mismatch here—worth verifying projectile direction.

---

### 4. Brain attack angle (`AlgorithmicBasedBrain.ts`)

| Property | Value |
|----------|-------|
| **Source** | `Math.atan2(direction.y, direction.x)` |
| **Convention** | World coordinates (math: 0=right, π/2=up) |
| **Consumer** | `BaseBrain.attack()` compares to `Aim.getAngle()` |

The brain outputs world angle. Aim expects "facing right" relative angle. A transform is needed for correct comparison.

---

### 5. AimIndicatorRenderer (`src/ui/AimIndicatorRenderer.ts`)

| Property | Value |
|----------|-------|
| **Input** | Degrees (0, 45, 90, -45, -90) |
| **Conversion** | `rad = (deg * π) / 180` |
| **Drawing** | `x + r*cos(rad)*facing`, `y - r*sin(rad)` |

Uses `y - sin` so positive angle = up on screen. Matches Aim convention (π/2 = up).

---

### 6. Shapes arrow (`src/general/Shapes.ts`)

| Property | Value |
|----------|-------|
| **Angle** | `Math.atan2(dy, dx)` |
| **Drawing** | `end.y - arrowheadSize * sin(angle ± offset)` |

Same as AimIndicator: `y - sin` for canvas, so positive angle = up.

---

### 7. HUDRenderer angle reference (`src/ui/HUDRenderer.ts`)

| Property | Value |
|----------|-------|
| **Uses** | `planck.Rot(angleRad)` with `baseVec = (1, 0)` |
| **Convention** | PlanckJS (0=right, π/2=down) |
| **Drawing** | `centerX + pos.x`, `centerY + pos.y` |

Direct PlanckJS convention. 90° label appears at bottom of the circle.

---

### 8. GroundDetection (`src/entities/properties/GroundDetection.ts`)

| Property | Value |
|----------|-------|
| **Angle** | `Math.PI * fractionOf180` (0 to π) |
| **Purpose** | Bottom arc of circle for collision checks |
| **Uses** | `vec.fromAngle(angle)` |

Sweeps from 0 (right) to π (left) along the bottom half.

---

## Quick Reference Table

| System | 0° | 90° | 180° | 270° | Units |
|--------|-----|-----|------|------|-------|
| Math.atan2 | Right | Up (math Y) | Left | Down | Radians |
| PlanckJS (Y-down) | Right | Down | Left | Up | Radians |
| Aim | Forward | Up | — | Down | Radians |
| vec.fromAngle | Right | Down* | Left | Up* | Radians |

*In Y-down physics space.

---

## Potential Inconsistencies

1. **Aim vs fromAngle:** Aim uses π/2 = up. `fromAngle(π/2)` gives (0,1) = down in Y-down. Confirm projectile direction when aiming "up".
2. **Brain vs Aim:** Brain uses `atan2` (world, math convention). Aim uses facing-relative. Needs explicit transform for attack alignment.
