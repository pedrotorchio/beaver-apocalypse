import * as vec from "../../general/vector";
import { signal } from "@preact/signals";
import * as planck from "planck-js";
import { Renders } from "../../core/types/Renders.type";
import { Updates } from "../../core/types/Updates.type";
import { Vec2Like } from "../../general/vector";
import { iterate, makeEnumArray } from "../../general/utils";
import { GameModules } from "../../core/types/GameModules.type";
import { PhysicsWorld } from "../../core/PhysicsWorld";

export class GroundDetection implements Updates, Renders {
    
    private readonly velocityStopThreshold = 10;
    
    #isGrounded = signal(false);
    getIsGrounded(): boolean {
        return this.#isGrounded.value;
    }
    #groundTouchPoints: Vec2Like[] = []
    getGroundTouchPoints(): Vec2Like[] {
        return this.#groundTouchPoints;
    }
    #groundNormalDirection: planck.Vec2 = vec.ZERO();
    getGroundNormalDirection(): Vec2Like {
        return this.#groundNormalDirection;
    }
    constructor(private readonly game: GameModules, private readonly body: planck.Body, private readonly radius: number) {}

    private checkPointTouchesGround(point: Vec2Like) {
        return this.game.terrain.isSolid(point.x, point.y);
    };
    update(): void {
        this.updateCollisionCheckPoints();
        this.#groundTouchPoints = [];
        // Check if grounded by checking bottom points
        const pos = this.body.getPosition();
        this.#isGrounded.value = false;
        this.#groundNormalDirection = vec.ZERO();
        for (const point of this.#collisionCheckPoints) {
            const isGround = point.y >= pos.y && this.checkPointTouchesGround(point);
            if (!isGround) continue;

            this.#isGrounded.value = true;
            this.#groundTouchPoints.push(point);
            const normalVector = pos.clone().sub(planck.Vec2(point));
            this.#groundNormalDirection.add(normalVector);
        }
        this.#groundNormalDirection.normalize();
        if (!this.#isGrounded.value) return;
        const velocity = this.body.getLinearVelocity();
        const velocityInGroundNormalDirection = vec.project(velocity, this.#groundNormalDirection);
        const mass = this.body.getMass()
        const gravity = PhysicsWorld.GRAVITY;
        const weight = gravity*mass;
        const normalForce = this.#groundNormalDirection.clone().mul(weight);
        this.body.setLinearVelocity(velocity.sub(velocityInGroundNormalDirection));
        this.body.applyForce(normalForce, pos);
        
        // Apply velocity stop threshold when grounded
        if (Math.abs(velocity.x) < this.velocityStopThreshold) {
            this.body.setLinearVelocity(planck.Vec2(0, velocity.y));
        }
    }
    render(): void {
        const position = this.body.getPosition();
        // Draw collision circle border for debugging
        this.game.core.shapes.with({ 
            strokeWidth: 1, 
            strokeColor: this.#isGrounded.value ? 'red' : 'grey' 
        }).circle(position, this.radius);

        for (const point of this.#collisionCheckPoints) {
            const isGrounded = this.checkPointTouchesGround(point);
            const color = isGrounded ? 'red' : 'grey';
            this.game.core.shapes.with({ strokeColor: color, strokeWidth: 1 }).line(position, point);
        }
        this.game.core.shapes.with({ strokeColor: "orange", strokeWidth: 1 }).arrow(position, position.clone().add(this.#groundNormalDirection.clone().mul(50)));
    }
    #collisionCheckPoints: Vec2Like[] = [];
    private updateCollisionCheckPoints() {
        // Check multiple points around the circle, with extra points in movement direction
        // Focus on bottom half for ground collision
        // Calculate check points dynamically based on current position
        const pos = this.body.getPosition();
        const radius = this.radius;
        // Check bottom points only, for ground collision
        const checkPoints = makeEnumArray(iterate(13, (i) => {
            // Visit 12 points along the bottom arc
            const fractionOf180 = i / 12;
            const angle = Math.PI * fractionOf180;
            const dir = vec.fromAngle(angle);
            const scaledDir = planck.Vec2(dir.x, dir.y);
            scaledDir.mul(radius);
            const enumValue = `${fractionOf180 * 180}deg`;
            return [enumValue, {
                x: pos.x + scaledDir.x,
                y: pos.y + scaledDir.y,
            }];
        }));
        this.#collisionCheckPoints = checkPoints;
    }
}
