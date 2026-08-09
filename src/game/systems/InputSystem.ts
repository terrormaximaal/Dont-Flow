import { Scene } from 'phaser';
import { DragAnchor, evaluateDrag, LaneIntent } from './swipe';

export type { LaneIntent };

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
    private anchor: DragAnchor = { x: 0, y: 0 };
    private dragging = false;

    /** Steering is switched off once the run is over. */
    private enabled = true;

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

    private onPointerDown (pointer: Phaser.Input.Pointer): void
    {
        if (!this.enabled)
        {
            return;
        }

        this.dragging = true;
        this.anchor = { x: pointer.x, y: pointer.y };
    }

    private onPointerMove (pointer: Phaser.Input.Pointer): void
    {
        if (!this.dragging)
        {
            return;
        }

        const result = evaluateDrag(this.anchor, pointer.x, pointer.y);

        this.anchor = result.anchor;

        if (result.intent !== 0)
        {
            this.onIntent(result.intent);
        }
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
