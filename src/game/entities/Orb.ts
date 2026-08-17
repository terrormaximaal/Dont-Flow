import { Scene } from 'phaser';
import { Glyph, GLYPHS } from '../config/glyphs';
import { drawGlyph } from '../ui/glyph';
import { areMarksOn } from '../systems/marks';
import {
    BLOB_RIPPLE_PER_PIXEL,
    COLOR_VALUES,
    ColorId,
    DEPTH_ORBS,
    ORB_CORE_ALPHA,
    ORB_FLOAT,
    ORB_FLOAT_PERIOD,
    ORB_GLOW_ALPHA,
    ORB_GLOW_LAYERS,
    ORB_GLOW_SPREAD,
    ORB_MAGNET_DISTANCE,
    ORB_MAGNET_REACH,
    ORB_MOTE_ALPHA,
    ORB_MOTE_ORBIT,
    ORB_MOTE_RADIUS,
    ORB_MOTES,
    ORB_LEAN_EASE,
    ORB_PASS_FADE,
    ORB_PASS_KEEP,
    ORB_RADIUS,
    ORB_REACT_DISTANCE,
    ORB_REACT_SWELL,
    ORB_SPIN_PER_PIXEL
} from '../config/constants';
import { OrbSpec } from '../config/level';
import { laneCenterX } from '../systems/Lanes';
import { project } from '../systems/Projection';
import { drawStrength, screenYFor } from '../systems/World';
import { clamp } from '../utils/math';
import { fillOutline } from '../ui/shapes';
import { blobOutline } from './drop-surface';

const TAU = Math.PI * 2;

/**
 * How much of an orb is left to draw, given how far past the drop it now is.
 *
 * Nothing, until it is off the bottom of the view. An orb the drop did not take
 * is one the drop went past, and going past something means watching it come
 * alongside and disappear behind you - not watching it evaporate at your own
 * shoulder, which is what a short fade here looked like.
 */
function fadedPast (past: number): number
{
    if (past <= ORB_PASS_KEEP) { return 1; }

    return Math.max(0, 1 - ((past - ORB_PASS_KEEP) / ORB_PASS_FADE));
}

/**
 * A coloured collectible sitting in one lane. Matching the drop's colour scores;
 * touching one of the wrong colour breaks the combo.
 *
 * Drawn as a wobbling blob rather than a circle, so an orb reads as the same
 * substance the drop is made of - something to be absorbed rather than a token
 * to be picked up.
 */
export class Orb
{
    readonly distance: number;
    readonly color: ColorId;

    /** Track x, fixed - orbs sit in the centre of their lane. Never projected. */
    readonly x: number;

    /** True once collected or hit, so it can only count once. */
    consumed = false;

    /**
     * Where this orb is in its own ripple, so a lane of them does not breathe in
     * step. Taken from where it sits, so it is the same on every run.
     */
    private readonly phase: number;

    private readonly value: number;

    /** The mark this colour wears, so it can be told apart without hue. */
    private readonly glyph: Glyph;
    private readonly gfx: Phaser.GameObjects.Graphics;

    //  How far out this orb is leaning towards the drop, and how swollen it is,
    //  both eased rather than switched. Kept here because easing needs to know
    //  where it got to last time.
    private near = 0;
    private pull = 0;

    /** Where the world had got to when this orb was last drawn. */
    private seenAt = -1;

