import { Scene } from 'phaser';
import {
    COLOR_VALUES,
    ColorId,
    DEPTH_GATES,
    GATE_SWAP_FLASH_ALPHA,
    GATE_SWAP_FRAME_INSET,
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
    PORTAL_ENERGY_ALPHA,
    PORTAL_ENERGY_BANDS,
    PORTAL_ENERGY_RISE,
    PORTAL_PULSE_DEPTH,
    PORTAL_PULSE_PERIOD,
    PORTAL_REACT_DISTANCE,
    PORTAL_REACT_GAIN,
    PORTAL_SPILL_ALPHA,
    PORTAL_SPILL_DEPTH,
    PORTAL_SPILL_STEPS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { GatePairSpec } from '../config/level';
import { gateSideAt, gateSplitX } from '../systems/contact';
import { gateColorsAt, gateSwapFlash } from '../systems/gates';
import { mixColor } from '../utils/color';
import { clamp } from '../utils/math';
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
    private readonly swap: boolean;
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, spec: GatePairSpec)
    {
        this.distance = spec.distance;
        this.colors = spec.colors;
        this.swap = spec.swap ?? false;
        this.splitAfterLane = spec.splitAfterLane;
        this.splitX = gateSplitX(spec.splitAfterLane);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_GATES);
    }

    /**
     * Which portal a given track-space x falls inside, and what colour it is
     * *at this point on the course*.
     *
     * Asked once, at contact. The picture is drawn every frame from the same
     * function, which is what stops a swapping gate from ever looking like one
     * thing and answering as another - the whole mechanic rests on it being a
     * twist rather than a lie.
     */
    colorAt (x: number, travelled: number): ColorId
    {
        const colors = gateColorsAt(this.colors, this.distance, travelled, this.swap);

        return colors[gateSideAt(x, this.splitAfterLane)];
    }

    /**
     * @param dropX Screen x of the drop, so the doorway it is heading for can
     *              answer before it arrives.
     */
    update (travelled: number, dropX: number): number
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

        //  A slow breath, from distance rather than the clock so it moves with
        //  the world and holds still when the run is paused.
        const breath = 1 + (Math.sin((travelled / PORTAL_PULSE_PERIOD) * TAU) * PORTAL_PULSE_DEPTH);

        //  The doorway the drop is lined up with brightens as it closes, so the
        //  choice is answered before it is made rather than after.
        const closing = 1 - clamp((this.distance - travelled) / PORTAL_REACT_DISTANCE, 0, 1);
        const chosen = gateSideAt(dropX, this.splitAfterLane);

        const life = (side: 0 | 1) =>
            breath * (1 + (side === chosen ? closing * PORTAL_REACT_GAIN : 0));

        //  The same answer the collision will get, so the picture can never
        //  disagree with it.
        const colors = gateColorsAt(this.colors, this.distance, travelled, this.swap);

        //  Washing towards white as the colours change hands. A crossfade on
        //  its own is something a player watching the road can miss entirely;
        //  a flash at the moment of the swap is what makes them look back.
        const flash = gateSwapFlash(this.distance, travelled, this.swap) * GATE_SWAP_FLASH_ALPHA;

        const shown = (side: 0 | 1) => mixColor(COLOR_VALUES[colors[side]], 0xffffff, flash);

        //  Light on the road comes first, so the doorways sit on top of it.
        this.spill(gfx, TRACK_LEFT, this.splitX, shown(0), y, travelled, life(0));
        this.spill(gfx, this.splitX, TRACK_LEFT + TRACK_WIDTH, shown(1), y, travelled, life(1));

        this.portal(gfx, TRACK_LEFT, this.splitX, shown(0), y, scale, travelled, life(0));
        this.portal(gfx, this.splitX, TRACK_LEFT + TRACK_WIDTH, shown(1), y, scale, travelled, life(1));

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
        value: number,
        y: number,
        travelled: number,
        life: number
    ): void
    {

        for (let i = 0; i < PORTAL_SPILL_STEPS; i++)
        {
            const from = this.distance - (PORTAL_SPILL_DEPTH * (i / PORTAL_SPILL_STEPS));
            const to = this.distance - (PORTAL_SPILL_DEPTH * ((i + 1) / PORTAL_SPILL_STEPS));

            const nearY = screenYFor(from, travelled);
            const farY = screenYFor(to, travelled);

            //  Brightest at the threshold, gone by the far end of the pool.
            gfx.fillStyle(value, PORTAL_SPILL_ALPHA * (1 - (i / PORTAL_SPILL_STEPS)) * 0.5 * life);
            fillProjectedQuad(gfx, left, right, farY, nearY);
        }

        void y;
    }

    /** One doorway: glow, inner light, arched frame, and drifting motes. */
    private portal (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        value: number,
        y: number,
        scale: number,
        travelled: number,
        life: number
    ): void
    {
        const baseLeft = projectX(left, y);
        const baseRight = projectX(right, y);
        const width = baseRight - baseLeft;

        if (width < 2) { return; }

        const height = PORTAL_HEIGHT * scale;
        const top = y - height;
        const rise = height * PORTAL_ARCH_RISE;

        //  A soft halo, built from a few widening passes rather than a blur.
        //
        //  Each pass is the doorway pushed out by the same amount all the way
        //  round: wider, deeper, and with the arch rising further to match. Grow
        //  the width without growing the rise and the halo's shoulders stay
        //  square while the doorway they sit behind is already curving - which
        //  put a visible box around every portal.
        for (let layer = PORTAL_GLOW_LAYERS; layer > 0; layer--)
        {
            const spread = PORTAL_GLOW_SPREAD * scale * (layer / PORTAL_GLOW_LAYERS);

            gfx.fillStyle(value, PORTAL_GLOW_ALPHA * life);
            this.arch(gfx, baseLeft - spread, baseRight + spread, y + (spread * 0.4), top, rise + spread);
        }

        gfx.fillStyle(value, PORTAL_INNER_ALPHA * life);
        this.arch(gfx, baseLeft, baseRight, y, top, rise);

        this.energy(gfx, baseLeft, baseRight, y, height, value, travelled, life);

        //  The frame itself: two uprights and the arch over them.
        const thickness = Math.max(1.5, PORTAL_FRAME_THICKNESS * scale);

        gfx.lineStyle(thickness, value, 1);
        gfx.lineBetween(baseLeft, y, baseLeft, top);
        gfx.lineBetween(baseRight, y, baseRight, top);

        this.strokeArch(gfx, baseLeft, baseRight, top, rise);

        //  A second frame inside the first, for the gates that swap. This is
        //  the warning the mechanic needs to be a twist rather than a trick:
        //  the doorway is drawn twice, and a player learns what that means the
        //  first time one of them changes its mind.
        if (this.swap)
        {
            const inset = GATE_SWAP_FRAME_INSET * scale;

            if (baseRight - baseLeft > inset * 3)
            {
                gfx.lineStyle(Math.max(1, thickness * 0.6), value, 0.75);
                gfx.lineBetween(baseLeft + inset, y, baseLeft + inset, top + inset);
                gfx.lineBetween(baseRight - inset, y, baseRight - inset, top + inset);

                this.strokeArch(gfx, baseLeft + inset, baseRight - inset, top + inset, rise * 0.8);
            }
        }

        this.motes(gfx, baseLeft, baseRight, y, height, value, scale, travelled);
    }

    /**
     * Bands of light climbing the inside of a doorway.
     *
     * What turns a coloured shape into something running: the frame is still,
     * so anything moving inside it reads as the doorway being powered rather
     * than as the doorway moving.
     */
    private energy (
        gfx: Phaser.GameObjects.Graphics,
        left: number,
        right: number,
        base: number,
        height: number,
        value: number,
        travelled: number,
        life: number
    ): void
    {
        //  Below this a band is thinner than a line and only adds mush.
        if (height < 24) { return; }

        for (let i = 0; i < PORTAL_ENERGY_BANDS; i++)
        {
            const phase = ((i / PORTAL_ENERGY_BANDS) + (travelled / PORTAL_ENERGY_RISE)) % 1;

            //  Fading as it climbs, so each band arrives rather than blinks out.
            const fade = 1 - phase;
            const y = base - (height * phase);

            gfx.fillStyle(value, PORTAL_ENERGY_ALPHA * fade * life);
            gfx.fillRect(left, y, right - left, Math.max(1, height * 0.035));
        }
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
