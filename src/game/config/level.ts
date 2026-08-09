import { ColorId, LANE_COUNT } from './constants';

//  The shape of a course, and how an authored level is expanded into one.
//  The levels themselves live in `levels.ts` - this file is the format, not the
//  content.
//
//  Distances are in track pixels. Nothing here is a screen position: a course is
//  a line the drop travels along, and the renderer works out where each piece
//  currently sits.

// ---------------------------------------------------------------------------
//  Default spacing
//
//  A level may override the row spacing to tighten or loosen its rhythm; the
//  rest is shared by every level.
// ---------------------------------------------------------------------------

/** Quiet run before the first gate, so the player can find the controls. */
export const LEAD_IN = 900;

/** Gap between a gate and the first orb row that follows it. */
export const GATE_TO_ORBS = 260;

/** Default gap between orb rows. */
export const ORB_ROW_SPACING = 175;

/** Gap between the last orb of a section and the next gate. */
export const SECTION_GAP = 420;

/** Gap between the last orb of the course and the finish gate. */
export const FINISH_GAP = 520;

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
     * the centre lane straddling both, so the split sits on a lane boundary and
     * is worth alternating between sections.
     */
    splitAfterLane: 0 | 1;

    /** Colours of the left and right gate. */
    colors: [ ColorId, ColorId ];

    /**
     * One string per orb row, one character per lane:
     * 'B' blue orb, 'R' red orb, '.' empty.
     *
     * Keep at most two orbs per row. Three would leave no empty lane, forcing
     * the drop through an orb it may not match, and a combo should only ever
     * break through a player's own mistake.
     */
    rows: string[];
}

export interface LevelSpec
{
    /** Shown in the HUD and on the completion panel. */
    name: string;

    /** Overrides FORWARD_SPEED for this level. Faster reads as harder. */
    forwardSpeed?: number;

    /** Overrides ORB_ROW_SPACING for this level. Tighter reads as busier. */
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

export interface Level
{
    gates: GatePairSpec[];
    orbs: OrbSpec[];
    finishDistance: number;
}

const ORB_CHARS: Record<string, ColorId> = {
    B: 'blue',
    R: 'red'
};

/**
 * Expands an authored level into a flat list of gates and orbs with absolute
 * distances.
 */
export function buildLevel (spec: LevelSpec): Level
{
    const rowSpacing = spec.rowSpacing ?? ORB_ROW_SPACING;

    const gates: GatePairSpec[] = [];
    const orbs: OrbSpec[] = [];

    let cursor = LEAD_IN;
    let lastOrbDistance = cursor;

    for (const section of spec.sections)
    {
        gates.push({
            distance: cursor,
            splitAfterLane: section.splitAfterLane,
            colors: section.colors
        });

        let rowDistance = cursor + GATE_TO_ORBS;

        for (const row of section.rows)
        {
            for (let lane = 0; lane < LANE_COUNT; lane++)
            {
                const color = ORB_CHARS[row[lane]];

                if (color)
                {
                    orbs.push({ distance: rowDistance, lane, color });
                }
            }

            lastOrbDistance = rowDistance;
            rowDistance += rowSpacing;
        }

        cursor = lastOrbDistance + SECTION_GAP;
    }

    return {
        gates,
        orbs,
        finishDistance: lastOrbDistance + FINISH_GAP
    };
}
