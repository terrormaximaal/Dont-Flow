import { Scene } from 'phaser';
import {
    COLOR_FINISH_DARK,
    COLOR_FINISH_LIGHT,
    DEPTH_GATES,
    FINISH_COLUMNS,
    FINISH_HEIGHT,
    FINISH_ROWS,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../config/constants';
import { fillProjectedQuad } from '../systems/Projection';
import { drawStrength, screenYFor } from '../systems/World';

/**
 * The end of the course: a chequered band across the full track, projected into
 * the corridor so it lies flat in the world rather than across the screen.
 */
export class FinishGate
{
    readonly distance: number;

    /** Set once the drop has crossed, so completion only fires one time. */
    triggered = false;

    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, distance: number)
    {
        this.distance = distance;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_GATES);
    }

    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);

        const cellWidth = TRACK_WIDTH / FINISH_COLUMNS;
        const cellHeight = FINISH_HEIGHT / FINISH_ROWS;
        const top = y - (FINISH_HEIGHT / 2);

        const gfx = this.gfx;

        gfx.clear();
        gfx.setAlpha(drawStrength(this.distance, travelled));

        for (let row = 0; row < FINISH_ROWS; row++)
        {
            const near = top + ((row + 1) * cellHeight);
            const far = top + (row * cellHeight);

            for (let column = 0; column < FINISH_COLUMNS; column++)
            {
                const left = TRACK_LEFT + (column * cellWidth);
                const right = left + cellWidth;

                gfx.fillStyle((row + column) % 2 === 0 ? COLOR_FINISH_LIGHT : COLOR_FINISH_DARK, 1);

                fillProjectedQuad(gfx, left, right, far, near);
            }
        }

        return y;
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
