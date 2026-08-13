import { Scene } from 'phaser';
import {
    DEFAULT_LANES,
    COLOR_FAIL_FLASH,
    COLOR_FLASH,
    COLOR_VALUES,
    ColorId,
    DEPTH_OVERLAY,
    DROP_SCREEN_Y,
    FAIL_FLASH_MS,
    FAIL_SHAKE_INTENSITY,
    FAIL_SHAKE_MS,
    FAIL_SLOWDOWN_MS,
    FAIL_WASH_ALPHA,
    FAIL_WASH_MS,
    FAIL_ZOOM,
    FINISH_SLOWDOWN_MS,
    FLASH_DURATION,
    FORWARD_SPEED,
    GAME_HEIGHT,
    GAME_WIDTH,
    HAPTIC_COLLECT_MS,
    HAPTIC_MISS_MS,
    MAX_DELTA,
    PACE_SMOOTHING,
    BOOST_ZOOM,
    BOOST_ZOOM_SMOOTHING,
    RAINBOW_ROWS,
    RESUME_AT_LAST_LEVEL,
    SHAKE_DURATION,
    SHAKE_INTENSITY
} from '../config/constants';
import { buildLevel, ORB_ROW_SPACING, speedAt, SpeedZone } from '../config/level';
import { clampLevelIndex, hasNextLevel, LEVELS } from '../config/levels';
import { Drop } from '../entities/Drop';
import { WORLDS } from '../config/worldData';
import { paintPageBackdrop } from '../systems/PageBackdrop';
import { Course } from '../systems/Course';
import { Environment } from '../systems/Environment';
import { Floaters } from '../systems/Floaters';
import { Roadside } from '../systems/Roadside';
import { Slipstream } from '../systems/Slipstream';
import { Effects } from '../systems/Effects';
import { EnergySystem } from '../systems/EnergySystem';
import { InputSystem } from '../systems/InputSystem';
import { useLanes } from '../systems/Lanes';
import { OrientationGuard } from '../systems/OrientationGuard';
import { PowerUps } from '../systems/PowerUps';
import { SaveSystem } from '../systems/SaveSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { TrackScroller } from '../systems/TrackScroller';
import { Trail } from '../systems/Trail';
import { rainbowAt } from '../utils/color';
import { easeTowards } from '../utils/math';
import { showFloatingScore } from '../ui/FloatingScore';
import { addVignette } from '../ui/Vignette';
import { Hud } from '../ui/Hud';
import { LevelComplete } from '../ui/LevelComplete';
import { LowVignette } from '../ui/LowVignette';
import { RunFailed } from '../ui/RunFailed';
import { PauseButton } from '../ui/PauseButton';
import { PauseOverlay } from '../ui/PauseOverlay';
import { arrive, leaveTo } from '../ui/transition';

/**
 * The one and only scene for now. It owns the single piece of shared state -
 * how far we have flowed - and pumps the systems each frame.
 */
export class Play extends Scene
{
    private drop: Drop;
    private track: TrackScroller;
    private environment: Environment;
    private roadside: Roadside | null = null;
    private floaters: Floaters | null = null;
    private slipstream: Slipstream;
    private trail: Trail;
    private course: Course;
    private powerUps: PowerUps;
    private input_: InputSystem;
    private effects: Effects;
    private scoring: ScoreSystem;
    private save: SaveSystem;
    private hud: Hud;
    private lowVignette: LowVignette;
    private pauseButton: PauseButton;
    private pauseOverlay: PauseOverlay | null = null;

    /** Gates the update loop. The scene keeps running so the overlay stays tappable. */
    private paused = false;

    /**
     * True once the run is over either way - finished or run out.
     *
     * One flag rather than two, because everything that reads it is asking the
     * same question: is this run still being played. Pausing, input and the
     * course all stop on it, and a second flag would mean four places that each
     * have to remember to check both.
     */
    private finished = false;

    /** How long the course is, so a failed run can say how far it got. */
    private finishDistance = 1;

    /** Which level of LEVELS is being played. Carried across restarts as scene data. */
    private levelIndex = 0;

    /** This level's forward speed, which may override the global default. */
    private forwardSpeed = FORWARD_SPEED;

    /** Distance travelled in track pixels. Everything else is placed from this. */
    private distance = 0;

