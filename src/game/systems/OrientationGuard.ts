import { Scene } from 'phaser';
import { BLOCK_LANDSCAPE_QUERY } from '../config/constants';

/**
 * Pauses the run while the device is held in an orientation the game cannot be
 * played in.
 *
 * The "rotate your device" notice itself is a DOM overlay driven by the same
 * media query in CSS - in landscape the canvas is a narrow sliver, so a message
 * drawn inside the game would be just as unreadable as the game is. This class
 * only handles the half CSS cannot: stopping the clock, so a run in progress is
 * not lost while the phone is turned.
 */
export class OrientationGuard
{
    constructor (scene: Scene)
    {
        const query = window.matchMedia(BLOCK_LANDSCAPE_QUERY);

        const apply = () => {

            if (query.matches)
            {
                scene.scene.pause();
            }
            else
            {
                scene.scene.resume();
            }

        };

        query.addEventListener('change', apply);

        scene.events.once('shutdown', () => query.removeEventListener('change', apply));

        //  Apply once up front, in case the game was loaded already rotated.
        apply();
    }
}
