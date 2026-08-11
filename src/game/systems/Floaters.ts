import { Scene } from 'phaser';
import { GAME_WIDTH, HORIZON_Y } from '../config/constants';
import { FloaterSpec } from '../config/worlds';

/** Behind the horizon's silhouettes, in front of the sun. */
const FLOATER_DEPTH = -93;

/** Room off each edge for one to leave and re-enter unseen. */
const MARGIN = 140;

const WRAP = GAME_WIDTH + (MARGIN * 2);

export interface Floater
{
    x: number;
    y: number;
    size: number;
}

/**
 * Where each thing in the sky is at this point in the journey.
 *
 * Separated from the drawing so the one rule that matters can be tested: they
 * stay above the horizon. Everything else in the world is anchored to the
 * ground or the road, and is kept in place by that; these are anchored to
 * nothing, so the only thing stopping one drifting down across the corridor is
 * saying it may not.
 */
export function floatersAt (spec: FloaterSpec, distance: number): Floater[]
{
    const floaters: Floater[] = [];
    const band = Math.max(0, spec.highest - spec.lowest);

    for (let i = 0; i < spec.count; i++)
    {
        const own = wobble(i + spec.seed);

        //  Drifting sideways as the world goes by, wrapping off one edge and
        //  back on the other. Slower than anything on the ground, because they
        //  are further away than anything on the ground.
        const drift = (own * WRAP) - (distance * spec.parallax);
        const x = (((drift % WRAP) + WRAP) % WRAP) - MARGIN;

        //  Its own place in the band, plus a slow rise and fall taken from the
        //  distance travelled so it holds still when the run is paused.
        const bob = Math.sin((distance * 0.0007) + (i * 2.4)) * 6;
        const y = HORIZON_Y - spec.lowest - (wobble((i * 3.1) + spec.seed) * band) + bob;

        floaters.push({
            x,
            y,
            size: spec.size * (0.65 + (wobble((i * 5.7) + spec.seed) * 0.7))
        });
    }

    return floaters;
}

/**
 * Islands, crystals and structures hanging in the sky.
 *
 * The dreamlike part of the brief, and the part with the most room to go wrong:
 * anything up here competes with the orbs for the player's attention if it is
 * allowed to be bright. They are drawn in a colour close to their own sky, and
 * they never come below the horizon.
 */
export class Floaters
{
    private readonly gfx: Phaser.GameObjects.Graphics;
    private readonly spec: FloaterSpec;

    constructor (scene: Scene, spec: FloaterSpec)
    {
        this.spec = spec;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(FLOATER_DEPTH);
    }

    update (distance: number): void
    {
        const gfx = this.gfx;

        gfx.clear();
        gfx.fillStyle(this.spec.color, this.spec.alpha);

        for (const floater of floatersAt(this.spec, distance))
        {
            this.draw(gfx, floater);
        }
    }

    private draw (gfx: Phaser.GameObjects.Graphics, floater: Floater): void
    {
        const { x, y, size } = floater;

        if (this.spec.shape === 'crystal')
        {
            //  A tall shard, points up and down.
            gfx.fillTriangle(x, y - size, x - (size * 0.3), y, x + (size * 0.3), y);
            gfx.fillTriangle(x, y + (size * 0.7), x - (size * 0.3), y, x + (size * 0.3), y);

            return;
        }

        if (this.spec.shape === 'ring')
        {
            //  A structure seen edge-on, which reads as built without needing
            //  any detail at this distance.
            gfx.lineStyle(Math.max(1, size * 0.09), this.spec.color, this.spec.alpha);
            gfx.strokeEllipse(x, y, size * 2, size * 0.7);

            return;
        }

        //  An island: a mass with a tapering underside, which is the whole
        //  reason it reads as floating rather than as a cloud.
        gfx.fillEllipse(x, y, size * 2, size * 0.9);
        gfx.fillTriangle(x - (size * 0.55), y, x + (size * 0.55), y, x, y + (size * 1.3));
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}

/** Deterministic 0..1 from an index, so a sky is the same on every run. */
function wobble (n: number): number
{
    const value = Math.sin(n * 78.233) * 43758.5453;

    return value - Math.floor(value);
}
