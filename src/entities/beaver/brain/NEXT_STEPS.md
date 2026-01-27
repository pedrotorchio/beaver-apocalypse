# Next Steps for AlgorithmicBasedBrain Implementation

## Current State
- ✅ BaseBrain class created with shared functionality
- ✅ LLMBasedBrain refactored to extend BaseBrain
- ✅ AlgorithmicBasedBrain created with basic implementation
- ✅ Template method pattern with `think()` -> `executeThink()` -> helper methods

## Implementation Status
The current AlgorithmicBasedBrain has a simple implementation that:
- Finds the closest enemy
- Attacks if within 100 units
- Moves toward enemy if out of range, then attacks

## Next Steps to Complete

### 1. Movement Constraints & Validation
- [ ] Determine maximum movement distance per turn
- [ ] Add terrain boundary checking (ensure target is within terrainWidth)
- [ ] Validate that move target doesn't put character in physical contact with enemies
- [ ] Consider terrain height/obstacles if applicable

### 2. Attack Calculation Improvements
- [ ] Implement proper angle calculation (accounting for facing direction like Beaver.attack does)
- [ ] Calculate power based on distance (currently just returns angle, power calculation needed)
- [ ] Consider projectile physics (parabolic trajectory) when calculating angle
- [ ] Add minimum distance check to avoid self-damage

### 3. Tactical Decision Making
- [ ] Prioritize enemies by HP (weaker enemies first)
- [ ] Consider multiple enemies when choosing target
- [ ] Avoid clustering with enemies (maintain safe distance)
- [ ] Consider character's own HP when deciding aggression level

### 4. Edge Cases
- [ ] Handle case when character is dead
- [ ] Handle case when all enemies are dead
- [ ] Handle case when character is stuck/can't move
- [ ] Handle case when no valid attack position exists

### 5. Testing & Validation
- [ ] Test with different enemy positions
- [ ] Test with character at terrain boundaries
- [ ] Test with multiple enemies
- [ ] Compare behavior with LLMBasedBrain output
- [ ] Verify actions are executed correctly by BrainActionPlan

### 6. Optional Enhancements
- [ ] Add pathfinding if terrain has obstacles
- [ ] Consider enemy movement prediction
- [ ] Add defensive positioning (move away when low HP)
- [ ] Optimize for different game scenarios

## Questions to Resolve
1. What is the maximum movement distance per turn?
2. Are there terrain obstacles or is it just a flat surface with width constraint?
3. Should power be calculated based on distance, or is there a different formula?
4. How should the angle account for the character's facing direction (left/right)?
5. What constitutes "physical contact" with enemies? (radius-based collision?)
