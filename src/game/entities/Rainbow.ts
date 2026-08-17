import { Scene } from 'phaser';
import {
    BLOB_RIPPLE_PER_PIXEL,
    DEPTH_ORBS,
    RAINBOW_CORE_ALPHA,
    RAINBOW_CYCLE_SPEED,
    RAINBOW_RADIUS
} from '../config/constants';
import { PowerUpSpec } from '../config/level';
import { laneCenterX } from '../systems/Lanes';
import { project } from '../systems/Projection';
import { drawStrength, screenYFor } from '../systems/World';
import { rainbowAt } from '../utils/color';
import { fillOutline } from '../ui/shapes';
import { blobOutline } from './drop-surface';

/**
 * The rainbow drop, waiting in a lane to be picked up.
 *
 * Drawn as a blob like an orb, but running through every colour rather than
 * holding one - which is exactly what it does to the player who takes it, so
 * the thing on the road tells you what it will do before you touch it.
 */
export class Rainbow
{
    readonly distance: number;

    /** Track x, fixed - it sits in the centre of its lane. Never projected. */
    readonly x: number;

    /** True once taken, so it can only count once. */
    consumed = false;

    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene, spec: PowerUpSpec)
    {
        this.distance = spec.distance;
        this.x = laneCenterX(spec.lane);

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_ORBS);
    }

    /**
     * @returns its current screen y.
     */
    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);
        const projected = project(this.x, y);

        this.gfx.setPosition(projected.x, y);
        this.gfx.setScale(projected.scale);
        this.gfx.setAlpha(drawStrength(this.distance, travelled));

        //  Cycling on distance travelled, like everything else in the world, so
        //  it holds still when the game is paused.
        const phase = travelled * BLOB_RIPPLE_PER_PIXEL;

        this.gfx.clear();

        this.gfx.fillStyle(rainbowAt(phase * RAINBOW_CYCLE_SPEED), 1);
        fillOutline(this.gfx, blobOutline(RAINBOW_RADIUS, phase, 0));

        //  A bright core, a colour further round the wheel, so it never reads as
        //  a plain orb that happens to be changing.
        this.gfx.fillStyle(rainbowAt((phase * RAINBOW_CYCLE_SPEED) + 2), RAINBOW_CORE_ALPHA);
        this.gfx.fillCircle(0, 0, RAINBOW_RADIUS * 0.42);

        return y;
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
