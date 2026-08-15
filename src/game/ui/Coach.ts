import { Scene } from 'phaser';
import {
    COACH_ALPHA,
    COACH_SIZE,
    COACH_Y,
    COLOR_HUD_TEXT,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_FONT
} from '../config/constants';
import { Lesson, wordsFor } from '../systems/coach';

/**
 * The one thing the game ever says to the player.
 *
 * Low on the screen, just above the drop, because that is where the eye already
 * is - a prompt at the top would be read after the row it was about had gone
 * past. Pale rather than loud: it is help, not an alarm, and it is on screen
 * while the player is trying to read the road behind it.
 */
export class Coach
{
    private readonly text: Phaser.GameObjects.Text;

    private showing: Lesson | null = null;

    constructor (scene: Scene)
    {
        this.text = scene.add.text(GAME_WIDTH / 2, COACH_Y, '', {
            fontFamily: HUD_FONT,
            fontSize: COACH_SIZE,
            color: COLOR_HUD_TEXT
        });

        this.text.setOrigin(0.5);
        this.text.setDepth(DEPTH_HUD);
        this.text.setLetterSpacing(3);
        this.text.setAlpha(0);

        //  A prompt is not a button. Left interactive it would swallow the very
        //  swipe it is asking for.
        this.text.setInteractive(undefined, () => false);
        this.text.disableInteractive();
    }

    /**
     * Show a lesson, or nothing.
     *
     * Called every frame with whatever is currently due, so the scene does not
     * have to track transitions - asking for the same lesson twice is a no-op
     * and asking for null puts it away.
     */
    set (lesson: Lesson | null): void
    {
        if (lesson === this.showing)
        {
            return;
        }

        this.showing = lesson;

        if (lesson === null)
        {
            this.text.setAlpha(0);

            return;
        }

        this.text.setText(wordsFor(lesson));
        this.text.setAlpha(COACH_ALPHA);
    }

    destroy (): void
    {
        this.text.destroy();
    }
}
