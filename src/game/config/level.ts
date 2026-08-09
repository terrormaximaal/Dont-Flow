import { ColorId, LANE_COUNT } from './constants';

//  The layout of the one and only course.
//
//  Distances are in track pixels. Nothing here is a screen position - the
//  course is a line the drop travels along, and the renderer works out where
//  each piece currently sits.

// ---------------------------------------------------------------------------
//  Spacing
// ---------------------------------------------------------------------------

/** Quiet run before the first gate, so the player can find the controls. */
export const LEAD_IN = 900;

/** Gap between a gate and the first orb row that follows it. */
export const GATE_TO_ORBS = 260;

/** Gap between orb rows. */
export const ORB_ROW_SPACING = 175;

/** Gap between the last orb of a section and the next gate. */
export const SECTION_GAP = 420;

/** Gap between the last orb of the course and the finish gate. */
export const FINISH_GAP = 520;

// ---------------------------------------------------------------------------
//  Section layout
// ---------------------------------------------------------------------------

export interface GatePairSpec
{
    distance: number;

    /**
     * The lane boundary the two gates meet on. 0 splits after the first lane,
     * 1 after the second.
     *
     * Three lanes and two gates cannot split down the middle without leaving
     * the centre lane straddling both, so the split sits on a lane boundary and
     * alternates between sections.
     */
    splitAfterLane: 0 | 1;

    /** Colours of the left and right gate. */
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

interface SectionSpec
{
    splitAfterLane: 0 | 1;
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

const SECTIONS: SectionSpec[] = [
    {
        splitAfterLane: 0,
        colors: [ 'blue', 'red' ],
        rows: [
            'B.R',
            'B.R',
            '.BR',
            'B.R',
            'BR.',
            'B.R',
            '.BR',
            'B.R'
        ]
    },
    {
        splitAfterLane: 1,
        colors: [ 'red', 'blue' ],
        rows: [
            'R.B',
            '.RB',
            'R.B',
            'RB.',
            'R.B',
            '.RB',
            'R.B',
            'RB.'
        ]
    },
    {
        splitAfterLane: 1,
        colors: [ 'blue', 'red' ],
        rows: [
            'B.R',
            '.BR',
            'RB.',
            'B.R',
            'R.B',
            '.RB',
            'BR.',
            'B.R'
        ]
    }
];

const ORB_CHARS: Record<string, ColorId> = {
    B: 'blue',
    R: 'red'
};

/**
 * Expands the authored sections into a flat list of gates and orbs with
 * absolute distances.
 */
export function buildLevel (): Level
{
    const gates: GatePairSpec[] = [];
    const orbs: OrbSpec[] = [];

    let cursor = LEAD_IN;

    for (const section of SECTIONS)
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

            rowDistance += ORB_ROW_SPACING;
        }

        //  rowDistance has already stepped past the final row.
        cursor = (rowDistance - ORB_ROW_SPACING) + SECTION_GAP;
    }

    return {
        gates,
        orbs,
        finishDistance: (cursor - SECTION_GAP) + FINISH_GAP
    };
}