    /** Stretches of this level that run at their own pace. */
    private zones: SpeedZone[] = [];

    /**
     * The pace actually being run at, easing towards whatever the course asks
     * for. Held separately from the zone's own figure so a boost arrives as
     * something felt rather than as a step change, which reads as a glitch.
     */
    private pace = 1;

    /**
     * How far a rainbow drop lasts here, and the point on the course it runs out
     * at. Both distances, because a power-up measured in seconds would be worth
     * less on a level whose rows arrive quickly.
     */
    private rainbowSpan = 0;
    private rainbowUntil = 0;

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
        this.rainbowUntil = 0;
        this.pace = 1;
        this.zones = [];
        this.finishDistance = 1;

        //  Charged per level start, retries included. The menus already gate
        //  this, so failing here means Play was reached some other way - fall
        //  back to the title rather than handing out a free run.
        if (!new EnergySystem(this.save).charge())
        {
            this.scene.start('Title');

            return;
        }

        const level = LEVELS[this.levelIndex];

        this.forwardSpeed = level.forwardSpeed ?? FORWARD_SPEED;

        //  Recorded as the level begins, not when it ends, so quitting midway
        //  still comes back to the right place.
        this.save.setCurrentLevel(this.levelIndex);

        //  Laid out before anything that draws or collides exists, since all of
        //  them ask where a lane is.
        useLanes(level.lanes ?? DEFAULT_LANES);

        const world = WORLDS[level.world];

        paintPageBackdrop(world);

        this.environment = new Environment(this, world);
        this.track = new TrackScroller(this, world);
        this.roadside = world.roadside ? new Roadside(this, world.roadside, world.hazeColor, world.hazeAlpha) : null;
        this.floaters = world.floaters ? new Floaters(this, world.floaters) : null;
        this.slipstream = new Slipstream(this, world.trackEdge);
        this.trail = new Trail(this);
        this.drop = new Drop(this);
        this.effects = new Effects(this);
        this.scoring = new ScoreSystem();
        this.hud = new Hud(this, level.name, world);

        addVignette(this);

        //  Built after the plain vignette so it lies over the top of it.
        this.lowVignette = new LowVignette(this);

        //  The drop wears the bank as its own size, so it starts part-grown and
        //  visibly shrinks as the run is spent. That is the fail warning the
        //  player cannot miss: it happens where they are already looking.
        this.drop.setScore(this.scoring.getScore());
        this.hud.setScore(this.scoring.getScore());

        //  Every level now begins one mistake from the end, so the warning is
        //  on from the first frame rather than waiting for the first orb to
        //  arrive and tell it. Saying it here rather than in onOrb is the
        //  difference between a rule the player is warned about and a rule they
        //  discover by dying to it.
        this.hud.setLow(this.scoring.isLow());
        this.lowVignette.setLow(this.scoring.isLow());

        const course = buildLevel(level);

        this.zones = course.zones;
        this.finishDistance = course.finishDistance;

        //  Nine rows' worth, whatever this level's rows are spaced at.
        this.rainbowSpan = RAINBOW_ROWS * (level.rowSpacing ?? ORB_ROW_SPACING);

        this.course = new Course(this, course, {
            onGate: (color) => this.onGate(color),
            onOrb: (orb, matched, y) => this.onOrb(orb.x, y, matched),
            onBlocked: (x, y) => this.onOrb(x, y, false),
            onFinish: () => this.onFinish()
        });

        this.powerUps = new PowerUps(this, course.powerUps, (x, y) => this.onRainbow(x, y));

        this.input_ = new InputSystem(
            this,
            (direction) => this.drop.moveLane(direction),
            () => this.drop.jump(this.distance)
        );

        this.pauseButton = new PauseButton(this, () => this.setPaused(true));

        this.input.keyboard?.on('keydown-ESC', () => this.setPaused(!this.paused));

        //  Freezes the run while the phone is held sideways, so turning it back
        //  does not cost the player any distance. Independent of the manual
        //  pause: that gates the update loop, this pauses the whole scene.
        new OrientationGuard(this);

        this.events.once('shutdown', () => this.input_.destroy());

