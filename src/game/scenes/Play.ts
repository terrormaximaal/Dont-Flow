import { Scene } from 'phaser';
import {
    COLOR_FLASH,
    COLOR_VALUES,
    FINISH_SLOWDOWN_MS,
    FLASH_DURATION,
    FORWARD_SPEED,
    HAPTIC_COLLECT_MS,
    HAPTIC_MISS_MS,
    MAX_DELTA
} from '../config/constants';
import { buildLevel } from '../config/level';
import { Drop } from '../entities/Drop';
import { Course } from '../systems/Course';
import { Effects } from '../systems/Effects';
import { InputSystem } from '../systems/InputSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TrackScroller } from '../systems/TrackScroller';
import { Hud } from '../ui/Hud';
import { LevelComplete } from '../ui/LevelComplete';

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
    private hud: Hud;

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

    create ()
    {
        //  Reset explicitly: Phaser reuses the scene instance across restarts,
        //  so field initialisers do not run again.
        this.distance = 0;
        this.speed.scale = 1;

        this.track = new TrackScroller(this);
        this.drop = new Drop(this);
        this.effects = new Effects(this);
        this.scoring = new ScoreSystem();
        this.hud = new Hud(this);

        this.course = new Course(this, buildLevel(), {
            onGate: (color) => this.drop.setColorId(color),
            onOrb: (orb, matched, y) => this.onOrb(orb.x, y, matched),
            onFinish: () => this.onFinish()
        });

        this.input_ = new InputSystem(this, (direction) => this.drop.moveLane(direction));

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
            this.scoring.collect();

            const colorId = this.drop.getColorId();

            this.effects.burst(x, y, colorId ? COLOR_VALUES[colorId] : COLOR_FLASH);
            this.effects.haptic(HAPTIC_COLLECT_MS);
        }
        else
        {
            this.scoring.breakCombo();

            this.drop.flash(COLOR_FLASH, FLASH_DURATION);
            this.effects.haptic(HAPTIC_MISS_MS);
        }

        this.hud.setScore(this.scoring.getScore());
        this.hud.setCombo(this.scoring.getCombo());
    }

    /**
     * Crossing the finish line: hand back control of the run, coast to a stop,
     * then show the result.
     */
    private onFinish (): void
    {
        this.input_.setEnabled(false);

        this.tweens.add({
            targets: this.speed,
            scale: 0,
            duration: FINISH_SLOWDOWN_MS,
            ease: 'Quad.Out',
            onComplete: () => {

                this.hud.setVisible(false);

                new LevelComplete(this, {
                    score: this.scoring.getScore(),
                    bestCombo: this.scoring.getBestCombo()
                }, () => this.scene.restart());

            }
        });
    }

    update (_time: number, delta: number)
    {
        //  Clamp so a stalled frame cannot jump the drop across the track.
        const dt = Math.min(delta / 1000, MAX_DELTA);

        this.distance += FORWARD_SPEED * this.speed.scale * dt;

        this.track.update(this.distance);
        this.drop.update(dt);
        this.course.update(this.distance, this.drop.getX(), this.drop.getColorId());
    }
}
