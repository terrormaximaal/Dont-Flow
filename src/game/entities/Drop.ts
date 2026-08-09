import { Scene } from 'phaser';
import {
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
import { drawTeardrop } from '../ui/shapes';
import { clamp, easeTowards } from '../utils/math';

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

    /** Overrides `color` while a hit flash is playing. */
    private flashColor: number | null = null;
    private flashTimer: Phaser.Time.TimerEvent | null = null;

    private readonly scene: Scene;
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene)
    {
        this.scene = scene;
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

    /**
     * Hidden once the completion panel is up. The panel's buttons reach down
     * over where the drop rests, leaving just its tip poking out above them.
     */
    setVisible (visible: boolean): void
    {
        this.gfx.setVisible(visible);
    }

    /**
     * Briefly repaint the drop, to sell a wrong-colour hit.
     */
    flash (color: number, duration: number): void
    {
        //  Cancel any flash still running, so back-to-back hits do not let the
        //  first one's timer clear the second one early.
        this.flashTimer?.remove();

        this.flashColor = color;
        this.redraw();

        this.flashTimer = this.scene.time.delayedCall(duration, () => {

            this.flashColor = null;
            this.flashTimer = null;
            this.redraw();

        });
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
        const previousX = this.x;

        //  Exponential smoothing. Frame-rate independent, never overshoots, and
        //  re-targeting mid-slide (a fast double swipe) stays seamless.
        this.x = easeTowards(this.x, targetX, LANE_CHANGE_SPEED, dt);

        //  A zero delta - possible on the first step, or when two frames land in
        //  the same millisecond - would make this 0/0. The NaN goes straight
        //  into the rotation and scale below and the drop vanishes for a frame.
        this.lateralVelocity = dt > 0 ? (this.x - previousX) / dt : 0;

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

    private redraw (): void
    {
        drawTeardrop(this.gfx, DROP_RADIUS, this.flashColor ?? this.color);
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
