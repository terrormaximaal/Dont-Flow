import { Scene } from 'phaser';
import { CULL_MARGIN, GAME_HEIGHT } from '../config/constants';
import { PowerUpSpec } from '../config/level';
import { Rainbow } from '../entities/Rainbow';
import { isWithinCatchRange } from './contact';

/**
 * The rainbow drops laid along a course, and whether the drop has taken one.
 *
 * Kept apart from `Course` rather than folded into it: a power-up is the one
 * thing on the track that is neither scored nor collided with, and Course is
 * already the length it should be.
 */
export class PowerUps
{
    private items: Rainbow[] = [];

    private readonly onTaken: (x: number, y: number) => void;

    constructor (scene: Scene, specs: PowerUpSpec[], onTaken: (x: number, y: number) => void)
    {
        this.onTaken = onTaken;

        for (const spec of specs)
        {
            this.items.push(new Rainbow(scene, spec));
        }
    }

    /**
     * @param travelled Distance the drop has covered.
     * @param dropX     Its current position across the track.
     */
    update (travelled: number, dropX: number): void
    {
        const cullY = GAME_HEIGHT + CULL_MARGIN;

        for (let i = this.items.length - 1; i >= 0; i--)
        {
            const item = this.items[i];
            const y = item.update(travelled);

            //  Reached is only half of it - the drop has to be across from it
            //  too, by the same rule an orb is caught.
            if (!item.consumed && travelled >= item.distance)
            {
                item.consumed = true;

                if (isWithinCatchRange(dropX, item.x))
                {
                    this.onTaken(item.x, y);

                    item.destroy();
                    this.items.splice(i, 1);

                    continue;
                }
            }

            if (y > cullY)
            {
                item.destroy();
                this.items.splice(i, 1);
            }
        }
    }
}
