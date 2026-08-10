import { Scene } from 'phaser';
import {
    COLOR_FLASH,
    COLOR_VALUES,
    FINISH_SLOWDOWN_MS,
    FLASH_DURATION,
    FORWARD_SPEED,
    HAPTIC_COLLECT_MS,
    HAPTIC_MISS_MS,
    MAX_DELTA,
    RESUME_AT_LAST_LEVEL,
    SHAKE_DURATION,
    SHAKE_INTENSITY
} from '../config/constants';
import { buildLevel } from '../config/level';
import { clampLevelIndex, hasNextLevel, LEVELS } from '../config/levels';
import { Drop } from '../entities/Drop';
import { Course } from '../systems/Course';
import { Effects } from '../systems/Effects';
import { EnergySystem } from '../systems/EnergySystem';
import { InputSystem } from '../systems/InputSystem';
import { OrientationGuard } from '../systems/OrientationGuard';
import { SaveSystem } from '../systems/SaveSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TrackScroller } from '../systems/TrackScroller';
import { showFloatingScore } from '../ui/FloatingScore';
import { Hud } from '../ui/Hud';
import { LevelComplete } from '../ui/LevelComplete';
import { PauseButton } from '../ui/PauseButton';
import { PauseOverlay } from '../ui/PauseOverlay';

/**
 * The one and only scene for now. It owns the single piece of shared state -
 * how far we have flowed - and pumps the systems each frame.
 */
export class Play extends Scene
{
    private drop: Drop;
    private track: TrackScroller;
    private course: Course;
    private input_: InputSystem;
    private effects: Effects;
    private scoring: ScoreSystem;
    private save: SaveSystem;
    private hud: Hud;
    private pauseButton: PauseButton;
    private pauseOverlay: PauseOverlay | null = null;

    /** Gates the update loop. The scene keeps running so the overlay stays tappable. */
    private paused = false;

    /** True once the finish is crossed, after which pausing is meaningless. */
    private finished = false;

    /** Which level of LEVELS is being played. Carried across restarts as scene data. */
    private levelIndex = 0;

    /** This level's forward speed, which may override the global default. */
    private forwardSpeed = FORWARD_SPEED;

    /** Distance travelled in track pixels. Everything else is placed from this. */
    private distance = 0;

    /**
     * Multiplier on the forward speed. Tweened to zero at the finish line so
     * the track eases to a stop instead of freezing mid-flow. Wrapped in an
     * object because that is what a tween can target.
     */
    private readonly speed = { scale: 1 };

    constructor ()
    {
        super('Play');
    }

    /**
     * Restarting passes the level to play back in, so the same scene serves
     * every level.
     */
    init (data: { levelIndex?: number })
    {
        this.save = new SaveSystem();

        //  An explicit level wins; without one this is a fresh load, which
        //  resumes wherever the player left off.
        const requested = data?.levelIndex ?? (RESUME_AT_LAST_LEVEL ? this.save.getResumeLevel() : 0);

        this.levelIndex = clampLevelIndex(requested);
    }

    create ()
    {
        //  Reset explicitly: Phaser reuses the scene instance across restarts,
        //  so field initialisers do not run again.
        this.distance = 0;
        this.speed.scale = 1;
        this.paused = false;
        this.finished = false;
        this.pauseOverlay = null;

        //  Charged per level start, retries included. The menus already gate
        //  this, so failing here means Play was reached some other way - fall
        //  back to the title rather than handing out a free run.
        if (!new EnergySystem(this.save).spend())
        {
            this.scene.start('Title');

            return;
        }

        const level = LEVELS[this.levelIndex];

        this.forwardSpeed = level.forwardSpeed ?? FORWARD_SPEED;

        //  Recorded as the level begins, not when it ends, so quitting midway
        //  still comes back to the right place.
        this.save.setCurrentLevel(this.levelIndex);

        this.track = new TrackScroller(this);
        this.drop = new Drop(this);
        this.effects = new Effects(this);
        this.scoring = new ScoreSystem();
        this.hud = new Hud(this, level.name);

        this.course = new Course(this, buildLevel(level), {
            onGate: (color) => this.drop.setColorId(color),
            onOrb: (orb, matched, y) => this.onOrb(orb.x, y, matched),
            onBlocked: (x, y) => this.onOrb(x, y, false),
            onFinish: () => this.onFinish()
        });

        this.input_ = new InputSystem(this, (direction) => this.drop.moveLane(direction));

        this.pauseButton = new PauseButton(this, () => this.setPaused(true));

        this.input.keyboard?.on('keydown-ESC', () => this.setPaused(!this.paused));

        //  Freezes the run while the phone is held sideways, so turning it back
        //  does not cost the player any distance. Independent of the manual
        //  pause: that gates the update loop, this pauses the whole scene.
        new OrientationGuard(this);

        this.events.once('shutdown', () => this.input_.destroy());
    }

