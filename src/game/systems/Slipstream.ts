import { Scene } from 'phaser';
import {
    DEPTH_ROADSIDE,
    GAME_HEIGHT,
    GAME_WIDTH,
    SLIP_ALPHA,
    SLIP_BUDGET,
    SLIP_LENGTH,
    SLIP_MIN_SCALE,
    SLIP_OFFSET,
    SLIP_SPACING,
    SLIP_SPREAD,
    SLIP_THICKNESS,
    TRACK_WIDTH
} from '../config/constants';
import { depthScale, projectX } from './Projection';
import { screenYFor } from './World';

export interface Mote
{
    /** Track-space x, and the two screen depths the streak runs between. */
    x: number;
    y: number;
    tailY: number;

    /** Nearness, which sets how solid and how long the streak is. */
    scale: number;
}

/**
 * Which motes are close enough to read as speed.
 *
 * Separated from the drawing so the count can be reasoned about and held to a
 * budget. Only the near ones are kept: far off, a streak is a stationary dot,
 * and a screen of stationary dots reads as dirt rather than motion.
 */
export function visibleMotes (travelled: number): Mote[]
{
    const motes: Mote[] = [];

    let index = Math.floor(travelled / SLIP_SPACING);

    for (let i = 0; i < SLIP_BUDGET; i++, index++)
    {
        const distance = index * SLIP_SPACING;
        const y = screenYFor(distance, travelled);

        if (y > GAME_HEIGHT + SLIP_LENGTH)
        {
            continue;
        }

        const scale = depthScale(y);

        if (scale < SLIP_MIN_SCALE)
        {
            continue;
        }

        //  Deterministic from the index, so a mote is in the same place on
        //  every run and never flickers between frames.
        const side = (index % 2 === 0) ? -1 : 1;
        const out = (TRACK_WIDTH / 2) + SLIP_OFFSET + (fraction(index * 7.31) * SLIP_SPREAD);

        motes.push({
            x: (GAME_WIDTH / 2) + (out * side),
            y,
            tailY: y - (SLIP_LENGTH * scale),
            scale
        });
    }

    return motes;
}

/**
 * Streaks of light rushing past the drop.
 *
 * Placed at world distances like everything else, so they sweep by at exactly
 * the speed the player is travelling - and hold still when the run is paused,
 * which anything driven by the clock would not.
 *
 * Deliberately outside the road. The corridor is where orbs and barriers are
 * read, and speed lines across it would be noise in the one place that has to
 * stay clean.
 */
export class Slipstream
{
    private readonly gfx: Phaser.GameObjects.Graphics;
    private readonly color: number;

    constructor (scene: Scene, color: number)
    {
        this.color = color;

        this.gfx = scene.add.graphics();

        //  Above the ground and the scenery, below the road, so a streak can
        //  never cross the surface the game is played on.
        this.gfx.setDepth(DEPTH_ROADSIDE + 1);
    }

    update (travelled: number): void
    {
        const gfx = this.gfx;

        gfx.clear();

        for (const mote of visibleMotes(travelled))
        {
            //  Fading in as it arrives rather than snapping on at the cutoff.
            const fade = Math.min(1, (mote.scale - SLIP_MIN_SCALE) / SLIP_MIN_SCALE);

            gfx.lineStyle(SLIP_THICKNESS * mote.scale, this.color, SLIP_ALPHA * fade);
            gfx.lineBetween(
                projectX(mote.x, mote.tailY), mote.tailY,
                projectX(mote.x, mote.y), mote.y
            );
        }
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}

/** Deterministic 0..1 from an index. */
function fraction (n: number): number
{
    const value = Math.sin(n * 91.7) * 43758.5453;

    return value - Math.floor(value);
}
