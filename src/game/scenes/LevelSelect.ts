import { Scene } from 'phaser';
import {
    BUTTON_HEIGHT,
    COLOR_HUD_DIM,
    COLOR_HUD_TEXT,
    DEPTH_HUD,
    GAME_WIDTH,
    HUD_FONT,
    MENU_ENERGY_Y,
    MENU_HEADING_SIZE,
    MENU_HEADING_Y,
    MENU_KICKER_WIDTH,
    MENU_KICKER_Y,
    MENU_PROGRESS_SIZE,
    MENU_PROGRESS_Y,
    ROUTE_DETAIL_OFFSET,
    ROUTE_DETAIL_SIZE,
    ROUTE_DONE_ALPHA,
    ROUTE_ENTER_FROM,
    ROUTE_ENTER_MS,
    ROUTE_DRAG_SLOP,
    ROUTE_LINE_GLOW,
    ROUTE_LINE_STEPS,
    ROUTE_LINE_WIDTH,
    ROUTE_LOCKED_ALPHA,
    ROUTE_MOTE_ALPHA,
    ROUTE_MOTE_RADIUS,
    ROUTE_MOTE_SECONDS,
    ROUTE_MOTES,
    ROUTE_NEXT_PULSE,
    ROUTE_NEXT_PULSE_MS,
    ROUTE_NODE_RADIUS,
    ROUTE_NUMBER_SIZE,
    ROUTE_PRESS_MS,
    ROUTE_PRESS_SCALE
} from '../config/constants';
import { LEVELS } from '../config/levels';
import { MENU_SKY_LOW, MENU_SKY_TOP } from '../config/menuTheme';
import { WORLDS } from '../config/worldData';
import { applyVariant } from '../config/worldVariant';
import { EnergySystem } from '../systems/EnergySystem';
import { MenuSky } from '../systems/MenuSky';
import { startMenuMusic } from '../systems/Music';
import { paintPageColors } from '../systems/PageBackdrop';
import { SaveSystem } from '../systems/SaveSystem';
import { energyChanged } from '../systems/energyWatch';
import { mixColor } from '../utils/color';
import { Button } from '../ui/Button';
import { arrive, leaveTo } from '../ui/transition';
import { EnergyMeter } from '../ui/EnergyMeter';
import {
    edgeFade,
    isReached,
    isStartable,
    ROUTE_BACK_Y,
    routePoint,
    ROUTE_ENTER_STAGGER,
    routeScrollRange,
    scrollToShow,
    stopAt,
    Stop,
    stopState
} from '../ui/route';
import { drawPadlock, drawWorldBead } from '../ui/worldBead';

/**
 * The levels, laid out as a route rather than a grid.
 *
 * A grid says "here is a list of ten things". A route says "here is a journey,
 * and you have come this far along it", which is what this screen is actually
 * for.
 *
 * Each stop is a window onto the world its level is played in - that world's
 * own sky over that world's own ground - so the route doubles as a preview of
 * where the game goes. The eye reads the places changing from the first stop to
 * the last before it reads a single number.
 *
 * Nothing is labelled that does not need to be. A locked stop wears a padlock
 * instead of the word LOCKED, and a stop with no score to report says nothing
 * at all, which leaves the only text on the screen being text worth reading.
 *
 * A locked stop is built inert rather than live and refusing, so there is no
 * state in which it can start a level.
 */
export class LevelSelect extends Scene
{
    private sky: MenuSky;
    private meter: EnergyMeter;

    /** The light travelling along the walked route, redrawn each frame. */
    private motes: Phaser.GameObjects.Graphics;

    /** The line joining the stops, repainted whenever the route scrolls. */
    private line: Phaser.GameObjects.Graphics;

    /** How far along the route each level's unlock reaches, for repainting. */
    private furthest = 0;

    /** How much of the route has been walked, 0 to 1. */
    private walked = 0;

    /** Everything that moves when the route is dragged. */
    private scroller: Phaser.GameObjects.Container;

    /**
     * The stops, with the hit area belonging to each one that has a level to
     * start. Kept so both can be faded out together as they reach the edge of
     * the view - a stop that is invisible but still tappable is worse than one
     * that was never hidden.
     */
    private fading: Array<{
        node: Phaser.GameObjects.Container;
        hit?: Phaser.GameObjects.Arc;
    }> = [];

