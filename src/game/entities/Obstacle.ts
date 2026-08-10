import { Scene } from 'phaser';
import {
    COLOR_VALUES,
    ColorId,
    DEPTH_ORBS,
    OBSTACLE_DEPTH,
    OBSTACLE_EDGE_THICKNESS,
    OBSTACLE_FILL_ALPHA,
    OBSTACLE_HALF_WIDTH,
    OBSTACLE_HATCH_ALPHA,
    OBSTACLE_HATCH_COUNT,
    PULSE_AMOUNT,
    PULSE_PERIOD,
    SLIDER_AMPLITUDE,
    SLIDER_PERIOD,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { ObstacleKind, ObstacleSpec } from '../config/level';
import { laneCenterX } from '../systems/Lanes';
import { depthScale, fillProjectedQuad, projectX } from '../systems/Projection';
import { drawStrength, screenYFor } from '../systems/World';
import { clamp } from '../utils/math';

const TAU = Math.PI * 2;

/**
 * A coloured barrier across part of the track.
 *
 * Safe to pass through only while the drop carries the same colour; anything
 * else costs points and the combo.
 *
 * Where a barrier *is* comes from a single pair of functions of distance
 * travelled, which both the renderer and the collision check call. A moving
 * barrier drawn from one source and collided from another would drift apart,
 * and the player would be punished for a gap they could see was open.
 *
 * Deriving position from travelled distance rather than wall-clock also means
 * a barrier is in the same place on every run, and pausing cannot shift it.
 */
export class Obstacle
{
    readonly distance: number;
    readonly color: ColorId;
    readonly kind: ObstacleKind;

    /** True once passed, so it can only count one time. */
    consumed = false;

    private readonly lane: number;
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, spec: ObstacleSpec)
    {
        this.distance = spec.distance;
        this.color = spec.color;
        this.kind = spec.kind;
        this.lane = spec.lane;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_ORBS);
    }

    /**
     * Track-space centre at a given point on the course.
     */
    trackXAt (travelled: number): number
    {
        const home = laneCenterX(this.lane);

        if (this.kind !== 'slider')
        {
            return home;
        }

        const phase = ((travelled - this.distance) / SLIDER_PERIOD) * TAU;
        const half = this.halfWidthAt(travelled);

        //  Kept inside the track, so a slider never leaves the playable width
        //  and can always be gone round.
        return clamp(
            home + (Math.sin(phase) * SLIDER_AMPLITUDE),
            TRACK_LEFT + half,
            TRACK_LEFT + TRACK_WIDTH - half
        );
    }

    /**
     * Half-width at a given point on the course. Only pulsing barriers vary.
     */
    halfWidthAt (travelled: number): number
    {
        if (this.kind !== 'pulse')
        {
            return OBSTACLE_HALF_WIDTH;
        }

        const phase = ((travelled - this.distance) / PULSE_PERIOD) * TAU;

        return OBSTACLE_HALF_WIDTH * (1 + (Math.sin(phase) * PULSE_AMOUNT));
    }

    /**
     * @returns the barrier's current screen y.
     */
    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);

        const centre = this.trackXAt(travelled);
        const half = this.halfWidthAt(travelled);
        const left = centre - half;
        const right = centre + half;

        const near = y + (OBSTACLE_DEPTH / 2);
        const far = y - (OBSTACLE_DEPTH / 2);

        const value = COLOR_VALUES[this.color];
        const gfx = this.gfx;

        gfx.clear();
        gfx.setAlpha(drawStrength(this.distance, travelled));

        gfx.fillStyle(value, OBSTACLE_FILL_ALPHA);
        fillProjectedQuad(gfx, left, right, far, near);

        //  A solid rim and diagonal hatching, so a barrier never reads as a
        //  large orb - the two mean opposite things on contact.
        gfx.lineStyle(OBSTACLE_EDGE_THICKNESS * depthScale(y), value, 1);
        gfx.lineBetween(projectX(left, far), far, projectX(right, far), far);
        gfx.lineBetween(projectX(left, near), near, projectX(right, near), near);
        gfx.lineBetween(projectX(left, far), far, projectX(left, near), near);
        gfx.lineBetween(projectX(right, far), far, projectX(right, near), near);

        gfx.lineStyle(2 * depthScale(y), value, OBSTACLE_HATCH_ALPHA);

        for (let i = 1; i <= OBSTACLE_HATCH_COUNT; i++) {

            const t = i / (OBSTACLE_HATCH_COUNT + 1);
            const from = left + ((right - left) * t);

            gfx.lineBetween(projectX(from, far), far, projectX(from - (half * 0.5), near), near);

        }

        return y;
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
