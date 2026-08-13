import { Scene } from 'phaser';
import {
    BLOB_RIPPLE_PER_PIXEL,
    COLOR_VALUES,
    ColorId,
    DEPTH_ORBS,
    ORB_CORE_ALPHA,
    ORB_PASS_FADE,
    ORB_RADIUS
} from '../config/constants';
import { OrbSpec } from '../config/level';
import { laneCenterX } from '../systems/Lanes';
import { project } from '../systems/Projection';
import { drawStrength, screenYFor } from '../systems/World';
import { fillOutline } from '../ui/shapes';
import { blobOutline } from './drop-surface';

/**
 * How much of an orb is left to draw, given how far past the drop it now is.
 */
function fadedPast (past: number): number
{
    if (past <= 0) { return 1; }

    return Math.max(0, 1 - (past / ORB_PASS_FADE));
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

    /** Screen x, fixed - orbs sit in the centre of their lane. */
    readonly x: number;

    /** True once collected or hit, so it can only count once. */
    consumed = false;

    /**
     * Where this orb is in its own ripple, so a lane of them does not breathe in
     * step. Taken from where it sits, so it is the same on every run.
     */
    private readonly phase: number;

    private readonly value: number;
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, spec: OrbSpec)
    {
        this.distance = spec.distance;
        this.color = spec.color;
        this.x = laneCenterX(spec.lane);
        this.value = COLOR_VALUES[spec.color];
        this.phase = (spec.distance * 0.017) + (spec.lane * 1.9);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_ORBS);
    }

    /**
     * @returns the orb's current screen y.
     */
    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);
        const projected = project(this.x, y);
        const past = travelled - this.distance;

        this.gfx.clear();

        //  Position and size come from the projection; the orb's own `x` stays
        //  in track space, which is what collision compares against.
        this.gfx.setPosition(projected.x, y);
        this.gfx.setScale(projected.scale);
        this.gfx.setAlpha(drawStrength(this.distance, travelled) * fadedPast(past));

        if (past >= ORB_PASS_FADE)
        {
            return y;
        }

        this.gfx.fillStyle(this.value, 1);
        fillOutline(this.gfx, blobOutline(ORB_RADIUS, travelled * BLOB_RIPPLE_PER_PIXEL, this.phase));

        //  A lighter core keeps the orb readable against the dark track.
        this.gfx.fillStyle(0xffffff, ORB_CORE_ALPHA);
        this.gfx.fillCircle(0, 0, ORB_RADIUS * 0.45);

        return y;
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