    /** Where the scroll currently sits, and where a drag started from. */
    private scroll = 0;
    private dragFrom = 0;
    private dragAt = 0;
    private dragging = false;

    private elapsed = 0;

    /**
     * The energy system this screen was built against, and the answer it gave.
     *
     * Held so the screen can notice the wait ending. A stop only gets a hit
     * area if it was startable when it was built, so without this a player who
     * waits out the countdown here is left on a screen where nothing can be
     * tapped, however much energy they now have.
     */
    private energy: EnergySystem;
    private couldPlay = false;

    /** Where the route was left, so refreshing does not throw the scroll away. */
    private openAt: number | null = null;

    constructor ()
    {
        super('LevelSelect');
    }

    init (data: { scroll?: number })
    {
        this.openAt = data?.scroll ?? null;
    }

    create ()
    {
        //  The same place the title screen is, so moving between them reads as
        //  turning around rather than as travelling.
        paintPageColors(MENU_SKY_TOP, MENU_SKY_LOW);

        this.sky = new MenuSky(this);
        this.elapsed = 0;
        this.fading = [];

        const save = new SaveSystem();
        const energy = new EnergySystem(save);
        const furthest = save.getFurthestLevel();
        const canPlay = energy.mayStart();

        this.energy = energy;
        this.couldPlay = canPlay;

        this.walked = LEVELS.length > 1 ? furthest / (LEVELS.length - 1) : 0;

        this.buildHeading(furthest);

        this.meter = new EnergyMeter(this, MENU_ENERGY_Y, energy);

        //  The route is longer than the screen, so it lives in a container that
        //  moves. The heading and the way out stay fixed to the frame: a BACK
        //  button that scrolled away with the levels would be a screen a phone
        //  cannot leave.
        this.scroller = this.add.container(0, 0);
        this.scroller.setDepth(DEPTH_HUD - 4);

        const stops = LEVELS.map((_, index) => stopAt(index, LEVELS.length));

        this.furthest = furthest;

        this.line = this.add.graphics();
        this.line.setDepth(DEPTH_HUD - 3);
        this.scroller.add(this.line);

        this.motes = this.add.graphics();
        this.motes.setDepth(DEPTH_HUD - 2);
        this.scroller.add(this.motes);

        LEVELS.forEach((level, index) => {

            this.buildStop(stops[index], index, level.world, save, furthest, canPlay);

        });

        //  Opened on the level the player is up to, not on the first one -
        //  which after fifteen levels is a long way from where they are. Unless
        //  the screen is being rebuilt under the player, in which case it opens
        //  exactly where they left it: a route that jumped back to the start
        //  because energy arrived would be a worse answer than not noticing.
        this.scrollTo(this.openAt ?? -scrollToShow(furthest, LEVELS.length));

        this.enableDrag();

        //  The same ghost pill the home screen uses. This screen shares the
        //  menu's sky and is one tap from it, so a grey slab here against a
        //  pill there reads as two different games rather than two screens.
        const back = new Button(this, {
            x: GAME_WIDTH / 2,
            y: ROUTE_BACK_Y,
            label: 'BACK',
            variant: 'ghost',
            radius: BUTTON_HEIGHT / 2,
            onPress: () => leaveTo(this, () => this.scene.start('Title'))
        });

        back.container.setDepth(DEPTH_HUD);

        this.input.keyboard?.once('keydown-ESC', () => leaveTo(this, () => this.scene.start('Title')));

        //  Started but never stopped. The title screen plays the same piece,
        //  so walking between the two leaves it alone entirely - a run is the
        //  only thing that interrupts it.
        startMenuMusic();

        arrive(this);
    }

