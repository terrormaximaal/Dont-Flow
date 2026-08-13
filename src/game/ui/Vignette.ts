import { Scene } from 'phaser';
import {
    GAME_HEIGHT,
    GAME_WIDTH,
    VIGNETTE_ALPHA,
    VIGNETTE_BANDS,
    VIGNETTE_DEPTH
} from '../config/constants';
import { vignetteBands } from './vignetteBands';

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

    for (const band of vignetteBands(reach, VIGNETTE_BANDS, VIGNETTE_ALPHA))
    {
        gfx.lineStyle(band.width, 0x000000, band.alpha);
        gfx.strokeRect(band.inset, band.inset, GAME_WIDTH - (band.inset * 2), GAME_HEIGHT - (band.inset * 2));
    }

    return gfx;
}
