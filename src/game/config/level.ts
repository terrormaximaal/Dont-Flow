import { ColorId, DEFAULT_LANES } from './constants';
import { WorldId } from './worlds';
import { WorldVariant } from './worldVariant';

//  The shape of a course, and how an authored level is expanded into one.
//  The levels themselves live in `levels.ts` - this file is the format, not the
//  content.
//
//  Distances are in track pixels. Nothing here is a screen position: a course is
//  a line the drop travels along, and the renderer works out where each piece
//  currently sits.

// ---------------------------------------------------------------------------
//  Default spacing
// ---------------------------------------------------------------------------

/** Quiet run before the first gate, so the player can find the controls. */
export const LEAD_IN = 900;

/** Gap between a gate and the first row that follows it. */
export const GATE_TO_ORBS = 260;

/** Default gap between rows. */
export const ORB_ROW_SPACING = 175;

/** Gap between the last row of a section and the next gate. */
export const SECTION_GAP = 420;

/** Gap between the last row of the course and the finish gate. */
export const FINISH_GAP = 520;

// ---------------------------------------------------------------------------
//  Obstacles
// ---------------------------------------------------------------------------

/**
 * How an obstacle behaves. Introduced a kind at a time as the levels progress,
 * so no single level asks the player to read something they have not met.
 */
/**
 * Whether a barrier can be cleared from above.
 *
 * 'low' is the one that needs the jump. Kept separate from the kind rather than
 * folded into it, because every kind of movement should be able to be low: a
 * slider that must be jumped is a different problem from a static one that must
 * be, and both are worth having.
 */
export type ObstacleProfile =
    /** A wall. Passed only by carrying its colour; cannot be jumped. */
    | 'full'
    /** A hurdle. Passed by carrying its colour, or by being above it. */
    | 'low'
    /**
     * A hole in the road. Passed only by being above it.
     *
     * The first hazard in the game that colour has nothing to do with, which
     * is the point of it: every other thing on the road is a question about
     * which colour you are carrying, and this one is a question about where
     * you are and when.
     */
    | 'gap';

export type ObstacleKind =
    /** Sits in its lane. */
    | 'static'
    /** Slides across the track, forcing the lane change to be timed. */
    | 'slider'
    /** Holds its lane but breathes in and out, narrowing the safe gap. */
    | 'pulse'
    /**
     * A bar turning about its lane.
     *
     * Wide across the road when broadside and barely there edge-on, so it is
     * answered by arriving while it is turned away rather than by going round
     * it. Never covers the whole road: see ROTOR_REACH.
     */
    | 'rotor'
    /**
     * There, then not there, then there again.
     *
     * The only kind that is ever absent. Paired with the 'gap' profile it is a
     * disappearing floor - the road itself coming and going - which is the one
     * obstacle in the game that is neither a colour question nor a lane one.
     */
    | 'blinker';

// ---------------------------------------------------------------------------
//  Authored level format
// ---------------------------------------------------------------------------

export interface SectionSpec
{
    /**
     * How far apart this section's rows sit, overriding the level's own.
     *
     * The other half of a section's intensity. Speed is how fast the road
     * comes; this is how much is on it - and a finale that packs its rows
     * tighter asks more of the player without the level having to get faster,
     * which is a different feeling and a more controllable one.
     */
    rowSpacing?: number;

    /**
     * Multiplier on the level's forward speed through this section.
     *
     * Left out means 1, which is every section written before this existed.
     * A short burst above 1 is what makes a level have a shape rather than a
     * tempo - and it costs nothing to read, because the road itself tells the
     * player it has happened.
     */
    speed?: number;

    /**
     * The lane boundary the two gates meet on. 0 splits after the first lane,
     * 1 after the second.
     *
     * Three lanes and two gates cannot split down the middle without leaving
     * the centre lane straddling both, so the split sits on a lane boundary.
     */
    splitAfterLane: 0 | 1;

    /** Gate colours, as indices into the level's palette. */
    gate: [ number, number ];

    /**
     * Whether this section's gate trades its colours as the drop approaches.
     *
     * The one hazard in the game that is not on the road. Introduced late and
     * alone, like every other kind, and marked on the doorway itself so it can
     * be recognised before it does anything.
     */
    gateSwap?: boolean;

    /** How obstacles in this section behave. Defaults to static. */
    obstacles?: ObstacleKind;