    /**
     * The heading, and how far along the game the player is.
     *
     * A kicker rule over a tracked-out line, which is the same mark the home
     * screen carries - two screens one tap apart should be set the same way.
     * The count underneath is the one piece of information this screen owns
     * that no stop can say on its own.
     */
    private buildHeading (furthest: number): void
    {
        const rule = this.add.graphics();

        rule.setDepth(DEPTH_HUD);
        rule.fillStyle(0xbfe8ff, 0.8);
        rule.fillRect((GAME_WIDTH - MENU_KICKER_WIDTH) / 2, MENU_KICKER_Y, MENU_KICKER_WIDTH, 2);

        rule.fillStyle(0x7a4bff, 0.2);
        rule.fillRect((GAME_WIDTH - (MENU_KICKER_WIDTH * 0.84)) / 2, MENU_KICKER_Y + 1, MENU_KICKER_WIDTH * 0.84, 4);

        const heading = this.add.text(GAME_WIDTH / 2, MENU_HEADING_Y, 'SELECT LEVEL', {
            fontFamily: HUD_FONT,
            fontSize: MENU_HEADING_SIZE,
            color: COLOR_HUD_TEXT
        });

        heading.setOrigin(0.5);
        heading.setDepth(DEPTH_HUD);
        heading.setLetterSpacing(6);

        const progress = this.add.text(
            GAME_WIDTH / 2,
            MENU_PROGRESS_Y,
            `${Math.min(furthest + 1, LEVELS.length)} OF ${LEVELS.length} OPEN`,
            {
                fontFamily: HUD_FONT,
                fontSize: MENU_PROGRESS_SIZE,
                color: COLOR_HUD_DIM
            }
        );

        progress.setOrigin(0.5);
        progress.setDepth(DEPTH_HUD);
        progress.setLetterSpacing(3);
    }

    /**
     * The line joining the stops.
     *
     * Drawn in short steps rather than as one path, because each step carries
     * its own colour and alpha: the route is lit in the colours of the levels
     * it runs between, and goes dark past the furthest one reached.
     */
    private drawRoute (furthest: number): void
    {
        const gfx = this.line;
        const span = LEVELS.length - 1;

        gfx.clear();

        for (let i = 0; i < span; i++)
        {
            //  A segment is walked if its far end is unlocked.
            const walked = i + 1 <= furthest;

            const from = tint(i);
            const to = tint(i + 1);

            for (let step = 0; step < ROUTE_LINE_STEPS; step++)
            {
                //  Sampled from the same curve the stops are placed on, so the
                //  line passes exactly through each one rather than near it.
                const a = routePoint((i + (step / ROUTE_LINE_STEPS)) / span);
                const b = routePoint((i + ((step + 1) / ROUTE_LINE_STEPS)) / span);

                const color = mixColor(from, to, step / ROUTE_LINE_STEPS);

                //  Faded towards the edges of the view on the same curve the
                //  stops are, so the line dissolves into the heading rather
                //  than running across it. Repainted as the route scrolls,
                //  because where a segment sits on screen is what decides this
                //  and that changes with every drag.
                const seen = edgeFade(((a.y + b.y) / 2) + this.scroll);

                if (seen <= 0)
                {
                    continue;
                }

                const alpha = (walked ? ROUTE_DONE_ALPHA : ROUTE_LOCKED_ALPHA) * seen;

                //  A wide, faint pass under a narrow bright one, which is what
                //  makes a line read as lit rather than as drawn. The unwalked
                //  part gets neither the glow nor the width: it is a route that
                //  exists rather than a route that is running.
                if (walked)
                {
                    gfx.lineStyle(ROUTE_LINE_WIDTH + (ROUTE_LINE_GLOW * 2), color, alpha * 0.18);
                    gfx.lineBetween(a.x, a.y, b.x, b.y);
                }

                gfx.lineStyle(walked ? ROUTE_LINE_WIDTH : ROUTE_LINE_WIDTH * 0.45, color, alpha);
                gfx.lineBetween(a.x, a.y, b.x, b.y);
            }
        }
    }

