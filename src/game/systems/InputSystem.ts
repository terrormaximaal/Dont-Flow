import { Scene } from 'phaser';
import { DragAnchor, evaluateDrag, isRepeatTooSoon, LaneIntent } from './swipe';

export type { LaneIntent };

/**
 * Turns touch swipes and arrow keys into intents.
 *
 * This system knows nothing about the drop or the track - it only reports that
 * the player asked to go left, go right, or leave the road, and the scene
 * decides what any of that means.
 *
 * One finger does all of it: sideways steers, upwards jumps.
 */
export class InputSystem
{
    private readonly scene: Scene;
    private readonly onIntent: (direction: LaneIntent) => void;
    private readonly onJump: () => void;
    private readonly onDive: () => void;

    /** Where the current drag was last measured from. */
    private anchor: DragAnchor = { x: 0, y: 0 };
    private dragging = false;

    /** Steering is switched off once the run is over. */
    private enabled = true;

    /** Scene clock reading of the last swipe-driven lane change. */
    private lastSwipeTime = 0;

    constructor (
        scene: Scene,
        onIntent: (direction: LaneIntent) => void,
        onJump: () => void = () => {},
        onDive: () => void = () => {}
    )
    {
        this.scene = scene;
        this.onIntent = onIntent;
        this.onJump = onJump;
        this.onDive = onDive;

        this.attachKeyboard();
        this.attachTouch();
    }

    private attachKeyboard (): void
    {
        const keyboard = this.scene.input.keyboard;

        if (!keyboard)
        {
            //  Touch-only device with no keyboard plugin - nothing to bind.
            return;
        }

        keyboard.on('keydown-LEFT', this.moveLeft, this);
        keyboard.on('keydown-A', this.moveLeft, this);
        keyboard.on('keydown-RIGHT', this.moveRight, this);
        keyboard.on('keydown-D', this.moveRight, this);

        keyboard.on('keydown-UP', this.leap, this);
        keyboard.on('keydown-W', this.leap, this);
        keyboard.on('keydown-SPACE', this.leap, this);

        //  The other way, for a drop already in the air. Harmless on the road,
        //  where the drop has nothing to come down from.
        keyboard.on('keydown-DOWN', this.duck, this);
        keyboard.on('keydown-S', this.duck, this);
    }

    private attachTouch (): void
    {
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        this.scene.input.on('pointerupoutside', this.onPointerUp, this);
    }

    setEnabled (enabled: boolean): void
    {
        this.enabled = enabled;

        //  Drop any drag in progress, so re-enabling cannot resume a gesture
        //  measured from before the game was interrupted.
        this.dragging = false;
    }

    private moveLeft (): void
    {
        if (this.enabled)
        {
            this.onIntent(-1);
        }
    }

    private moveRight (): void
    {
        if (this.enabled)
        {
            this.onIntent(1);
        }
    }

    private leap (): void
    {
        if (this.enabled)
        {
            this.onJump();
        }
    }

    private duck (): void
    {
        if (this.enabled)
        {
            this.onDive();
        }
    }

    private onPointerDown (pointer: Phaser.Input.Pointer): void
    {
        if (!this.enabled)
        {
            return;
        }

        this.dragging = true;
        this.anchor = { x: pointer.x, y: pointer.y };

        //  A fresh touch is always allowed to steer straight away - the delay
        //  only paces one continuous drag.
        this.lastSwipeTime = 0;
    }

    private onPointerMove (pointer: Phaser.Input.Pointer): void
    {
        if (!this.dragging)
        {
            return;
        }

        const result = evaluateDrag(this.anchor, pointer.x, pointer.y);

        if (result.jump)
        {
            this.anchor = result.anchor;
            this.leap();

            return;
        }

        if (result.dive)
        {
            this.anchor = result.anchor;
            this.duck();

            return;
        }

        if (result.intent === 0)
        {
            this.anchor = result.anchor;

            return;
        }

        //  Too soon after the last lane change: leave the anchor where it was so
        //  the gesture stays pending and fires the moment the delay is up. A
        //  deliberate long drag still gets its second lane; a flick does not get
        //  three at once.
        if (isRepeatTooSoon(this.scene.time.now, this.lastSwipeTime))
        {
            return;
        }

        this.anchor = result.anchor;
        this.lastSwipeTime = this.scene.time.now;

        this.onIntent(result.intent);
    }

    private onPointerUp (): void
    {
        this.dragging = false;
    }

    destroy (): void
    {
        const keyboard = this.scene.input.keyboard;

        if (keyboard)
        {
            keyboard.off('keydown-LEFT', this.moveLeft, this);
            keyboard.off('keydown-A', this.moveLeft, this);
            keyboard.off('keydown-RIGHT', this.moveRight, this);
            keyboard.off('keydown-D', this.moveRight, this);
        }

        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        this.scene.input.off('pointerupoutside', this.onPointerUp, this);
    }
}
