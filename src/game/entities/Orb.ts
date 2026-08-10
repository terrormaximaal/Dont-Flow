import { Scene } from 'phaser';
import {
    COLOR_VALUES,
    ColorId,
    DEPTH_ORBS,
    ORB_CORE_ALPHA,
    ORB_RADIUS
} from '../config/constants';
import { OrbSpec } from '../config/level';
import { laneCenterX } from '../systems/Lanes';
import { project } from '../systems/Projection';
import { screenYFor } from '../systems/World';

/**
 * A coloured collectible sitting in one lane. Matching the drop's colour scores;
 * touching one of the wrong colour breaks the combo.
 */
export class Orb
{
    readonly distance: number;
    readonly color: ColorId;

    /** Screen x, fixed - orbs sit in the centre of their lane. */
    readonly x: number;

    /** True once collected or hit, so it can only count once. */
    consumed = false;

    private readonly body: Phaser.GameObjects.Arc;
    private readonly core: Phaser.GameObjects.Arc;

    constructor (scene: Scene, spec: OrbSpec)
    {
        this.distance = spec.distance;
        this.color = spec.color;
        this.x = laneCenterX(spec.lane);

        const value = COLOR_VALUES[spec.color];

        this.body = scene.add.circle(this.x, 0, ORB_RADIUS, value);
        this.body.setDepth(DEPTH_ORBS);

        //  A lighter core keeps the orb readable against the dark track.
        this.core = scene.add.circle(this.x, 0, ORB_RADIUS * 0.45, 0xffffff, ORB_CORE_ALPHA);
        this.core.setDepth(DEPTH_ORBS);
    }

    /**
     * @returns the orb's current screen y.
     */
    update (travelled: number): number
    {
        const y = screenYFor(this.distance, travelled);
        const projected = project(this.x, y);

        //  Position and size come from the projection; the orb's own `x` stays
        //  in track space, which is what collision compares against.
        this.body.setPosition(projected.x, y);
        this.body.setScale(projected.scale);

        this.core.setPosition(projected.x, y);
        this.core.setScale(projected.scale);

        return y;
    }

    destroy (): void
    {
        this.body.destroy();
        this.core.destroy();
    }
}
