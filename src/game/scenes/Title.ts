import { Scene } from 'phaser';
import {
    BUTTON_HEIGHT,
    BUTTON_WIDTH,
    COLOR_HUD_DIM,
    DEPTH_HUD,
    DEPTH_OVERLAY,
    GAME_HEIGHT,
    GAME_WIDTH,
    HUD_FONT,
    RESUME_AT_LAST_LEVEL,
    TITLE_DROP_RADIUS,
    TITLE_TAGLINE_SIZE
} from '../config/constants';
import { LEVELS } from '../config/levels';
import {
    ENTER_BUTTON_MS,
    ENTER_BUTTON_RISE,
    ENTER_BUTTON_STAGGER,
    ENTER_DROP_FROM,
    ENTER_DROP_MS,
    ENTER_MARK_MS,
    ENTER_MARK_RISE,
    ENTER_MARK_STAGGER,
    ENTER_TAGLINE_MS,
    LEAVE_FADE_MS,
    MENU_SKY_LOW,
    MENU_SKY_TOP
} from '../config/menuTheme';
import { paintPageColors } from '../systems/PageBackdrop';
import { EnergySystem } from '../systems/EnergySystem';
import { MenuSky } from '../systems/MenuSky';
import { SaveSystem } from '../systems/SaveSystem';
import { Button } from '../ui/Button';
import { EnergyMeter } from '../ui/EnergyMeter';
import { MENU_LAYOUT } from '../ui/menuLayout';
import { TAGLINE } from '../ui/taglines';
import { TitleMark } from '../ui/TitleMark';
import { waterOutline } from '../entities/drop-surface';
import { drawWaterDrop } from '../ui/shapes';
import { menuDropColor } from '../ui/menuDrop';

/**
 * The screen the game opens on.
 *
 * A place rather than a panel. The drop hangs in a liquid cosmos with a pool
 * under it, the wordmark is thrown down into that pool as a reflection, and
 * everything arrives in the order the eye should read it: the subject, its
 * name, what it does, and then the way in.
 */
export class Title extends Scene
{
    private sky: MenuSky;
    private meter: EnergyMeter;
    private logo: Phaser.GameObjects.Graphics;

    /** Seconds on screen, so the drop ripples and shifts hue on its own clock. */
    private elapsed = 0;

    /** True once a button has been pressed, so a second press cannot fire. */
    private leaving = false;

    constructor ()
    {
        super('Title');
    }

    create ()
    {
        //  Somewhere else entirely, not the road with buttons over it. Looking
        //  down the track made the first screen say "here is the game already"
        //  rather than "here is what this game is".
        paintPageColors(MENU_SKY_TOP, MENU_SKY_LOW);

        this.sky = new MenuSky(this);

        const save = new SaveSystem();
        const energy = new EnergySystem(save);
        const resumeLevel = save.getResumeLevel();

        //  "Continue" only means something if there is somewhere to continue to.
        const canContinue = RESUME_AT_LAST_LEVEL && resumeLevel > 0;
        const canPlay = energy.mayStart();

        this.elapsed = 0;
        this.leaving = false;

        //  The same drop the player steers, rippling on the spot - a still one
        //  next to a living one would look like a different drop.
        this.logo = this.add.graphics();
        this.logo.setPosition(GAME_WIDTH / 2, MENU_LAYOUT.dropY);
        this.logo.setDepth(DEPTH_HUD);

        const mark = new TitleMark(this, MENU_LAYOUT.markTopY, MENU_LAYOUT.markMainY);

        const tagline = this.add.text(GAME_WIDTH / 2, MENU_LAYOUT.taglineY, TAGLINE, {
            fontFamily: HUD_FONT,
            fontSize: TITLE_TAGLINE_SIZE,
            color: COLOR_HUD_DIM
        });

        tagline.setOrigin(0.5);
        tagline.setDepth(DEPTH_HUD);
        tagline.setLetterSpacing(3);

        const playLabel = canContinue ? `CONTINUE ${LEVELS[resumeLevel].name}` : 'PLAY';

        //  Out of energy, the button is built inert rather than live and
        //  refusing - the meter below it explains the wait.
        const play = new Button(this, {
            x: GAME_WIDTH / 2,
            y: MENU_LAYOUT.playY,
            label: canPlay ? playLabel : 'NO ENERGY',
            variant: canPlay ? 'hero' : 'locked',
            //  A pill, which is the menu's shape. The panels keep their softer
            //  rectangle: this is the one screen that is trying to be looked at.
            radius: BUTTON_HEIGHT / 2,
            width: BUTTON_WIDTH + 26,
            onPress: () => this.leaveTo(() => this.startLevel(canContinue ? resumeLevel : 0))
        });

        play.container.setDepth(DEPTH_HUD);

        const levels = new Button(this, {
            x: GAME_WIDTH / 2,
            y: MENU_LAYOUT.levelsY,
            label: 'LEVELS',
            variant: 'ghost',
            radius: BUTTON_HEIGHT / 2,
            width: BUTTON_WIDTH + 26,
            onPress: () => this.leaveTo(() => this.scene.start('LevelSelect'))
        });

        levels.container.setDepth(DEPTH_HUD);

        this.meter = new EnergyMeter(this, MENU_LAYOUT.meterY, energy);

        this.enter(mark, tagline, play, levels);

        if (canPlay)
        {
            const start = () => this.leaveTo(() => this.startLevel(canContinue ? resumeLevel : 0));

            this.input.keyboard?.once('keydown-SPACE', start);
            this.input.keyboard?.once('keydown-ENTER', start);
        }
    }

