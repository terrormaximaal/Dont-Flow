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
    DROP_SHADOW_ALPHA,
    DROP_SHADOW_DROP,
    DROP_SHADOW_SQUASH,
    DROP_SCREEN_Y,
    DROP_STRETCH,
    DROP_TILT_SMOOTHING,
    JUMP_LANDING_SQUASH,
    JUMP_LIFT,
    JUMP_SHADOW_FADE,
    JUMP_SHADOW_SHRINK,
    JUMP_SPAN,
    JUMP_TAKEOFF_SQUASH,
    LANE_CHANGE_SPEED,
    RAINBOW_CYCLE_SPEED,
    RAINBOW_WARNING,
    RAINBOW_WARNING_SPEED
} from '../config/constants';
import { bufferedTakeoff, hasLanded, jumpHeight } from '../systems/jump';
import { clampLane, laneCenterX, startLane } from '../systems/Lanes';
import { drawWaterDrop } from '../ui/shapes';
import { rainbowAt } from '../utils/color';
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

    /**
     * A rainbow drop in hand: how much of it is left, 1 down to 0, and where the
     * colours have run to. The phase is carried rather than worked out from the
     * clock, so speeding it up at the end does not jump the colour.
     */
    private wild = false;
    private wildLeft = 1;
    private wildPhase = 0;

    /** Overrides `color` while a hit flash is playing. */
    private flashColor: number | null = null;
    private flashTimer: Phaser.Time.TimerEvent | null = null;

    /**
     * Where the current jump began, or null on the road.
     *
     * A distance, not a timer: the arc is the same length of road on every
     * level, and it stops dead with the rest of the world when paused.
     */
    private takeoff: number | null = null;

    /** How high the drop is right now, 0 to 1. Collision reads this. */
    private height = 0;

    /**
     * Where a jump was last asked for while already off the road, if at all.
     *
     * Held rather than thrown away so a swipe made just before landing still
     * counts. Whether it is recent enough to honour is decided on landing, by
     * bufferedTakeoff - see JUMP_BUFFER for why the window is a short one.
     */
    private requested: number | null = null;

    /** Size, pop and idle wobble. Cosmetic only - collision never reads it. */
    private readonly juice = new DropJuice();

    /**
     * The shadow lives in its own object, because it must stay on the road
     * while the body rises off it. Drawn into the body's Graphics it would
     * simply travel up with the drop, which says nothing about height at all.
     */
    private readonly shadowGfx: Phaser.GameObjects.Graphics;

    private readonly scene: Scene;
    private readonly gfx: Phaser.GameObjects.Graphics;

    constructor (scene: Scene)
    {
        this.scene = scene;
        this.shadowGfx = scene.add.graphics();
        this.shadowGfx.setDepth(DEPTH_DROP - 1);
        this.shadowGfx.setPosition(this.x, DROP_SCREEN_Y);

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
     * The colour the drop is actually painted right now, which is the rainbow
     * while one is in hand. Anything that should match what the player sees -
     * the trail it lays down - asks for this rather than the colour it carries.
     */
    getPaintColor (): number
    {
        return this.wild ? rainbowAt(this.wildPhase) : this.color;
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
     * Carrying a rainbow drop, and how much of it is left.
     */
    setWild (active: boolean, remaining: number): void
    {
        this.wild = active;
        this.wildLeft = remaining;
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
        this.shadowGfx.setVisible(visible);
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

    /**
     * Leave the road, or ask to leave it the moment this jump ends.
     *
     * Never stacked - a second arc cannot start while the first is running -
     * but a request made close enough to landing is remembered and honoured
     * there. Only the most recent one is kept: a player pressing repeatedly
     * means "now", not "four more times".
     */
    jump (travelled: number): void
    {
        if (this.takeoff !== null)
        {
            this.requested = travelled;

            return;
        }

        this.takeoff = travelled;
        this.requested = null;
    }

    /** How high the drop is, 0 on the road and 1 at the top of the arc. */
    getHeight (): number
    {
        return this.height;
    }

    getLane (): number
    {
        return this.targetLane;
    }

    getX (): number
    {
        return this.x;
    }

    /** Centre of the lane the drop is heading for, which it may not have reached. */
    getTargetX (): number
    {
        return laneCenterX(this.targetLane);
    }

    /**
     * @param dt Seconds since the last frame.
     */
    update (dt: number, travelled: number): void
    {
        //  Height first: everything below is drawn from it.
        if (this.takeoff !== null && hasLanded(travelled, this.takeoff))
        {
            const landedAt = this.takeoff + JUMP_SPAN;

            this.takeoff = bufferedTakeoff(landedAt, this.requested);
            this.requested = null;
            this.juice.pulse();
        }

        this.height = jumpHeight(travelled, this.takeoff);

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

        if (this.wild)
        {
            //  The colours race as it runs out. That is the warning, and the
            //  only one there is - a power-up that simply lapsed would leave the
            //  player in a barrier through no fault of their own.
            const speed = this.wildLeft < RAINBOW_WARNING ? RAINBOW_WARNING_SPEED : RAINBOW_CYCLE_SPEED;

            this.wildPhase += speed * dt;
        }

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
        this.gfx.setPosition(this.x, DROP_SCREEN_Y - (JUMP_LIFT * this.height));
        this.gfx.setRotation((this.tilt * DROP_LEAN_MAX) + this.juice.getSway());

        //  Size comes from the score; the wobbles ride on top of it. Height
        //  gives back less than the width takes, so the drop reads as squashing
        //  rather than simply changing shape.
        const size = this.juice.getSize();

        //  Stretched going up and squashed coming down, which is what makes a
        //  jump read as effort rather than as a lift.
        const air = this.takeoff !== null
            ? -(JUMP_TAKEOFF_SQUASH * this.height) + (JUMP_LANDING_SQUASH * this.height * this.height * 0.4)
            : 0;

        const squash = (Math.abs(this.tilt) * DROP_STRETCH) + this.juice.getSquash() + air;

        this.gfx.setScale(size * (1 + squash), size * (1 - (squash * 0.6)));

        this.drawShadow(size);
    }

    /**
     * The shadow on the road, which is the only thing that says how high the
     * drop is. It shrinks and fades as the drop climbs, and never leaves the
     * ground.
     */
    private drawShadow (size: number): void
    {
        const shrink = 1 - (JUMP_SHADOW_SHRINK * this.height);

        this.shadowGfx.setPosition(this.x, DROP_SCREEN_Y);
        this.shadowGfx.clear();
        this.shadowGfx.fillStyle(0x000000, DROP_SHADOW_ALPHA * (1 - (JUMP_SHADOW_FADE * this.height)));
        this.shadowGfx.fillEllipse(
            0,
            DROP_SHADOW_DROP,
            DROP_RADIUS * 2.1 * size * shrink,
            DROP_RADIUS * 2 * DROP_SHADOW_SQUASH * size * shrink
        );
    }

    private redraw (): void
    {
        //  A flash paints the whole drop, so it overrides a flood in progress
        //  rather than fighting with it.
        const flashing = this.flashColor !== null;

        //  A rainbow overrides the colour it is carrying, and any flood still
        //  running - there is nothing to flood into while it matches everything.
        const body = this.wild ? rainbowAt(this.wildPhase) : this.color;

        drawWaterDrop(this.gfx, {
            outline: waterOutline(DROP_RADIUS, this.juice.getElapsed(), this.tilt, this.juice.getAgitation()),
            radius: DROP_RADIUS,
            color: this.flashColor ?? body,
            lean: this.tilt,
            grounded: true,
            from: flashing || this.wild ? undefined : this.previousColor,
            flood: this.flood
        });
    }

    destroy (): void
    {
        this.shadowGfx.destroy();
        this.gfx.destroy();
    }
}
