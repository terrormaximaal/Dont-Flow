import { ColorId, DEFAULT_LANES } from './constants';
import { WorldId } from './worlds';

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
export type ObstacleKind =
    /** Sits in its lane. */
    | 'static'
    /** Slides across the track, forcing the lane change to be timed. */
    | 'slider'
    /** Holds its lane but breathes in and out, narrowing the safe gap. */
    | 'pulse';

// ---------------------------------------------------------------------------
//  Authored level format
// ---------------------------------------------------------------------------

export interface SectionSpec
{
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

    /** How obstacles in this section behave. Defaults to static. */
    obstacles?: ObstacleKind;

    /**
     * One string per row, one character per lane:
     *
     *   '.'      empty
     *   '1'-'5'  an orb of that palette colour
     *   'a'-'e'  an obstacle of that palette colour
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
}

export interface Level
{
    gates: GatePairSpec[];
    orbs: OrbSpec[];
    obstacles: ObstacleSpec[];
    finishDistance: number;
}

const ORB_CHARS = '12345';
const OBSTACLE_CHARS = 'abcde';

/**
 * Expands an authored level into flat lists with absolute distances.
 */
export function buildLevel (spec: LevelSpec): Level
{
    const rowSpacing = spec.rowSpacing ?? ORB_ROW_SPACING;
    const lanes = spec.lanes ?? DEFAULT_LANES;

    const gates: GatePairSpec[] = [];
    const orbs: OrbSpec[] = [];
    const obstacles: ObstacleSpec[] = [];

    const colorAt = (index: number): ColorId => spec.palette[index] ?? spec.palette[0];

    let cursor = LEAD_IN;
    let lastRowDistance = cursor;

    for (const section of spec.sections)
    {
        gates.push({
            distance: cursor,
            splitAfterLane: section.splitAfterLane,
            colors: [ colorAt(section.gate[0]), colorAt(section.gate[1]) ]
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
                        kind: section.obstacles ?? 'static'
                    });
                }
            }

            lastRowDistance = rowDistance;
            rowDistance += rowSpacing;
        }

        cursor = lastRowDistance + SECTION_GAP;
    }

    return {
        gates,
        orbs,
        obstacles,
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

        if (character === undefined || character === '.' || ORB_CHARS.includes(character))
        {
            return true;
        }
    }

    return false;
}
