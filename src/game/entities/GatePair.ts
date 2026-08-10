import { Scene } from 'phaser';
import {
    COLOR_VALUES,
    ColorId,
    DEPTH_GATES,
    PORTAL_ARCH_RISE,
    PORTAL_ARCH_STEPS,
    PORTAL_FRAME_THICKNESS,
    PORTAL_GLOW_ALPHA,
    PORTAL_GLOW_LAYERS,
    PORTAL_GLOW_SPREAD,
    PORTAL_HEIGHT,
    PORTAL_INNER_ALPHA,
    PORTAL_MOTE_ALPHA,
    PORTAL_MOTE_RADIUS,
    PORTAL_MOTE_RISE,
    PORTAL_MOTES,
    PORTAL_SPILL_ALPHA,
    PORTAL_SPILL_DEPTH,
    PORTAL_SPILL_STEPS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { GatePairSpec } from '../config/level';
import { gateSideAt, gateSplitX } from '../systems/contact';
import { depthScale, fillProjectedQuad, projectX } from '../systems/Projection';
import { drawStrength, screenYFor } from '../systems/World';

const TAU = Math.PI * 2;

/**
 * Two glowing portals standing side by side across the road. Passing through
 * one repaints the drop; together they span the whole road, so passing through
 * is unavoidable.
 *
 * A portal is a doorway rather than a line painted on the ground: an arched
 * frame standing up from the road, a soft glow around it, and its light thrown
 * forward onto the surface. The colour arrives long before the doorway does,
 * which is what lets the player choose a side without any text.
 */
export class GatePair
{
    readonly distance: number;

    /** Set once the drop has passed, so a pair can only fire a single time. */
    triggered = false;

    private readonly splitX: number;
    private readonly splitAfterLane: 0 | 1;
    private readonly colors: [ ColorId, ColorId ];
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, spec: GatePairSpec)
    {
        this.distance = spec.distance;
        this.colors = spec.colors;
        this.splitAfterLane = spec.splitAfterLane;
        this.splitX = gateSplitX(spec.splitAfterLane);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_GATES);
    }

    /** Which portal a given track-space x falls inside. */
    colorAt (x: number): ColorId
    {
        return this.colors[gateSideAt(x, this.splitAfterLane)];
    }

    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);
        const scale = depthScale(y);
        const gfx = this.gfx;

        gfx.clear();

        //  Once the drop is through, the doorway is behind it and simply stops
        //  being drawn. Left up, it fills the screen as it rushes past and
        //  swamps everything the player still has to read.
        if (travelled >= this.distance)
        {
            return y;
        }

        const strength = drawStrength(this.distance, travelled);

        if (strength <= 0)
        {
            return y;
        }

        gfx.setAlpha(strength);

        //  Light on the road comes first, so the doorways sit on top of it.
        this.spill(gfx, TRACK_LEFT, this.splitX, this.colors[0], y, travelled);
        this.spill(gfx, this.splitX, TRACK_LEFT + TRACK_WIDTH, this.colors[1], y, travelled);

        this.portal(gfx, TRACK_LEFT, this.splitX, this.colors[0], y, scale, travelled);
        this.portal(gfx, this.splitX, TRACK_LEFT + TRACK_WIDTH, this.colors[1], y, scale, travelled);

        return y;
    }

    /**
     * The light a portal throws forward onto the road, fading with distance
     * from the doorway.
     */
    private spill (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        color: ColorId,
        y: number,
        travelled: number
    ): void
    {
        const value = COLOR_VALUES[color];

        for (let i = 0; i < PORTAL_SPILL_STEPS; i++)
        {
            const from = this.distance - (PORTAL_SPILL_DEPTH * (i / PORTAL_SPILL_STEPS));
            const to = this.distance - (PORTAL_SPILL_DEPTH * ((i + 1) / PORTAL_SPILL_STEPS));

            const nearY = screenYFor(from, travelled);
            const farY = screenYFor(to, travelled);

            //  Brightest at the threshold, gone by the far end of the pool.
            gfx.fillStyle(value, PORTAL_SPILL_ALPHA * (1 - (i / PORTAL_SPILL_STEPS)) * 0.5);
            fillProjectedQuad(gfx, left, right, farY, nearY);
        }

        void y;
    }

    /** One doorway: glow, inner light, arched frame, and drifting motes. */
    private portal (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        color: ColorId,
        y: number,
        scale: number,
        travelled: number
    ): void
    {
        const value = COLOR_VALUES[color];

        const baseLeft = projectX(left, y);
        const baseRight = projectX(right, y);
        const width = baseRight - baseLeft;

        if (width < 2) { return; }

        const height = PORTAL_HEIGHT * scale;
        const top = y - height;
        const rise = height * PORTAL_ARCH_RISE;

        //  A soft halo, built from a few widening passes rather than a blur.
        for (let layer = PORTAL_GLOW_LAYERS; layer > 0; layer--)
        {
            const spread = PORTAL_GLOW_SPREAD * scale * (layer / PORTAL_GLOW_LAYERS);

            gfx.fillStyle(value, PORTAL_GLOW_ALPHA);
            this.arch(gfx, baseLeft - spread, baseRight + spread, y + (spread * 0.4), top - spread, rise);
        }

        gfx.fillStyle(value, PORTAL_INNER_ALPHA);
        this.arch(gfx, baseLeft, baseRight, y, top, rise);

        //  The frame itself: two uprights and the arch over them.
        const thickness = Math.max(1.5, PORTAL_FRAME_THICKNESS * scale);

        gfx.lineStyle(thickness, value, 1);
        gfx.lineBetween(baseLeft, y, baseLeft, top);
        gfx.lineBetween(baseRight, y, baseRight, top);

        this.strokeArch(gfx, baseLeft, baseRight, top, rise);

        this.motes(gfx, baseLeft, baseRight, y, height, value, scale, travelled);
    }

    /** Fills a doorway: straight sides with a curved head. */
    private arch (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        base: number,
        top: number,
        rise: number
    ): void
    {
        const midX = (left + right) / 2;
        const halfWidth = (right - left) / 2;

        gfx.fillRect(left, top, right - left, base - top);

        for (let i = 0; i < PORTAL_ARCH_STEPS; i++)
        {
            const a0 = (i / PORTAL_ARCH_STEPS) * Math.PI;
            const a1 = ((i + 1) / PORTAL_ARCH_STEPS) * Math.PI;

            gfx.fillTriangle(
                midX, top,
                midX - (Math.cos(a0) * halfWidth), top - (Math.sin(a0) * rise),
                midX - (Math.cos(a1) * halfWidth), top - (Math.sin(a1) * rise)
            );
        }
    }

    private strokeArch (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        top: number,
        rise: number
    ): void
    {
        const midX = (left + right) / 2;
        const halfWidth = (right - left) / 2;

        for (let i = 0; i < PORTAL_ARCH_STEPS; i++)
        {
            const a0 = (i / PORTAL_ARCH_STEPS) * Math.PI;
            const a1 = ((i + 1) / PORTAL_ARCH_STEPS) * Math.PI;

            gfx.lineBetween(
                midX - (Math.cos(a0) * halfWidth), top - (Math.sin(a0) * rise),
                midX - (Math.cos(a1) * halfWidth), top - (Math.sin(a1) * rise)
            );
        }
    }

    /**
     * Motes rising through the doorway.
     *
     * Their drift comes from distance travelled, so they move with the world
     * and stop dead when the run is paused.
     */
    private motes (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        base: number,
        height: number,
        value: number,
        scale: number,
        travelled: number
    ): void
    {
        if (scale < 0.25) { return; }

        gfx.fillStyle(value, PORTAL_MOTE_ALPHA * scale);

        for (let i = 0; i < PORTAL_MOTES; i++)
        {
            const phase = (i / PORTAL_MOTES) + ((travelled / PORTAL_MOTE_RISE) * 0.1);
            const t = phase % 1;

            const x = left + ((right - left) * ((Math.sin((i * 12.9898) + (t * TAU)) * 0.5) + 0.5));
            const y = base - (height * t);

            gfx.fillCircle(x, y, PORTAL_MOTE_RADIUS * scale * (1 - (t * 0.6)));
        }
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