    /**
     * Everything arriving, in reading order.
     *
     * The menu used to appear all at once, fully formed, which is the clearest
     * tell there is that a screen was assembled rather than designed. The order
     * matters more than the timings: the subject lands first, its name follows
     * it in, and the buttons are last so they are the thing still moving when
     * the eye finishes reading.
     */
    private enter (
        mark: TitleMark,
        tagline: Phaser.GameObjects.Text,
        play: Button,
        levels: Button
    ): void
    {
        //  The drop falls in and settles. Back.Out overshoots slightly at the
        //  bottom, which is a landing rather than a stop.
        this.logo.y = MENU_LAYOUT.dropY + ENTER_DROP_FROM;
        this.logo.setAlpha(0);

        this.tweens.add({
            targets: this.logo,
            y: MENU_LAYOUT.dropY,
            alpha: 1,
            duration: ENTER_DROP_MS,
            ease: 'Back.Out'
        });

        const lines: Array<Phaser.GameObjects.Text | Phaser.GameObjects.Graphics> = [
            mark.top,
            mark.main,
            mark.reflection
        ];

        //  Held so each part can be put back exactly where it was laid out,
        //  rather than assuming the rise is the same for all of them.
        lines.forEach((line, index) => {

            const restingY = line.y;
            const restingAlpha = line.alpha;

            line.y = restingY + ENTER_MARK_RISE;
            line.setAlpha(0);

            this.tweens.add({
                targets: line,
                y: restingY,
                alpha: restingAlpha,
                duration: ENTER_MARK_MS,
                delay: (ENTER_DROP_MS * 0.55) + (index * ENTER_MARK_STAGGER),
                ease: 'Cubic.Out'
            });

        });

        tagline.setAlpha(0);

        this.tweens.add({
            targets: tagline,
            alpha: 1,
            duration: ENTER_TAGLINE_MS,
            delay: (ENTER_DROP_MS * 0.55) + (lines.length * ENTER_MARK_STAGGER),
            ease: 'Quad.Out'
        });

        [ play, levels ].forEach((button, index) => {

            const restingY = button.container.y;

            button.container.y = restingY + ENTER_BUTTON_RISE;
            button.container.setAlpha(0);

            this.tweens.add({
                targets: button.container,
                y: restingY,
                alpha: 1,
                duration: ENTER_BUTTON_MS,
                delay: (ENTER_DROP_MS * 0.7) + 180 + (index * ENTER_BUTTON_STAGGER),
                ease: 'Cubic.Out'
            });

        });
    }

    /**
     * Leaving, with a wash rather than a cut.
     *
     * The menu and the first frame of a level are two completely different
     * pictures, and cutting between them reads as the game restarting. A short
     * fade is enough - long enough to be a transition, short enough that nobody
     * waiting to play notices they waited.
     *
     * Guarded, because the scene keeps taking input while the fade runs and two
     * presses would start two scenes.
     */
    private leaveTo (go: () => void): void
    {
        if (this.leaving)
        {
            return;
        }

        this.leaving = true;

        const wash = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            0x000000,
            0
        );

        wash.setDepth(DEPTH_OVERLAY + 10);

        this.tweens.add({
            targets: wash,
            fillAlpha: 1,
            duration: LEAVE_FADE_MS,
            ease: 'Quad.In',
            onComplete: go
        });
    }

    private startLevel (levelIndex: number): void
    {
        this.scene.start('Play', { levelIndex });
    }

    update (_time: number, delta: number)
    {
        this.elapsed += delta / 1000;

        //  Wandering slowly through the palette. The game is about carrying a
        //  colour and changing it, and a drop that is permanently white on the
        //  home screen says the opposite of that.
        const color = menuDropColor(this.elapsed);

        drawWaterDrop(this.logo, {
            outline: waterOutline(TITLE_DROP_RADIUS, this.elapsed, 0, 0),
            radius: TITLE_DROP_RADIUS,
            color
        });

        this.sky.update(delta);
        this.meter.update();
    }
}
