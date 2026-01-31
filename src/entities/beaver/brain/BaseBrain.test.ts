import { describe, it, expect, beforeEach, vi } from "vitest";
import { BaseBrain } from "./BaseBrain";
import type { GameModules } from "../../../core/types/GameModules.type";
import type { Beaver } from "../Beaver";
import { CCWRad } from "../../../general/coordinateSystem";
import { DIRECTION_LEFT, DIRECTION_RIGHT } from "../../../core/types/Entity.type";

class TestBrain extends BaseBrain {
  executeThink = vi.fn().mockResolvedValue([]);
}

describe("BaseBrain.attack", () => {
  const mockGame = {} as unknown as GameModules;
  let mockCharacter: Beaver;
  let brain: TestBrain;

  beforeEach(() => {
    mockCharacter = {
      aim: { getAngle: vi.fn(() => CCWRad(0)) },
      direction: DIRECTION_RIGHT,
    } as unknown as Beaver;
    brain = new TestBrain(mockGame, mockCharacter);
  });

  it("returns true and clears fire when fire command was already set", () => {
    brain.getInputState().fire = true;
    const result = brain.attack({ type: "attack", target: "enemy", angle: CCWRad(0) });
    expect(result).toBe(true);
    expect(brain.getInputState().fire).toBe(false);
  });

  it("sets fire when angle is within tolerance", () => {
    vi.mocked(mockCharacter.aim.getAngle).mockReturnValue(CCWRad(0));
    brain.attack({ type: "attack", target: "enemy", angle: CCWRad(0.01) });
    expect(brain.getInputState().fire).toBe(true);
  });

  it("sets aimDown when facing right and target angle is above current", () => {
    vi.mocked(mockCharacter.aim.getAngle).mockReturnValue(CCWRad(0));
    brain.attack({ type: "attack", target: "enemy", angle: CCWRad(0.1) });
    expect(brain.getInputState().aimDown).toBe(true);
    expect(brain.getInputState().aimUp).toBe(false);
    expect(brain.getInputState().fire).toBe(false);
  });

  it("sets aimUp when facing right and target angle is below current", () => {
    vi.mocked(mockCharacter.aim.getAngle).mockReturnValue(CCWRad(0.1));
    brain.attack({ type: "attack", target: "enemy", angle: CCWRad(0) });
    expect(brain.getInputState().aimUp).toBe(true);
    expect(brain.getInputState().aimDown).toBe(false);
    expect(brain.getInputState().fire).toBe(false);
  });

  it("sets aimUp when facing left and target angle is above current", () => {
    const leftFacingCharacter = {
      aim: { getAngle: vi.fn(() => CCWRad(0)) },
      direction: DIRECTION_LEFT,
    } as unknown as Beaver;
    const leftBrain = new TestBrain(mockGame, leftFacingCharacter);
    vi.mocked(leftFacingCharacter.aim.getAngle).mockReturnValue(CCWRad(0));
    leftBrain.attack({ type: "attack", target: "enemy", angle: CCWRad(0.1) });
    expect(leftBrain.getInputState().aimUp).toBe(true);
    expect(leftBrain.getInputState().aimDown).toBe(false);
  });

  it("sets aimDown when facing left and target angle is below current", () => {
    const leftFacingCharacter = {
      aim: { getAngle: vi.fn(() => CCWRad(0.1)) },
      direction: DIRECTION_LEFT,
    } as unknown as Beaver;
    const leftBrain = new TestBrain(mockGame, leftFacingCharacter);
    vi.mocked(leftFacingCharacter.aim.getAngle).mockReturnValue(CCWRad(0.1));
    leftBrain.attack({ type: "attack", target: "enemy", angle: CCWRad(0) });
    expect(leftBrain.getInputState().aimDown).toBe(true);
    expect(leftBrain.getInputState().aimUp).toBe(false);
  });

  it("returns false when aim needs adjustment", () => {
    vi.mocked(mockCharacter.aim.getAngle).mockReturnValue(CCWRad(0));
    const result = brain.attack({ type: "attack", target: "enemy", angle: CCWRad(0.5) });
    expect(result).toBe(false);
  });
});