    /**
     * One string per row, one character per lane:
     *
     *   '.'      empty
     *   '1'-'5'  an orb of that palette colour
     *   'a'-'e'  an obstacle of that palette colour
     *   '*'      a rainbow drop: matches everything for a while
     *
     * Every row must leave at least one lane that is safe to be in: empty, or
     * holding an orb the drop can already match. A row with no way through
     * would take points for a mistake the player could not avoid.
     */
    rows: string[];
}

export interface LevelSpec
{
    /** Shown in the HUD and on the completion panel. */
    name: string;

    /** Which environment this level is played in. */
    world: WorldId;

    /**
     * The world seen under different light, for a level that revisits one.
     *
     * Twenty levels across ten worlds, so every world is played twice. The
     * second visit is always the harder one, and always after dark.
     */
    variant?: WorldVariant;

    /**
     * How many lanes the road carries, and so how many characters each of this
     * level's rows must have. Defaults to three.
     *
     * Two makes a level markedly gentler without slowing anything down: the
     * road stays the same width, so the lanes are half again as wide, and there
     * is only ever one direction to go. The early levels use it to teach the
     * colour rule before asking the player to choose a lane as well.
     */
    lanes?: 2 | 3;

    /**
     * The colours in play, most important first. Gates and rows refer to these
     * by position, so a level's identity can be re-tinted in one place.
     */
    palette: ColorId[];

    /** Overrides FORWARD_SPEED for this level. */
    forwardSpeed?: number;

    /** Overrides ORB_ROW_SPACING for this level. */
    rowSpacing?: number;

    sections: SectionSpec[];
}

// ---------------------------------------------------------------------------
//  Compiled course
// ---------------------------------------------------------------------------

export interface GatePairSpec
{
    distance: number;
    splitAfterLane: 0 | 1;
    colors: [ ColorId, ColorId ];

    /** Whether this pair trades its two colours on the way in. */
    swap?: boolean;
}

export interface OrbSpec
{
    distance: number;
    lane: number;
    color: ColorId;
}

export interface ObstacleSpec
{
    distance: number;
    lane: number;
    color: ColorId;
    kind: ObstacleKind;
    profile: ObstacleProfile;
}

/** A rainbow drop waiting to be picked up. It has no colour: that is the point. */
export interface PowerUpSpec
{
    distance: number;
    lane: number;
}

export interface Level
{
    gates: GatePairSpec[];
    orbs: OrbSpec[];
    obstacles: ObstacleSpec[];
    powerUps: PowerUpSpec[];

    /** Stretches of road the drop moves through faster or slower than usual. */
    zones: SpeedZone[];

    finishDistance: number;
}

/**
 * A stretch of course with its own pace.
 *
 * Held as distances rather than as a flag on each section, because what the
 * game needs to ask at any moment is "how fast am I going *here*", and here is
 * a distance. A level with no zones behaves exactly as it did before they
 * existed: the lookup returns 1.
 */
export interface SpeedZone
{
    from: number;
    to: number;

    /** Multiplier on the level's own forward speed. */
    speed: number;
}

/**
 * How fast the course is running at a point on it.
 *
 * Pure, and total: any distance has an answer, including one past the finish
 * or before the start.
 */
export function speedAt (zones: SpeedZone[], distance: number): number
{
    for (const zone of zones)
    {
        if (distance >= zone.from && distance < zone.to)
        {
            return zone.speed;
        }
    }

    return 1;
}

const ORB_CHARS = '12345';
const OBSTACLE_CHARS = 'abcde';

/** The same barriers, low enough to jump. */
const HURDLE_CHARS = 'ABCDE';

/**
 * A hole in the road. No colour, because colour does not save you from one.
 *
 * Zero rather than a letter: the orbs are 1-5, so a gap reads as "nothing
 * here" on the same scale, which is what it is.
 */
const GAP_CHAR = '0';
export const RAINBOW_CHAR = '*';

/**
 * Expands an authored level into flat lists with absolute distances.
 */