        arrive(this);
    }

    /**
     * A gate repaints the drop, and the drop sheds the colour it was carrying.
     */
    private onGate (color: ColorId): void
    {
        if (this.finished)
        {
            return;
        }

        //  Thrown off in the colour being left behind rather than the one
        //  arriving: the new one is already flooding through the drop itself,
        //  and two things saying the same thing at once say it half as clearly.
        const previous = this.drop.getColorId();

        this.drop.setColorId(color);

        const shed = previous ? COLOR_VALUES[previous] : COLOR_VALUES[color];

        //  Four signals inside half a second, none of which stop the run: the
        //  colour floods through the drop, the old one puffs off it, a wave of
        //  the new one runs back down the road, and the camera takes a step in.
        this.effects.bloom(this.drop.getX(), DROP_SCREEN_Y, shed);
        this.effects.wave(COLOR_VALUES[color]);
        this.effects.punch(this.cameras.main);
    }

    /**
     * The whole reward loop: right colour pays out, wrong colour costs the
     * streak.
     */
    private onOrb (x: number, y: number, matched: boolean): void
    {
        //  The course keeps drawing while the road coasts to a stop, either
        //  way a run ends, so it keeps reporting too. Nothing it reports means
        //  anything now: a run that is over cannot be scored, and a penalty
        //  landing behind the fail panel would be the game arguing with itself.
        if (this.finished)
        {
            return;
        }

        if (matched)
        {
            const gained = this.scoring.collect();

            const colorId = this.drop.getColorId();

            this.effects.swallow(x, y, colorId ? COLOR_VALUES[colorId] : COLOR_FLASH);
            this.effects.haptic(HAPTIC_COLLECT_MS);
            this.drop.pulse();
            this.trail.boost(this.distance);

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
        this.hud.setMultiplier(this.scoring.getMultiplier());

        //  The drop's size is the score, so the player can read how the run is
        //  going without looking away from the road.
        this.drop.setScore(this.scoring.getScore());

        //  Asked here rather than watched for in update, so the run ends on the
        //  hit that emptied the bank and not on the frame after it - which is
        //  the difference between the fail landing on the thing that caused it
        //  and landing on whatever happened to be under the drop next.
        if (this.scoring.isOut())
        {
            this.onFailed(x, y);

            return;
        }

        this.lowVignette.setLow(this.scoring.isLow());
        this.hud.setLow(this.scoring.isLow());
    }

    /**
     * The bank has run out, and the road is taken away.
     *
     * Everything here is one event drawn out over a second and a bit: the hit,
     * the world draining, the road coasting to a stop, and only then the panel.
     * Drawn out on purpose - a fail that cuts straight to a menu is read as the
     * game breaking, and a player who does not see what killed them has nothing
     * to do differently next time.
     */
    private onFailed (x: number, y: number): void
    {
        if (this.finished)
        {
            return;
        }

        this.finished = true;

        this.pauseButton.setVisible(false);
        this.input_.setEnabled(false);

        //  The warning has done its job and is about to be contradicted by
        //  something far louder.
        this.lowVignette.clear();

        const camera = this.cameras.main;

        camera.shake(FAIL_SHAKE_MS, FAIL_SHAKE_INTENSITY);
        camera.flash(FAIL_FLASH_MS, 255, 85, 102);

        this.effects.haptic(HAPTIC_MISS_MS * 3);
        this.effects.bloom(x, y, COLOR_FAIL_FLASH);

        //  Creeping in as it stops. The camera has pulled *back* for speed all
        //  game, so coming forward is the opposite gesture and reads as the
        //  world closing rather than as another boost.
        this.tweens.add({
            targets: camera,
            zoom: FAIL_ZOOM,
            duration: FAIL_SLOWDOWN_MS,
            ease: 'Sine.InOut'
        });

        //  The colour draining out. A wash rather than a fade to black, so the
        //  level is still legible underneath it - the player should be able to
        //  see the hazard they are stopped against.
        const wash = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            GAME_WIDTH,
            GAME_HEIGHT,
            COLOR_FAIL_FLASH,
            0
        );

        wash.setDepth(DEPTH_OVERLAY - 1);

        this.tweens.add({
            targets: wash,
            fillAlpha: FAIL_WASH_ALPHA,
            duration: FAIL_WASH_MS,
            ease: 'Quad.Out'
        });

        this.tweens.add({
            targets: this.speed,
            scale: 0,
            duration: FAIL_SLOWDOWN_MS,
            //  Long and soft, where the finish is short and firm. The road is
            //  running down rather than pulling up.
            ease: 'Sine.Out',
            onComplete: () => {

                this.hud.setVisible(false);

                //  A failed run banks nothing - not the score, which is zero,
                //  and not the level after it, which has to be finished for.
                new RunFailed(this, {
                    levelName: LEVELS[this.levelIndex].name,
                    progress: this.distance / this.finishDistance,
                    bestCombo: this.scoring.getBestCombo(),
                    bestScore: this.save.getBestScore(this.levelIndex)
                }, {
                    onRetry: () => this.startLevel(this.levelIndex),
                    onMenu: () => leaveTo(this, () => this.scene.start('Title'))
                }, new EnergySystem(this.save));

            }
        });
    }

    /**
     * A rainbow drop taken: everything matches until it runs out.
     */
    private onRainbow (x: number, y: number): void
    {
        if (this.finished)
        {
            return;
        }

        //  Taking a second one while the first is still going extends it from
        //  now rather than stacking, so it can never be banked into a long run
        //  that skips a whole level.
        this.rainbowUntil = this.distance + this.rainbowSpan;

        this.effects.swallow(x, y, rainbowAt(this.distance * 0.01));
        this.effects.haptic(HAPTIC_COLLECT_MS);
        this.drop.pulse();
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
                onMenu: () => leaveTo(this, () => this.scene.start('Title'))
            }, new EnergySystem(this.save));

            return;
        }

        //  Rebuilt on each pause rather than hidden, so no stale overlay can be
        //  left sitting invisible over a live run.
        this.pauseOverlay?.destroy();
        this.pauseOverlay = null;
    }

    private onFinish (): void
    {
        if (this.finished)
        {
            return;
        }

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

                //  Finishing is what earns the next level, not walking into it.
                //  Without this, leaving by MENU rather than NEXT LEVEL loses
                //  the progress the player just made.
                if (hasNext)
                {
                    this.save.unlockLevel(this.levelIndex + 1);
                }

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
                    onMenu: () => leaveTo(this, () => this.scene.start('Title'))
                }, new EnergySystem(this.save));

            }
        });
    }

    private startLevel (levelIndex: number): void
    {
        leaveTo(this, () => this.scene.restart({ levelIndex }));
    }

    update (_time: number, delta: number)
    {
        if (this.paused)
        {
            return;
        }

        //  Clamp so a stalled frame cannot jump the drop across the track.
        const dt = Math.min(delta / 1000, MAX_DELTA);

        //  The course's own pace here, eased into rather than stepped to.
        this.pace = easeTowards(this.pace, speedAt(this.zones, this.distance), PACE_SMOOTHING, dt);

        this.distance += this.forwardSpeed * this.speed.scale * this.pace * dt;

        //  The camera pulls back a little when the road speeds up, which is the
        //  oldest trick there is for making speed felt rather than measured.
        //  Eased on its own, slower than the pace, so it lags the change and
        //  reads as a reaction to it.
        const target = 1 - ((1 - BOOST_ZOOM) * Math.max(0, this.pace - 1));

        this.cameras.main.setZoom(easeTowards(this.cameras.main.zoom, target, BOOST_ZOOM_SMOOTHING, dt));

        this.environment.update(this.distance, delta);
        this.track.update(this.distance);
        this.floaters?.update(this.distance);
        this.roadside?.update(this.distance);
        this.slipstream.update(this.distance);

        //  How much of a rainbow drop is left, 1 down to 0.
        const left = this.rainbowSpan > 0
            ? Math.max(0, (this.rainbowUntil - this.distance) / this.rainbowSpan)
            : 0;

        this.drop.setWild(left > 0, left);
        this.drop.update(dt, this.distance);

        this.trail.update(this.distance, this.drop.getX(), this.drop.getPaintColor());

        this.powerUps.update(this.distance, this.drop.getX());
        this.course.update(
            this.distance,
            this.drop.getX(),
            this.drop.getTargetX(),
            this.drop.getColorId(),
            left > 0,
            this.drop.getHeight()
        );
    }
}
