import { Scene } from 'phaser';
import {
    CURRENT_ALPHA,
    CURRENT_FLOW,
    CURRENT_LINES,
    CURRENT_STEP_GROWTH,
    CURRENT_STEP_MIN,
    CURRENT_THICKNESS,
    CURRENT_VIEW,
    CURRENT_WAVE_AMPLITUDE,
    CURRENT_WAVE_LENGTH,
    DEPTH_CURRENT,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { WorldSpec } from '../config/worlds';
import { projectX } from './Projection';
import { screenYFor } from './World';

const TAU = Math.PI * 2;

/**
 * The flow on the road's surface: lines running away down the track, waving as
 * they go, so what the drop travels over reads as water.
 *
 * Each line is a wave in *track* space, projected point by point. Waving the
 * drawn line instead would bend it the same amount near and far, which is what
 * a pattern painted on glass does rather than a surface lying under one.
 *
 * The pattern also travels slightly faster than the road it is on. At matched
 * speed it would be a carpet with a wave printed on it; running it ahead is
 * what makes the water move under the drop.
 *
 * Sampled densely near and sparsely far, because that is how perspective spends
 * the screen - a point every few metres close up is a point every few pixels,
 * and the same spacing at the horizon is a hundred points inside one.
 */
export class Current
{
    private readonly gfx: Phaser.GameObjects.Graphics;
    private readonly color: number;

    constructor (scene: Scene, world: WorldSpec)
    {
        //  The lane dividers' colour: already chosen to sit on this world's road
        //  without shouting, which is exactly what is wanted here.
        this.color = world.laneLine;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_CURRENT);
    }

    update (travelled: number): void
    {
        this.gfx.clear();
        this.gfx.lineStyle(CURRENT_THICKNESS, this.color, CURRENT_ALPHA);

        //  How far the whole pattern has slid along the road, on top of the road
        //  going by. This is the difference between water and carpet.
        const drift = travelled * (CURRENT_FLOW - 1);

        for (let line = 0; line < CURRENT_LINES; line++)
        {
            //  Spread across the road, each starting at its own point in the
            //  wave so they never line up into one thick band.
            const home = TRACK_LEFT + (((line + 0.5) / CURRENT_LINES) * TRACK_WIDTH);
            const phase = line * 1.7;

            this.gfx.beginPath();

            let started = false;

            for (let ahead = 0; ahead < CURRENT_VIEW; ahead += Math.max(CURRENT_STEP_MIN, ahead * CURRENT_STEP_GROWTH))
            {
                const along = travelled + ahead;
                const y = screenYFor(along, travelled);

                const wave = Math.sin((((along + drift) / CURRENT_WAVE_LENGTH) * TAU) + phase);
                const x = projectX(home + (wave * CURRENT_WAVE_AMPLITUDE), y);

                if (started)
                {
                    this.gfx.lineTo(x, y);
                }
                else
                {
                    this.gfx.moveTo(x, y);
                    started = true;
                }
            }

            this.gfx.strokePath();
        }
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
