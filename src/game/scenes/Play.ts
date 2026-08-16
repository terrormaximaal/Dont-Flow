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
    FINALE_SECONDS,
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
import { buildLevel, drainAt, HazardZone, LEAD_IN, LevelSpec, ORB_ROW_SPACING, speedAt, SpeedZone } from '../config/level';
import { listenForGesture, play, setMuted, wakeAudio } from '../systems/Audio';
import { setFinale, startMusic, stopMusic } from '../systems/Music';
import { Coach } from '../ui/Coach';
import { firstForcedJump, isPrompting } from '../systems/coach';
import { formOf } from '../config/form';
import { batchAt, BATCH_AHEAD, BATCH_CHUNKS, generateRun, paceAt, speedAtChunk, SURVIVAL_PALETTE, tierAt } from '../config/survival';
import { loseLife, isSheltered, SURVIVAL_LIVES } from '../systems/lives';
import { clampLevelIndex, hasNextLevel, LEVELS } from '../config/levels';
import { Drop } from '../entities/Drop';
import { WORLDS } from '../config/worldData';
import { WorldId } from '../config/worlds';
import { applyVariant } from '../config/worldVariant';
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
import { HazardField } from '../systems/HazardField';
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

    /** Whether this is an endless run rather than one of the twenty levels. */
    private survival = false;

    /** The seed this run was generated from, so it could be replayed. */
    private seed = 0;

    /** How many chunks have been generated, and how far the road is built to. */
    private chunksBuilt = 0;
    private builtTo = 0;

    /** Chances left, and where the last one was spent. */
    private lives = SURVIVAL_LIVES;
    private lastLifeAt: number | null = null;

    /** How the run was going when the last batch of road was laid. */
    private form = 0;

    /**
     * The one thing the game ever says, and where it is due.
     *
     * Null where this run has nothing to teach - which is every run after the
     * player has been told once, and every level that never asks for a jump.
     */
    private coach: Coach;
    private teachJumpAt: number | null = null;
    private teachMove = false;

    /** This level's forward speed, which may override the global default. */
    private forwardSpeed = FORWARD_SPEED;

    /** Distance travelled in track pixels. Everything else is placed from this. */
    private distance = 0;

    /** Stretches of this level that run at their own pace. */
    private hazardField: HazardField;

    private zones: SpeedZone[] = [];

    /** Stretches of road that cost score to be in. */
    private hazards: HazardZone[] = [];

    /**
     * Score owed to a drain zone but not yet taken, below a whole point.
     *
     * Drain is a rate over distance, so all but the shortest frames owe a
     * fraction. Kept and carried rather than rounded each frame: rounding down
     * would make a zone free on a fast machine and rounding up would make it
     * cost several times its rate, and either way the price would depend on the
     * frame rate rather than on the road.
     */
    private owed = 0;

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
    init (data: { levelIndex?: number; survival?: boolean })
    {
        this.save = new SaveSystem();

        this.survival = data?.survival === true;

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
        this.hazards = [];
        this.owed = 0;
        this.finishDistance = 1;
        this.lives = SURVIVAL_LIVES;
        this.lastLifeAt = null;
        this.form = 0;
        this.chunksBuilt = 0;
        this.builtTo = 0;

        //  Charged per level start, retries included. The menus already gate
        //  this, so failing here means Play was reached some other way - fall
        //  back to the title rather than handing out a free run.
        if (!new EnergySystem(this.save).charge())
        {
            this.scene.start('Title');

            return;
        }

        //  An endless run is an ordinary LevelSpec built a batch at a time, so
        //  everything downstream treats it exactly like one of the twenty.
        const level = this.survival ? this.beginRun() : LEVELS[this.levelIndex];

        this.forwardSpeed = level.forwardSpeed ?? FORWARD_SPEED;

        //  Recorded as the level begins, not when it ends, so quitting midway
        //  still comes back to the right place.
        this.save.setCurrentLevel(this.levelIndex);

        //  Laid out before anything that draws or collides exists, since all of
        //  them ask where a lane is.
        useLanes(level.lanes ?? DEFAULT_LANES);

        //  The world as this level asks to see it: by day for a first visit,
        //  after dark for a second.
        const world = applyVariant(WORLDS[level.world], level.variant);

        paintPageBackdrop(world);

        this.environment = new Environment(this, world);
        this.track = new TrackScroller(this, world);
        this.hazardField = new HazardField(this);
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

        if (this.survival)
        {
            this.hud.setLives(this.lives);
        }

        //  Every level now begins one mistake from the end, so the warning is
        //  on from the first frame rather than waiting for the first orb to
        //  arrive and tell it. Saying it here rather than in onOrb is the
        //  difference between a rule the player is warned about and a rule they
        //  discover by dying to it.
        this.hud.setLow(this.scoring.isLow());
        this.lowVignette.setLow(this.scoring.isLow());

        const course = buildLevel(level);

        this.zones = course.zones;
        this.hazards = course.hazards;
        this.hazardField.setZones(course.hazards);
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

        this.input.on('pointerdown', wakeAudio);
        listenForGesture();

        //  From the top with the level, and stopped with it: the soundtrack is
        //  this run's music rather than something the game leaves playing.
        startMusic();

        this.input_ = new InputSystem(
            this,
            (direction) => this.drop.moveLane(direction),
            () => { play('jump'); this.drop.jump(this.distance); },
            () => this.drop.dropDown(this.distance)
        );

        this.coach = new Coach(this);

        //  Nothing is taught twice - and it is taught in survival too. The
        //  endless run used to be exempt on the grounds that nobody meets the
        //  game there first, which is simply not true: SURVIVAL is the second
        //  button on the title screen, unlocked from the very first launch, and
        //  three of its chunks contain a row blocked across every lane by
        //  things that can only be jumped. A player who pressed it first met
        //  that row with nothing ever having mentioned the input.
        this.teachMove = !this.save.hasLearned('move');

        //  An endless run has no fixed first hurdle, so this is asked again of
        //  each batch as it is built rather than answered once here.
        this.teachJumpAt = this.save.hasLearned('jump')
            ? null
            : firstForcedJump(course, level.lanes ?? DEFAULT_LANES);

        this.pauseButton = new PauseButton(this, () => this.setPaused(true));

        this.input.keyboard?.on('keydown-ESC', () => this.setPaused(!this.paused));

        //  Freezes the run while the phone is held sideways, so turning it back
        //  does not cost the player any distance. Independent of the manual
        //  pause: that gates the update loop, this pauses the whole scene.
        new OrientationGuard(this);

        this.events.once('shutdown', () => {

            this.input_.destroy();
            stopMusic();

        });

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

        play('gate');

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

            play('orb');

            const colorId = this.drop.getColorId();

            this.effects.swallow(x, y, colorId ? COLOR_VALUES[colorId] : COLOR_FLASH);
            this.effects.haptic(HAPTIC_COLLECT_MS);
            this.drop.pulse();
            this.trail.boost(this.distance);

            showFloatingScore(this, x, y, gained);
        }
        else if (isSheltered(this.distance, this.lastLifeAt))
        {
            //  A run just put back on its feet is not charged for the row it
            //  was put back in front of. Without this a life can be spent in
            //  the moment it is granted.
            this.drop.flash(COLOR_FLASH, FLASH_DURATION);
        }
        else
        {
            const lost = this.scoring.penalise();

            play('wrong');

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
        if (this.scoring.isOut() && !this.rescue())
        {
            this.onFailed(x, y);

            return;
        }

        this.lowVignette.setLow(this.scoring.isLow());
        this.hud.setLow(this.scoring.isLow());
    }

    /**
     * Spend a life, if this is a run that has any.
     *
     * @returns whether the run carries on. False in the levels, where going
     *          under is simply the end, and false on the last life.
     */
    private rescue (): boolean
    {
        if (!this.survival)
        {
            return false;
        }

        const spent = loseLife(this.lives);

        this.lives = spent.lives;

        if (spent.score === null)
        {
            return false;
        }

        this.scoring.setScore(spent.score);
        this.lastLifeAt = this.distance;

        this.hud.setLives(this.lives);
        this.hud.setScore(this.scoring.getScore());
        this.drop.setScore(this.scoring.getScore());

        //  Loud, because a life going is the most important thing that happens
        //  in a run and it happens while the player is reading the road.
        this.cameras.main.shake(SHAKE_DURATION * 2, SHAKE_INTENSITY * 1.6);
        this.effects.haptic(HAPTIC_MISS_MS * 2);
        play('life');

        return true;
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
        play('fail');

        //  The backing stops with the run, so the phrase that ends it is the
        //  only thing playing when it lands.
        stopMusic();

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

                //  An endless run banks its score, because the score is the
                //  whole point of it - there is nothing else to take away from
                //  a mode with no finish line. A failed level banks nothing:
                //  not the score, which is zero, and not the level after it,
                //  which has to be finished for.
                if (this.survival)
                {
                    //  The peak, not the score at the end. A run ends because
                    //  it went under, so the final figure is always negative -
                    //  banking that would file every run in the game as worse
                    //  than nothing.
                    const score = this.scoring.getPeak();
                    const placed = this.save.recordSurvival(score);

                    new RunFailed(this, {
                        levelName: placed === 1 ? 'BEST SURVIVAL RUN' : 'SURVIVAL',
                        //  There is no finish to be a fraction of.
                        progress: 1,
                        scored: score,
                        placed,
                        table: this.save.getSurvivalScores(),
                        bestCombo: this.scoring.getBestCombo(),
                        bestScore: this.save.getSurvivalBest()
                    }, {
                        onRetry: () => leaveTo(this, () => this.scene.restart({ survival: true })),
                        onMenu: () => leaveTo(this, () => this.scene.start('Title'))
                    }, new EnergySystem(this.save));

                    return;
                }

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
        play('rainbow');

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

        //  Music under a paused game is the game carrying on without the
        //  player, which is exactly what pausing is for stopping.
        if (paused)
        {
            stopMusic();
        }
        else
        {
            startMusic();
        }

        if (paused)
        {
            this.pauseOverlay = new PauseOverlay(this, {
                onResume: () => this.setPaused(false),

                //  Retrying an endless run means another endless run. It used
                //  to mean level twelve, because survival leaves levelIndex on
                //  whatever the player last played and startLevel believed it.
                onRetry: () => {

                    this.abandon();

                    if (this.survival)
                    {
                        leaveTo(this, () => this.scene.restart({ survival: true }));

                        return;
                    }

                    this.startLevel(this.levelIndex);

                },

                onMenu: () => {

                    this.abandon();

                    leaveTo(this, () => this.scene.start('Title'));

                },

                //  Silencing a run without leaving it. Pause is where somebody
                //  reaches when the room changes, and until now the only way
                //  out of the sound was out of the level.
                sound: !this.save.isMuted(),

                onSound: (on) => {

                    this.save.setMuted(!on);
                    setMuted(!on);

                }
            }, new EnergySystem(this.save));

            return;
        }

        //  Rebuilt on each pause rather than hidden, so no stale overlay can be
        //  left sitting invisible over a live run.
        this.pauseOverlay?.destroy();
        this.pauseOverlay = null;
    }

    /**
     * How far into the run-in to the finish the level is, 0 to 1.
     *
     * Measured against how long the road left would take at the pace being run
     * now, rather than against a number of pixels. Ten seconds is ten seconds
     * whatever speed a level runs at, and a boost near the line should not
     * shorten the warning.
     */
    /**
     * How far into the run-in to the finish the level is, 0 to 1.
     *
     * Measured against how long the road left would take at the pace being run
     * now, rather than against a number of pixels. Ten seconds is ten seconds
     * whatever speed a level runs at, and a boost near the line should not
     * shorten the warning.
     */
    private finaleAmount (): number
    {
        const window = this.forwardSpeed * this.pace * FINALE_SECONDS;
        const left = this.finishDistance - this.distance;

        if (window <= 0)
        {
            return 0;
        }

        return Math.max(0, Math.min(1, 1 - (left / window)));
    }

    private onFinish (): void
    {
        play('finish');
        stopMusic();

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

    /**
     * Takes what the road under the drop costs to be on.
     *
     * Charged over the distance actually covered, so a zone costs the same
     * whatever the frame rate did and whatever pace the section runs at. The
     * fraction left over is carried to the next frame rather than rounded.
     */
    private chargeForGround (moved: number): void
    {
        const rate = drainAt(this.hazards, this.distance, this.drop.getColorId());

        if (rate <= 0)
        {
            return;
        }

        this.owed += (rate * moved) / 1000;

        const points = Math.floor(this.owed);

        if (points <= 0)
        {
            return;
        }

        this.owed -= points;
        this.scoring.drain(points);

        this.hud.setScore(this.scoring.getScore());
        this.drop.setScore(this.scoring.getScore());
        this.hud.setLow(this.scoring.isLow());
        this.lowVignette.setLow(this.scoring.isLow());

        //  The same end a wrong colour reaches, by the same rule: below zero is
        //  out. A zone long enough to take a run is the whole point of one.
        //  Marked at the drop rather than at an impact, because there was no
        //  impact - the road simply cost more than the run had.
        if (this.scoring.isOut() && !this.rescue())
        {
            this.onFailed(this.drop.getX(), DROP_SCREEN_Y);
        }
    }

    /**
     * The first batch of an endless run.
     *
     * Only the spec comes back here. The course is built from it in the usual
     * place, and topped up later by extendRun - which is why builtTo is
     * recorded rather than the batch being laid down twice.
     */
    private beginRun (): LevelSpec
    {
        this.seed = Math.floor(Math.random() * 0xffffffff);
        this.chunksBuilt = BATCH_CHUNKS;

        //  A world drawn at random, so two runs in a row do not look the same.
        const worlds = Object.keys(WORLDS) as WorldId[];
        const world = worlds[Math.floor(Math.random() * worlds.length)];

        const run = generateRun(this.seed, BATCH_CHUNKS, SURVIVAL_PALETTE, world);

        this.builtTo = buildLevel(run.spec).finishDistance;

        return run.spec;
    }

    /**
     * More road, when the run is getting close to the end of what it has.
     *
     * Generated from the same seed but a different starting chunk, so the run
     * keeps climbing tiers across batches rather than restarting its
     * progression every time it is topped up.
     */
    private extendRun (): void
    {
        const worlds = Object.keys(WORLDS) as WorldId[];

        //  Read once, here, and applied to the whole batch. Reading it per row
        //  would make the road twitch with every orb taken; a batch is about
        //  fifteen seconds of play, which is long enough to be a judgement
        //  about how the run is going rather than a reaction to one moment.
        this.form = formOf(this.scoring.getScore(), this.lives);

        const run = generateRun(
            this.seed + this.chunksBuilt,
            BATCH_CHUNKS,
            SURVIVAL_PALETTE,
            worlds[0],
            this.form,
            this.chunksBuilt
        );

        //  Pace comes from distance alone, never from how the run is going.
        //  A road that slowed down for a struggling player would be the most
        //  visible possible way of telling them so.
        const pace = paceAt(tierAt(this.chunksBuilt));

        for (const section of run.spec.sections)
        {
            section.rowSpacing = pace.spacing;
        }

        const batch = batchAt(run.spec, this.builtTo);

        this.course.extend(batch);

        this.hazardField.setZones([ ...this.hazards, ...batch.hazards ]);
        this.hazards = [ ...this.hazards, ...batch.hazards ];
        this.zones = [ ...this.zones, ...batch.zones ];

        //  Whether this batch is the one that first asks for a jump. A run can
        //  go a long way before a forced row turns up - the chunks that carry
        //  one are not the ones a run opens with - so the question has to be
        //  asked of every batch, not just the first. Once the lesson has been
        //  given it is recorded, and this stops asking.
        if (this.teachJumpAt === null && !this.save.hasLearned('jump'))
        {
            this.teachJumpAt = firstForcedJump(batch, run.spec.lanes ?? DEFAULT_LANES);
        }

        this.chunksBuilt += BATCH_CHUNKS;
        this.builtTo = batch.finishDistance;

        //  Keeps rising after the content has stopped changing, which is what
        //  gives an endless run an ending it earns rather than one it waits for.
        this.forwardSpeed = speedAtChunk(this.chunksBuilt);
    }

    /**
     * Says the one thing, if now is when it needs saying.
     *
     * Asked every frame rather than scheduled, because isPrompting is total and
     * a run can be restarted, paused or teleported through without this having
     * to know about any of it.
     */
    private teach (): void
    {
        //  The lane prompt rides the quiet road before the first gate, which is
        //  exactly what that stretch is there for.
        if (this.teachMove && this.distance < LEAD_IN)
        {
            this.coach.set('move');

            return;
        }

        if (this.teachMove && this.distance >= LEAD_IN)
        {
            this.teachMove = false;
            this.save.recordLesson('move');
        }

        if (this.teachJumpAt !== null && isPrompting(this.distance, this.teachJumpAt))
        {
            this.coach.set('jump');

            return;
        }

        //  Recorded once the row it was about is behind the drop, so a player
        //  who quits before reaching it is told again next time.
        if (this.teachJumpAt !== null && this.distance > this.teachJumpAt)
        {
            this.teachJumpAt = null;
            this.save.recordLesson('jump');
        }

        this.coach.set(null);
    }

    /**
     * Walking away from a run that is still going.
     *
     * An endless run banks what it reached. It has no finish line, so leaving
     * *is* how a run ends when the player does not want to lose it - and
     * throwing the score away for quitting would make deliberately crashing the
     * best way to keep one, which is a strange thing to teach.
     *
     * A level banks nothing, and should not: it has a finish, and the score is
     * for reaching it.
     */
    private abandon (): void
    {
        if (this.survival && !this.finished)
        {
            this.save.recordSurvival(this.scoring.getPeak());
        }
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

        const moved = this.forwardSpeed * this.speed.scale * this.pace * dt;

        this.distance += moved;

        //  How close the finish is, in seconds of road rather than in pixels
        //  of it: ten seconds is ten seconds whatever pace the level runs at,
        //  and a boost near the line should not shorten the run-in.
        //
        //  Survival has no finish, so it never gets one - there is nothing to
        //  announce, and announcing it anyway would be the game lying.
        setFinale(this.survival ? 0 : this.finaleAmount());


        this.chargeForGround(moved);

        //  Road is laid well before the player could see where it starts.
        if (this.survival && this.distance > this.builtTo - BATCH_AHEAD)
        {
            this.extendRun();
        }

        //  The camera pulls back a little when the road speeds up, which is the
        //  oldest trick there is for making speed felt rather than measured.
        //  Eased on its own, slower than the pace, so it lags the change and
        //  reads as a reaction to it.
        const target = 1 - ((1 - BOOST_ZOOM) * Math.max(0, this.pace - 1));

        this.cameras.main.setZoom(easeTowards(this.cameras.main.zoom, target, BOOST_ZOOM_SMOOTHING, dt));

        this.teach();

        this.environment.update(this.distance, delta);
        this.track.update(this.distance);
        this.hazardField.update(this.distance);
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