    /** One stop: its world, its number, and what it has to say. */
    private buildStop (
        stop: Stop,
        index: number,
        world: keyof typeof WORLDS,
        save: SaveSystem,
        furthest: number,
        canPlay: boolean
    ): void
    {
        const state = stopState(index, furthest, canPlay);
        const unlocked = isReached(state);
        const spec = applyVariant(WORLDS[world], LEVELS[index].variant);

        //  Everything about one stop lives in a container, so it can be scaled
        //  as a piece - which is what the arrival and the press both need, and
        //  what the old version could not do with four loose objects.
        const node = this.add.container(stop.x, stop.y);

        node.setDepth(DEPTH_HUD - 1);
        this.scroller.add(node);

        //  Two containers, not one. The outer carries the stop's place on the
        //  route and how far it has faded towards the edge of the view; the
        //  inner carries the arrival and the press. Held apart because both are
        //  a scale and an alpha, and a fade recomputed every frame would
        //  otherwise overwrite the arrival tween mid-flight.
        const inner = this.add.container(0, 0);

        node.add(inner);

        const gfx = this.add.graphics();

        drawWorldBead(gfx, 0, 0, ROUTE_NODE_RADIUS, spec, !unlocked);
        inner.add(gfx);

        if (unlocked)
        {
            const number = this.add.text(0, 0, LEVELS[index].name, {
                fontFamily: HUD_FONT,
                fontSize: ROUTE_NUMBER_SIZE,
                color: spec.hudText
            });

            number.setOrigin(0.5);
            number.setShadow(0, 0, spec.hudStroke, 6, true, true);
            inner.add(number);
        }
        else
        {
            const lock = this.add.graphics();

            drawPadlock(lock, 0, 0, ROUTE_NODE_RADIUS * 0.52, 0xffffff, 0.34);
            inner.add(lock);
        }

        //  Only what is worth saying. A best score is information; "NOT PLAYED"
        //  and "LOCKED" are the absence of it, and printing the absence nine
        //  times down one side of a screen is how a list becomes a wall.
        //
        //  The word BEST stays, though. Trimming it left bare four-figure
        //  numbers floating beside the beads, which could as easily have been
        //  distances or level ids - and it is the same wording the completion
        //  panel uses, so a player has already met it.
        const best = unlocked ? save.getBestScore(index) : null;

        if (best !== null)
        {
            const label = this.add.text(
                stop.side * ROUTE_DETAIL_OFFSET,
                0,
                `BEST ${best}`,
                {
                    fontFamily: HUD_FONT,
                    fontSize: ROUTE_DETAIL_SIZE,
                    color: COLOR_HUD_TEXT
                }
            );

            //  Anchored on the edge nearest its stop, so the text grows
            //  outwards and can never reach across the route.
            label.setOrigin(stop.side < 0 ? 1 : 0, 0.5);
            label.setAlpha(0.85);
            inner.add(label);
        }

        this.enterStop(inner, index);

        this.fading.push({ node });

        if (!isStartable(state))
        {
            return;
        }

        //  The next one to play breathes, so the screen answers "where was I"
        //  before it is read.
        if (state === 'next')
        {
            this.markNext(node, spec.trackEdge);
        }

        //  A circle carries the press, sized past the disc so a thumb does not
        //  have to be accurate.
        const hit = this.add.circle(stop.x, stop.y, ROUTE_NODE_RADIUS + 12, 0x000000, 0);

        hit.setDepth(DEPTH_HUD);
        hit.setInteractive({ useHandCursor: true });
        this.scroller.add(hit);

        //  The mask hides a stop; it does not stop it being tapped. Without
        //  pairing the hit area to the fade, the levels scrolled off the top of
        //  the view would still start from a tap on the heading.
        this.fading[this.fading.length - 1].hit = hit;

        hit.on('pointerup', () => {

            //  A drag that moved is a scroll, not a tap. Without this the
            //  level under the thumb starts the moment the player lets go of a
            //  flick, which is the single most annoying thing a scrolling list
            //  can do.
            if (Math.abs(this.dragAt - this.dragFrom) > ROUTE_DRAG_SLOP)
            {
                return;
            }

            //  Dips under the thumb before the screen washes out. Without it
            //  the tap has no answer at all until the fade starts, which on a
            //  slow frame reads as a press that did not register.
            this.tweens.add({
                targets: inner,
                scale: ROUTE_PRESS_SCALE,
                duration: ROUTE_PRESS_MS,
                ease: 'Quad.Out'
            });

            leaveTo(this, () => this.scene.start('Play', { levelIndex: index }));

        });
    }

    /**
     * Dragging the route up and down.
     *
     * Taken on the scene rather than on a background rectangle, so a drag that
     * starts on a bead scrolls like any other - a list where the gaps scroll
     * and the items do not is a list that feels broken.
     */
    private enableDrag (): void
    {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {

            this.dragging = true;
            this.dragFrom = pointer.y;
            this.dragAt = pointer.y;

        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {

            if (!this.dragging)
            {
                return;
            }

            this.scrollTo(this.scroll + (pointer.y - this.dragAt));
            this.dragAt = pointer.y;

        });

        this.input.on('pointerup', () => { this.dragging = false; });
        this.input.on('pointerupoutside', () => { this.dragging = false; });
    }

