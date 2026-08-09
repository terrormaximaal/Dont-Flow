import { Scene } from 'phaser';
import { SWIPE_DOMINANCE, SWIPE_THRESHOLD } from '../config/constants';

/** -1 = one lane left, +1 = one lane right. */
export type LaneIntent = -1 | 1;

/**
 * Turns touch swipes and arrow keys into lane-change intents.
 *
 * This system knows nothing about the drop or the track - it only reports that
 * the player asked to go left or right, and the scene decides what that means.
 */
export class InputSystem
{
    private readonly scene: Scene;
    private readonly onIntent: (direction: LaneIntent) => void;

    /** Where the current drag was last measured from. */
    private anchorX = 0;
    private anchorY = 0;
    private dragging = false;

    constructor (scene: Scene, onIntent: (direction: LaneIntent) => void)
    {
        this.scene = scene;
        this.onIntent = onIntent;

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
    }

    private attachTouch (): void
    {
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        this.scene.input.on('pointerupoutside', this.onPointerUp, this);
    }

    private moveLeft (): void
    {
        this.onIntent(-1);
    }

    private moveRight (): void
    {
        this.onIntent(1);
    }

    private onPointerDown (pointer: Phaser.Input.Pointer): void
    {
        this.dragging = true;
        this.anchorX = pointer.x;
        this.anchorY = pointer.y;
    }

    private onPointerMove (pointer: Phaser.Input.Pointer): void
    {
        if (!this.dragging)
        {
            return;
        }

        const dx = pointer.x - this.anchorX;
        const dy = pointer.y - this.anchorY;

        if (Math.abs(dx) < SWIPE_THRESHOLD)
        {
            return;
        }

        //  Ignore drags that are mostly vertical, so a scroll-like gesture does
        //  not steer.
        if (Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE)
        {
            return;
        }

        this.onIntent(dx > 0 ? 1 : -1);

        //  Re-anchor instead of ending the gesture, so one long drag can cross
        //  two lanes without lifting the finger.
        this.anchorX = pointer.x;
        this.anchorY = pointer.y;
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