    /**
     * The whole reward loop: right colour pays out, wrong colour costs the
     * streak.
     */
    private onOrb (x: number, y: number, matched: boolean): void
    {
        if (matched)
        {
            const gained = this.scoring.collect();

            const colorId = this.drop.getColorId();

            this.effects.burst(x, y, colorId ? COLOR_VALUES[colorId] : COLOR_FLASH);
            this.effects.haptic(HAPTIC_COLLECT_MS);

            showFloatingScore(this, x, y, gained);
        }
        else
        {
            const lost = this.scoring.penalise();

            //  Three signals at once, because a penalty has to land: the drop
            //  flashes, the screen kicks, and the points lost float off the hit.
            this.drop.flash(COLOR_FLASH, FLASH_DURATION);
            this.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY);
            this.effects.haptic(HAPTIC_MISS_MS);

            showFloatingScore(this, x, y, lost);
        }

        this.hud.setScore(this.scoring.getScore());
        this.hud.setCombo(this.scoring.getCombo());
    }

    /**
     * Crossing the finish line: hand back control of the run, coast to a stop,
     * then show the result.
     */
    /**
     * Pausing gates the update loop rather than calling scene.pause(), because a
     * paused scene stops processing input too - which would leave the overlay's
     * own buttons dead.
     */
    private setPaused (paused: boolean): void
    {
        if (this.finished || paused === this.paused)
        {
            return;
        }

        this.paused = paused;

        this.input_.setEnabled(!paused);
        this.pauseButton.setVisible(!paused);

        if (paused)
        {
            this.pauseOverlay = new PauseOverlay(this, {
                onResume: () => this.setPaused(false),
                onRetry: () => this.startLevel(this.levelIndex),
                onMenu: () => this.scene.start('Title')
            });

            return;
        }

        //  Rebuilt on each pause rather than hidden, so no stale overlay can be
        //  left sitting invisible over a live run.
        this.pauseOverlay?.destroy();
        this.pauseOverlay = null;
    }

    private onFinish (): void
    {
        this.finished = true;

        this.pauseButton.setVisible(false);
        this.input_.setEnabled(false);

        this.tweens.add({
            targets: this.speed,
            scale: 0,
            duration: FINISH_SLOWDOWN_MS,
            ease: 'Quad.Out',
            onComplete: () => {

                this.hud.setVisible(false);
                this.drop.setVisible(false);

                const hasNext = hasNextLevel(this.levelIndex);
                const score = this.scoring.getScore();
                const isNewBest = this.save.recordScore(this.levelIndex, score);

                new LevelComplete(this, {
                    levelName: LEVELS[this.levelIndex].name,
                    score,
                    bestCombo: this.scoring.getBestCombo(),
                    bestScore: this.save.getBestScore(this.levelIndex),
                    isNewBest,
                    hasNext
                }, {
                    //  Past the last level, the primary action loops back to the
                    //  first rather than dead-ending.
                    onPrimary: () => this.startLevel(hasNext ? this.levelIndex + 1 : 0),
                    onRetry: () => this.startLevel(this.levelIndex),
                    onMenu: () => this.scene.start('Title')
                }, new EnergySystem(this.save));

            }
        });
    }

    private startLevel (levelIndex: number): void
    {
        this.scene.restart({ levelIndex });
    }

    update (_time: number, delta: number)
    {
        if (this.paused)
        {
            return;
        }

        //  Clamp so a stalled frame cannot jump the drop across the track.
        const dt = Math.min(delta / 1000, MAX_DELTA);

        this.distance += this.forwardSpeed * this.speed.scale * dt;

        this.track.update(this.distance);
        this.drop.update(dt);
        this.course.update(this.distance, this.drop.getX(), this.drop.getColorId());
    }
}
