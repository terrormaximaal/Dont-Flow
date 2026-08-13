import { Scene } from 'phaser';
import {
    COLOR_VALUES,
    GAP_DEPTH,
    GAP_FLOOR_ALPHA,
    GAP_LIP_ALPHA,
    GAP_LIP_THICKNESS,
    GAP_WARN_ALPHA,
    GAP_WARN_BARS,
    HURDLE_CHEVRON_ALPHA,
    HURDLE_CHEVRONS,
    HURDLE_HEIGHT_SCALE,
    ColorId,
    DEPTH_ORBS,
    OBSTACLE_DEPTH,
    OBSTACLE_EDGE_THICKNESS,
    OBSTACLE_FILL_ALPHA,
    OBSTACLE_HATCH_ALPHA,
    OBSTACLE_HATCH_COUNT,
    OBSTACLE_FOOT_ALPHA,
    OBSTACLE_STAND_HEIGHT
} from '../config/constants';
import { ObstacleKind, ObstacleProfile, ObstacleSpec } from '../config/level';
import { barrierCentre, barrierHalfWidth } from '../systems/barrier';
import { depthScale, fillProjectedQuad, projectX } from '../systems/Projection';
import { drawStrength, screenYFor } from '../systems/World';

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

    /** Whether it can be cleared from above. */
    readonly profile: ObstacleProfile;

    /** True once passed, so it can only count one time. */
    consumed = false;

    private readonly lane: number;
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, spec: ObstacleSpec)
    {
        this.distance = spec.distance;
        this.color = spec.color;
        this.kind = spec.kind;
        this.profile = spec.profile;
        this.lane = spec.lane;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_ORBS);
    }

    /**
     * Track-space centre at a given point on the course.
     */
    trackXAt (travelled: number): number
    {
        return barrierCentre(this.kind, this.lane, travelled);
    }

    /**
     * Half-width at a given point on the course. Only pulsing barriers vary.
     */
    halfWidthAt (travelled: number): number
    {
        return barrierHalfWidth(this.kind, travelled);
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

        const scale = depthScale(y);
        const value = COLOR_VALUES[this.color];
        const gfx = this.gfx;

        gfx.clear();
        gfx.setAlpha(drawStrength(this.distance, travelled));

        if (this.profile === 'gap')
        {
            this.drawGap(gfx, left, right, travelled, scale);

            return y;
        }

        //  Its footprint on the road, which is what grounds it.
        gfx.fillStyle(value, OBSTACLE_FOOT_ALPHA);
        fillProjectedQuad(gfx, left, right, y - (OBSTACLE_DEPTH / 2), y + (OBSTACLE_DEPTH / 2));

        const baseLeft = projectX(left, y);
        const baseRight = projectX(right, y);

        if (baseRight - baseLeft < 2) { return y; }

        //  The face standing up from it. Flat and facing the camera, so its top
        //  corners sit directly above the base ones. A low one stands a
        //  fraction of the height, which is the only cue the player gets that
        //  it can be jumped - so it has to be unmistakable.
        const stand = OBSTACLE_STAND_HEIGHT * (this.profile === 'low' ? HURDLE_HEIGHT_SCALE : 1);
        const top = y - (stand * scale);

        gfx.fillStyle(value, OBSTACLE_FILL_ALPHA);
        gfx.fillRect(baseLeft, top, baseRight - baseLeft, y - top);

        //  A solid rim and diagonal hatching, so a barrier never reads as a
        //  large orb - the two mean opposite things on contact.
        gfx.lineStyle(Math.max(1, OBSTACLE_EDGE_THICKNESS * scale), value, 1);
        gfx.strokeRect(baseLeft, top, baseRight - baseLeft, y - top);

        if (this.profile === 'low')
        {
            //  Chevrons pointing up the face rather than hatching across it.
            //  Hatching says "solid"; an arrow pointing over the top says the
            //  one thing the player needs to know, in no words.
            this.chevrons(gfx, baseLeft, baseRight, y, top, value, scale);

            void half;

            return y;
        }

        gfx.lineStyle(Math.max(1, 2 * scale), value, OBSTACLE_HATCH_ALPHA);

        for (let i = 1; i <= OBSTACLE_HATCH_COUNT; i++)
        {
            const t = i / (OBSTACLE_HATCH_COUNT + 1);
            const from = baseLeft + ((baseRight - baseLeft) * t);
            const lean = (baseRight - baseLeft) * 0.22;

            gfx.lineBetween(from, y, from - lean, top);
        }

        void half;

        return y;
    }

    /**
     * A hole in the road.
     *
     * Drawn as an absence rather than an object: a dark floor sunk into the
     * surface, a lit lip along the near edge so it reads as an edge rather than
     * as a painted rectangle, and warning bars on the approach. Everything else
     * on this road stands up from it; this is the only thing that goes down,
     * and it has to say so before the player is on top of it.
     */
    private drawGap (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        travelled: number,
        scale: number
    ): void
    {
        const farY = screenYFor(this.distance + (GAP_DEPTH / 2), travelled);
        const nearY = screenYFor(this.distance - (GAP_DEPTH / 2), travelled);

        //  The hole itself: near black, whatever the world's road is, because
        //  a hole is not a darker piece of road.
        gfx.fillStyle(0x05070d, GAP_FLOOR_ALPHA);
        fillProjectedQuad(gfx, left, right, farY, nearY);

        //  A lit lip along the near edge, catching the same light everything
        //  else in the game is lit by.
        gfx.lineStyle(Math.max(1, GAP_LIP_THICKNESS * scale), COLOR_VALUES[this.color], GAP_LIP_ALPHA);
        gfx.lineBetween(projectX(left, nearY), nearY, projectX(right, nearY), nearY);

        //  Warning bars on the approach, so the hole is announced while there
        //  is still road left to act on.
        const warnY = screenYFor(this.distance - GAP_DEPTH, travelled);

        gfx.lineStyle(Math.max(1, 2.5 * scale), COLOR_VALUES[this.color], GAP_WARN_ALPHA * 0.6);

        for (let i = 0; i < GAP_WARN_BARS; i++)
        {
            const t = (i + 0.5) / GAP_WARN_BARS;
            const x = left + ((right - left) * t);

            gfx.lineBetween(projectX(x, warnY), warnY, projectX(x, nearY), nearY);
        }
    }

    /** Upward chevrons across a hurdle's face: go over, not around. */
    private chevrons (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        base: number,
        top: number,
        value: number,
        scale: number
    ): void
    {
        const width = right - left;
        const height = base - top;

        gfx.lineStyle(Math.max(1, 2.5 * scale), 0xffffff, HURDLE_CHEVRON_ALPHA);

        for (let i = 0; i < HURDLE_CHEVRONS; i++)
        {
            const cx = left + (width * ((i + 0.5) / HURDLE_CHEVRONS));
            const arm = width / (HURDLE_CHEVRONS * 2.6);

            gfx.lineBetween(cx - arm, base - (height * 0.25), cx, top + (height * 0.2));
            gfx.lineBetween(cx, top + (height * 0.2), cx + arm, base - (height * 0.25));
        }

        void value;
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