    constructor (scene: Scene, spec: OrbSpec)
    {
        this.distance = spec.distance;
        this.color = spec.color;
        this.x = laneCenterX(spec.lane);
        this.value = COLOR_VALUES[spec.color];
        this.glyph = GLYPHS[spec.color];
        this.phase = (spec.distance * 0.017) + (spec.lane * 1.9);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_ORBS);
    }

    /**
     * @param dropX Screen x of the drop, so an orb can answer one lined up with
     *              it. Presentation only - what is collected is still decided
     *              from this orb's own lane position, which never moves.
     * @param lined Whether the drop would collect this orb as things stand. The
     *              caller works it out from the one contact rule, so an orb that
     *              leans out and swells is always one that is actually about to
     *              be taken - never one being crossed over or jumped.
     * @returns the orb's current screen y.
     */
    update (travelled: number, dropX: number, lined: boolean): number
    {
        const y = screenYFor(this.distance, travelled);
        const ahead = this.distance - travelled;
        const past = -ahead;

        //  How far the world moved since this orb was last drawn, which is what
        //  the two leans below are eased over. Distance rather than time, like
        //  everything else here, so a slow frame cannot make an orb jump.
        const moved = this.seenAt < 0 ? 0 : Math.max(0, travelled - this.seenAt);

        this.seenAt = travelled;

        //  Eased rather than switched.
        //
        //  Both of these used to be read straight off `lined`, which flips the
        //  moment the drop moves out of an orb's lane - so an orb that was
        //  leaning out towards the drop snapped back to its lane in one frame,
        //  and the orb appeared to shift sideways as the player steered. That
        //  was hidden for a while by rubbing missed orbs out almost as soon as
        //  they arrived; now that they stay to be passed, it has to be fixed
        //  rather than covered.
        const step = clamp(moved / ORB_LEAN_EASE, 0, 1);

        this.near += (((lined ? 1 - clamp(ahead / ORB_REACT_DISTANCE, 0, 1) : 0) - this.near) * step);
        this.pull += (((lined ? 1 - clamp(ahead / ORB_MAGNET_DISTANCE, 0, 1) : 0) - this.pull) * step);

        const near = this.near;

        //  Drawn drifting towards the drop over the last stretch. Its track-space
        //  x is untouched: this moves the picture, not the orb.
        const drawnX = this.x + ((dropX - this.x) * this.pull * ORB_MAGNET_REACH);

        const projected = project(drawnX, y);

        //  Floating rather than parked, and turning slowly. Both come from the
        //  distance travelled, so they move with the world and hold when paused.
        const bob = Math.sin((travelled / ORB_FLOAT_PERIOD) * TAU + this.phase) * ORB_FLOAT;

        this.gfx.setPosition(projected.x, y + (bob * projected.scale));
        this.gfx.setScale(projected.scale * (1 + (near * ORB_REACT_SWELL)));
        this.gfx.setRotation(travelled * ORB_SPIN_PER_PIXEL + this.phase);
        this.gfx.setAlpha(drawStrength(this.distance, travelled) * fadedPast(past));

        this.gfx.clear();

        if (past >= ORB_PASS_KEEP + ORB_PASS_FADE)
        {
            return y;
        }

        //  A halo in its own colour, so an orb reads as lit rather than printed.
        for (let layer = ORB_GLOW_LAYERS; layer > 0; layer--)
        {
            this.gfx.fillStyle(this.value, ORB_GLOW_ALPHA * (1 + near));
            this.gfx.fillCircle(0, 0, ORB_RADIUS + (ORB_GLOW_SPREAD * (layer / ORB_GLOW_LAYERS)));
        }

        this.gfx.fillStyle(this.value, 1);
        fillOutline(this.gfx, blobOutline(ORB_RADIUS, travelled * BLOB_RIPPLE_PER_PIXEL, this.phase));

        //  A lighter core keeps the orb readable against the dark track - and
        //  carries the colour's mark, so the core is doing two jobs rather than
        //  the mark being one more thing painted on. Turned off, it is the
        //  plain disc it always was.
        const core = ORB_CORE_ALPHA + (near * 0.2);

        if (areMarksOn())
        {
            drawGlyph(this.gfx, this.glyph, 0, 0, ORB_RADIUS * 0.52, 0xffffff, core);
        }
        else
        {
            this.gfx.fillStyle(0xffffff, core);
            this.gfx.fillCircle(0, 0, ORB_RADIUS * 0.45);
        }

        this.motes(travelled, near);

        return y;
    }

    /** A few motes circling the orb, counter to its own turn so both read. */
    private motes (travelled: number, near: number): void
    {
        const orbit = ORB_RADIUS * ORB_MOTE_ORBIT;

        this.gfx.fillStyle(0xffffff, ORB_MOTE_ALPHA * (0.5 + (near * 0.5)));

        for (let i = 0; i < ORB_MOTES; i++)
        {
            const angle = (i / ORB_MOTES) * TAU - (travelled * ORB_SPIN_PER_PIXEL * 1.6) + this.phase;

            this.gfx.fillCircle(Math.cos(angle) * orbit, Math.sin(angle) * orbit * 0.6, ORB_MOTE_RADIUS);
        }
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
