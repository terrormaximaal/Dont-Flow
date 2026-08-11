import { Scene } from 'phaser';
import {
    COLOR_VALUES,
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