    /** Clamped, because scrolling past the last stop into empty space is how a
     *  list stops feeling like a place. */
    private scrollTo (y: number): void
    {
        this.scroll = Math.max(-routeScrollRange(), Math.min(0, y));
        this.scroller.y = this.scroll;

        //  Recomputed here rather than every frame: the fade depends on nothing
        //  but the scroll, and the scroll only moves when this is called.
        this.drawRoute(this.furthest);

        for (const { node, hit } of this.fading)
        {
            const fade = edgeFade(node.y + this.scroll);

            node.setAlpha(fade);
            hit?.setActive(fade > 0);

            if (hit?.input)
            {
                hit.input.enabled = fade > 0;
            }
        }
    }

    /** A ring breathing around the stop the player is up to. */
    private markNext (node: Phaser.GameObjects.Container, color: number): void
    {
        const ring = this.add.graphics();

        //  Carried by the stop rather than laid over the route, so it fades
        //  with its bead instead of pulsing on alone at the edge of the view.
        ring.lineStyle(2.5, mixColor(color, 0xffffff, 0.5), 0.9);
        ring.strokeCircle(0, 0, ROUTE_NODE_RADIUS + ROUTE_NEXT_PULSE);
        node.add(ring);

        this.tweens.add({
            targets: ring,
            scale: 1.18,
            alpha: 0.1,
            duration: ROUTE_NEXT_PULSE_MS,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    /**
     * A stop arriving.
     *
     * Staggered down the route in the order it is walked, so the screen builds
     * itself along the journey rather than appearing all at once - the same
     * argument the home screen's arrival makes, and the reason this one is
     * ordered by index rather than by anything on screen.
     */
    private enterStop (node: Phaser.GameObjects.Container, index: number): void
    {
        node.setScale(ROUTE_ENTER_FROM);
        node.setAlpha(0);

        this.tweens.add({
            targets: node,
            scale: 1,
            alpha: 1,
            duration: ROUTE_ENTER_MS,
            delay: index * ROUTE_ENTER_STAGGER,
            ease: 'Back.Out'
        });
    }

    /**
     * Light running along the part of the route already walked.
     *
     * The one piece of ambient movement on the screen, and the right one: the
     * game is named after flow, so what moves is the path the player has
     * flowed along. Nothing past the furthest level moves at all, which draws
     * the line between reached and not without a label.
     */
    private drawMotes (): void
    {
        this.motes.clear();

        if (this.walked <= 0)
        {
            return;
        }

        for (let i = 0; i < ROUTE_MOTES; i++)
        {
            //  Each runs the walked stretch on its own phase, so they arrive
            //  spread out rather than in a pack.
            const phase = ((this.elapsed / ROUTE_MOTE_SECONDS) + (i / ROUTE_MOTES)) % 1;
            const point = routePoint(phase * this.walked);

            //  Fading in and out at both ends of the run, so none of them pops
            //  into being at the first stop or vanishes at the furthest.
            const fade = Math.min(1, Math.min(phase, 1 - phase) * 5);

            this.motes.fillStyle(0xffffff, ROUTE_MOTE_ALPHA * fade * 0.35);
            this.motes.fillCircle(point.x, point.y, ROUTE_MOTE_RADIUS * 2.1);

            this.motes.fillStyle(0xffffff, ROUTE_MOTE_ALPHA * fade);
            this.motes.fillCircle(point.x, point.y, ROUTE_MOTE_RADIUS);
        }
    }

    update (_time: number, delta: number)
    {
        this.elapsed += delta / 1000;

        this.sky.update(delta);
        this.meter.update();
        this.drawMotes();

        //  The moment the wait ends. Rebuilt rather than patched in place,
        //  because what changes is not a label but whether every stop on the
        //  route has a hit area at all - and the scroll is carried across so
        //  the screen comes back exactly where it was.
        if (energyChanged(this.energy, this.couldPlay))
        {
            this.scene.restart({ scroll: this.scroll });
        }
    }
}

/**
 * The colour the route wears as it runs into a level.
 *
 * The world's own road-edge glow rather than the first colour in its palette.
 * The palette colours are the orbs and gates - the loudest things in the game -
 * and a line drawn in ten of them fought the beads it was meant to be joining.
 * The edge colours are what that world's road is lit with, they are already
 * what each bead's ring is drawn in, and the line and the ring meeting in the
 * same colour is what makes the route look like one object.
 */
function tint (index: number): number
{
    const level = LEVELS[index];

    //  Through the variant, like the bead it runs into - a night level's road
    //  is lit brighter than its daytime self, and the route has to agree.
    return applyVariant(WORLDS[level.world], level.variant).trackEdge;
}