export function buildLevel (spec: LevelSpec): Level
{
    const levelRowSpacing = spec.rowSpacing ?? ORB_ROW_SPACING;
    const lanes = spec.lanes ?? DEFAULT_LANES;

    const gates: GatePairSpec[] = [];
    const orbs: OrbSpec[] = [];
    const obstacles: ObstacleSpec[] = [];
    const powerUps: PowerUpSpec[] = [];

    const colorAt = (index: number): ColorId => spec.palette[index] ?? spec.palette[0];

    const zones: SpeedZone[] = [];

    let cursor = LEAD_IN;
    let lastRowDistance = cursor;

    for (const section of spec.sections)
    {
        const sectionStart = cursor;
        const rowSpacing = section.rowSpacing ?? levelRowSpacing;

        gates.push({
            distance: cursor,
            splitAfterLane: section.splitAfterLane,
            colors: [ colorAt(section.gate[0]), colorAt(section.gate[1]) ],
            swap: section.gateSwap
        });

        let rowDistance = cursor + GATE_TO_ORBS;

        for (const row of section.rows)
        {
            for (let lane = 0; lane < lanes; lane++)
            {
                const character = row[lane];

                if (character === undefined || character === '.')
                {
                    continue;
                }

                if (character === RAINBOW_CHAR)
                {
                    powerUps.push({ distance: rowDistance, lane });

                    continue;
                }

                const orbIndex = ORB_CHARS.indexOf(character);

                if (orbIndex >= 0)
                {
                    orbs.push({ distance: rowDistance, lane, color: colorAt(orbIndex) });

                    continue;
                }

                const obstacleIndex = OBSTACLE_CHARS.indexOf(character);

                if (obstacleIndex >= 0)
                {
                    obstacles.push({
                        distance: rowDistance,
                        lane,
                        color: colorAt(obstacleIndex),
                        kind: section.obstacles ?? 'static',
                        profile: 'full'
                    });

                    continue;
                }

                //  The same letters in capitals: the same barrier, low enough
                //  to jump. One character apart on purpose - a row of hurdles
                //  should read as a row of barriers at a glance, because that
                //  is what it is.
                if (character === GAP_CHAR)
                {
                    obstacles.push({
                        distance: rowDistance,
                        lane,
                        //  Carried but never read: a gap is not a colour
                        //  question. Kept on the spec so every obstacle has the
                        //  same shape rather than an optional field that only
                        //  one profile ever fills in.
                        color: colorAt(0),
                        //  A hole moves if its section says the obstacles do.
                        //  It used to be pinned to its lane whatever the
                        //  section asked for, which quietly made a sliding
                        //  hole - a hole you have to time rather than step
                        //  around - impossible to author at all.
                        kind: section.obstacles ?? 'static',
                        profile: 'gap'
                    });

                    continue;
                }

                const hurdleIndex = HURDLE_CHARS.indexOf(character);

                if (hurdleIndex >= 0)
                {
                    obstacles.push({
                        distance: rowDistance,
                        lane,
                        color: colorAt(hurdleIndex),
                        kind: section.obstacles ?? 'static',
                        profile: 'low'
                    });
                }
            }

            lastRowDistance = rowDistance;
            rowDistance += rowSpacing;
        }

        //  A section that asks for a pace claims the road it occupies, from
        //  its gate through to its last row. Claimed after the rows are walked,
        //  because that is when the section's end is known.
        if (section.speed !== undefined && section.speed !== 1)
        {
            zones.push({ from: sectionStart, to: lastRowDistance, speed: section.speed });
        }

        cursor = lastRowDistance + SECTION_GAP;
    }

    return {
        gates,
        orbs,
        obstacles,
        powerUps,
        zones,
        finishDistance: lastRowDistance + FINISH_GAP
    };
}

/**
 * Whether a row leaves somewhere safe to be.
 *
 * A lane is safe if it is empty or holds an orb; an obstacle is only safe if
 * the drop happens to match it, which cannot be known while authoring. So a row
 * of nothing but obstacles is unfair by construction.
 */
export function rowHasSafeLane (row: string): boolean
{
    //  Walked over the row's own length rather than a fixed lane count: a row
    //  has one character per lane, so it already knows how wide its level is.
    for (let lane = 0; lane < row.length; lane++)
    {
        const character = row[lane];

        //  A rainbow drop is safe for the same reason an orb is: at worst it
        //  costs nothing, and it is never a blocked route.
        if (character === undefined
            || character === '.'
            || character === RAINBOW_CHAR
            || ORB_CHARS.includes(character))
        {
            return true;
        }

        //  A hurdle or a hole is a way through as well, just not a sideways
        //  one. This is what the jump bought: a row with no gap in it used to
        //  be a row the player could be trapped by, and now it is a row they
        //  go over.
        //
        //  Widening the rule rather than dropping it. The thing being guarded
        //  is still "every row has a way through", which is the invariant that
        //  matters; the jump only added a second kind of way.
        if (HURDLE_CHARS.includes(character) || character === GAP_CHAR)
        {
            return true;
        }
    }

    return false;
}
