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
import { screenYFor } from '../systems/World';

/**
 * The end of the course: a chequered band across the full track.
 */
export class FinishGate
{
    readonly distance: number;

    /** Set once the drop has crossed, so completion only fires one time. */
    triggered = false;

    private readonly container: Phaser.GameObjects.Container;

    constructor (scene: Scene, distance: number)
    {
        this.distance = distance;

        this.container = scene.add.container(0, 0);
        this.container.setDepth(DEPTH_GATES);

        const cellWidth = TRACK_WIDTH / FINISH_COLUMNS;
        const cellHeight = FINISH_HEIGHT / FINISH_ROWS;

        for (let row = 0; row < FINISH_ROWS; row++)
        {
            for (let column = 0; column < FINISH_COLUMNS; column++)
            {
                const color = (row + column) % 2 === 0 ? COLOR_FINISH_LIGHT : COLOR_FINISH_DARK;

                const cell = scene.add.rectangle(
                    TRACK_LEFT + (column * cellWidth) + (cellWidth / 2),
                    ((row - (FINISH_ROWS / 2)) * cellHeight) + (cellHeight / 2),
                    cellWidth,
                    cellHeight,
                    color
                );

                this.container.add(cell);
            }
        }
    }

    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);

        this.container.y = y;

        return y;
    }

    destroy (): void
    {
        this.container.destroy();
    }
}
