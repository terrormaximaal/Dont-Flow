import { Scene } from 'phaser';
import {
    GAME_HEIGHT,
    GAME_WIDTH,
    VIGNETTE_ALPHA,
    VIGNETTE_BANDS,
    VIGNETTE_DEPTH
} from '../config/constants';

/**
 * A soft darkening around the edges of the screen.
 *
 * Settles the picture towards the middle, which is where the road, the drop and
 * everything worth reading already are. Deliberately gentle: the brief is a
 * clean image, and a heavy vignette on a phone in daylight reads as a smudged
 * screen rather than as an effect.
 *
 * Built from nested rectangle outlines, since Graphics has no radial gradient -
 * each band is a hair darker than the one inside it, which is close enough to a
 * gradient once the bands are a few pixels apart.
 *
 * Drawn once. Nothing about it changes frame to frame, so it costs one static
 * Graphics for the life of the scene and nothing per frame.
 */
export function addVignette (scene: Scene): Phaser.GameObjects.Graphics
{
    const gfx = scene.add.graphics();

    gfx.setDepth(VIGNETTE_DEPTH);

    //  Reaching in about a sixth of the screen: enough to feel, not enough to
    //  eat into the road.
    const reach = GAME_WIDTH / 6;

    for (let band = 0; band < VIGNETTE_BANDS; band++)
    {
        const inset = (band / VIGNETTE_BANDS) * reach;

        //  Squared, so it falls away from the edge rather than ramping evenly -
        //  an even ramp reads as a grey border.
        const fade = 1 - (band / VIGNETTE_BANDS);

        gfx.lineStyle((reach / VIGNETTE_BANDS) + 1, 0x000000, (VIGNETTE_ALPHA / VIGNETTE_BANDS) * fade * fade);
        gfx.strokeRect(inset, inset, GAME_WIDTH - (inset * 2), GAME_HEIGHT - (inset * 2));
    }

    return gfx;
}
