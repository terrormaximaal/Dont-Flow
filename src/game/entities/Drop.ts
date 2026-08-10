import { Scene } from 'phaser';
import {
    COLOR_DROP_NEUTRAL,
    COLOR_VALUES,
    ColorId,
    DEPTH_DROP,
    DROP_FLOOD_SPEED,
    DROP_LEAN_MAX,
    DROP_LEAN_REFERENCE_SPEED,
    DROP_RADIUS,
    DROP_SCREEN_Y,
    DROP_STRETCH,
    DROP_TILT_SMOOTHING,
    LANE_CHANGE_SPEED
} from '../config/constants';
import { clampLane, laneCenterX, startLane } from '../systems/Lanes';
import { drawWaterDrop } from '../ui/shapes';
import { clamp, easeTowards } from '../utils/math';
import { DropJuice } from './drop-juice';
import { waterOutline } from './drop-surface';

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
    private targetLane: number = startLane();

    /** Current x, which lags behind the target lane while sliding. */
    private x: number = laneCenterX(startLane());

    /** Sideways speed in px/s, derived from the slide. Drives lean & stretch. */
    private lateralVelocity: number = 0;

    /** That speed as -1..1, which is what the lean, the tip and the slosh use. */
    private tilt: number = 0;

    /**
     * The colour the drop currently carries, or null before it has passed its
     * first gate. Orb matching compares this, not the hex value.
     */
    private colorId: ColorId | null = null;

    private color: number = COLOR_DROP_NEUTRAL;

    /** The colour being left behind, and how far the new one has flooded down. */
    private previousColor: number = COLOR_DROP_NEUTRAL;
    private flood = 1;

    /** Overrides `color` while a hit flash is playing. */
    private flashColor: number | null = null;
    private flashTimer: Phaser.Time.TimerEvent | null = null;

    /** Size, pop and idle wobble. Cosmetic only - collision never reads it. */
    private readonly juice = new DropJuice();

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
        //  The colour it was runs down out of the drop while the new one fills
        //  in from the tip, rather than the whole thing changing in one frame.
        this.previousColor = this.color;
        this.flood = 0;

        this.colorId = id;
        this.color = COLOR_VALUES[id];

        this.redraw();
    }

    getColorId (): ColorId | null
    {
        return this.colorId;
    }

    /**
     * The running score, which is what the drop's size is made of. A penalty
     * lowers it, so the drop shrinks back without being told separately.
     */
    setScore (score: number): void
    {
        this.juice.setScore(score);
    }

    /**
     * A visible gulp, for the moment an orb is swallowed.
     */
    pulse (): void
    {
        this.juice.pulse();
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

        //  Eased rather than taken straight, because the frame-to-frame measure
        //  above jitters with the frame time even when the slide is smooth.
        const measured = clamp(this.lateralVelocity / DROP_LEAN_REFERENCE_SPEED, -1, 1);

        this.tilt = easeTowards(this.tilt, measured, DROP_TILT_SMOOTHING, dt);

        this.juice.update(dt);
        this.flood = easeTowards(this.flood, 1, DROP_FLOOD_SPEED, dt);

        //  The shape itself is rebuilt every frame - that is the whole point of
        //  it being liquid - so this is a redraw, not just a transform.
        this.redraw();
        this.applyTransform();
    }

    /**
     * Lean and stretch into the slide. Purely cosmetic, but it is most of what
     * makes the lane change read as movement rather than a position change.
     */
    private applyTransform (): void
    {
        //  Lean into the slide, with the slow idle sway underneath it.
        this.gfx.setPosition(this.x, DROP_SCREEN_Y);
        this.gfx.setRotation((this.tilt * DROP_LEAN_MAX) + this.juice.getSway());

        //  Size comes from the score; the wobbles ride on top of it. Height
        //  gives back less than the width takes, so the drop reads as squashing
        //  rather than simply changing shape.
        const size = this.juice.getSize();
        const squash = (Math.abs(this.tilt) * DROP_STRETCH) + this.juice.getSquash();

        this.gfx.setScale(size * (1 + squash), size * (1 - (squash * 0.6)));
    }

    private redraw (): void
    {
        //  A flash paints the whole drop, so it overrides a flood in progress
        //  rather than fighting with it.
        const flashing = this.flashColor !== null;

        drawWaterDrop(this.gfx, {
            outline: waterOutline(DROP_RADIUS, this.juice.getElapsed(), this.tilt, this.juice.getAgitation()),
            radius: DROP_RADIUS,
            color: this.flashColor ?? this.color,
            lean: this.tilt,
            grounded: true,
            from: flashing ? undefined : this.previousColor,
            flood: this.flood
        });
    }

    destroy (): void
    {
        this.gfx.destroy();
    }
}
