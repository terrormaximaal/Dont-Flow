import { Scene } from 'phaser';
import {
    COLOR_DROP_HIGHLIGHT,
    COLOR_DROP_NEUTRAL,
    COLOR_VALUES,
    ColorId,
    DEPTH_DROP,
    DROP_LEAN_MAX,
    DROP_LEAN_REFERENCE_SPEED,
    DROP_RADIUS,
    DROP_SCREEN_Y,
    DROP_STRETCH,
    LANE_CHANGE_SPEED,
    START_LANE
} from '../config/constants';
import { clampLane, laneCenterX } from '../systems/Lanes';
import { clamp } from '../utils/math';

/**
 * The player. It holds a *target* lane and eases towards it every frame - the
 * rest of the game only ever asks it to change lane, never to move.
 *
 * The drop is fixed on screen vertically; forward motion is the track moving
 * underneath it.
 */
export class Drop
{
    /** Lane the drop is heading for. Integer. */
    private targetLane: number = START_LANE;

    /** Current x, which lags behind the target lane while sliding. */
    private x: number = laneCenterX(START_LANE);

    /** Sideways speed in px/s, derived from the slide. Drives lean & stretch. */
    private lateralVelocity: number = 0;

    /**
     * The colour the drop currently carries, or null before it has passed its
     * first gate. Orb matching compares this, not the hex value.
     */
    private colorId: ColorId | null = null;

    private color: number = COLOR_DROP_NEUTRAL;
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene)
    {
        this.gfx = scene.add.graphics();
        this.gfx.setDepth(DEPTH_DROP);
        this.gfx.setPosition(this.x, DROP_SCREEN_Y);

        this.redraw();
    }

    /**
     * Nudge the drop one lane left (-1) or right (+1). Swiping past the edge of
     * the track does nothing.
     */
    moveLane (direction: number): void
    {
        this.targetLane = clampLane(this.targetLane + Math.sign(direction));
    }

    /**
     * Take on a gate's colour.
     */
    setColorId (id: ColorId): void
    {
        this.colorId = id;
        this.color = COLOR_VALUES[id];

        this.redraw();
    }

    getColorId (): ColorId | null
    {
        return this.colorId;
    }

    getLane (): number
    {
        return this.targetLane;
    }

    getX (): number
    {
        return this.x;
    }

    /**
     * @param dt Seconds since the last frame.
     */
    update (dt: number): void
    {
        const targetX = laneCenterX(this.targetLane);

        //  Exponential smoothing. Frame-rate independent, never overshoots, and
        //  re-targeting mid-slide (a fast double swipe) stays seamless.
        const t = 1 - Math.exp(-LANE_CHANGE_SPEED * dt);
        const previousX = this.x;

        this.x += (targetX - this.x) * t;

        this.lateralVelocity = (this.x - previousX) / dt;

        this.applyTransform();
    }

    /**
     * Lean and stretch into the slide. Purely cosmetic, but it is most of what
     * makes the lane change read as movement rather than a position change.
     */
    private applyTransform (): void
    {
        const tilt = clamp(this.lateralVelocity / DROP_LEAN_REFERENCE_SPEED, -1, 1);

        this.gfx.setPosition(this.x, DROP_SCREEN_Y);
        this.gfx.setRotation(tilt * DROP_LEAN_MAX);

        const stretch = Math.abs(tilt) * DROP_STRETCH;

        this.gfx.setScale(1 + stretch, 1 - (stretch * 0.6));
    }

    /**
     * A teardrop built from a circle and a triangle - flat colour, no assets.
     * Drawn around a local origin at the centre of the bulb.
     */
    private redraw (): void
    {
        const r = DROP_RADIUS;

        this.gfx.clear();

        this.gfx.fillStyle(this.color, 1);
        this.gfx.fillTriangle(-r * 0.62, -r * 0.62, 0, -r * 2.05, r * 0.62, -r * 0.62);
        this.gfx.fillCircle(0, 0, r);

        //  Offset highlight, so the drop reads as a volume and its rotation is
        //  actually visible.
        this.gfx.fillStyle(COLOR_DROP_HIGHLIGHT, 0.28);
        this.gfx.fillCircle(-r * 0.3, -r * 0.3, r * 0.34);
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
