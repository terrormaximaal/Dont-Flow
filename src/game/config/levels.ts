import { LevelSpec } from './level';

//  The game's levels, in order.
//
//  Each row is one character per lane: 'B' blue orb, 'R' red orb, '.' empty.
//  Never put three orbs in a row - that leaves no empty lane to dodge into, and
//  a combo should only ever break through the player's own mistake.
//
//  Difficulty comes from three dials: how fast the track flows, how tightly the
//  rows are packed, and how much the orbs of one colour zig-zag across lanes.

export const LEVELS: LevelSpec[] = [
    {
        name: '1',
        //  Gentle: default speed and spacing, with each colour mostly holding
        //  one lane so a line can be followed without much steering.
        sections: [
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
        ]
    },
    {
        name: '2',
        forwardSpeed: 470,
        rowSpacing: 160,
        //  The colours swap sides mid-section, so holding one lane stops working.
        sections: [
            {
                splitAfterLane: 1,
                colors: [ 'red', 'blue' ],
                rows: [
                    'R.B',
                    'RB.',
                    '.RB',
                    'R.B',
                    '.BR',
                    'B.R',
                    'RB.',
                    'R.B'
                ]
            },
            {
                splitAfterLane: 0,
                colors: [ 'blue', 'red' ],
                rows: [
                    'B.R',
                    '.BR',
                    'B.R',
                    'BR.',
                    '.RB',
                    'R.B',
                    'B.R',
                    '.BR'
                ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'red', 'blue' ],
                rows: [
                    'R.B',
                    '.RB',
                    'RB.',
                    'R.B',
                    'B.R',
                    '.BR',
                    'R.B',
                    'RB.'
                ]
            }
        ]
    },
    {
        name: '3',
        forwardSpeed: 520,
        rowSpacing: 145,
        //  Fast, tightly packed, and four sections long.
        sections: [
            {
                splitAfterLane: 0,
                colors: [ 'blue', 'red' ],
                rows: [
                    'B.R',
                    '.BR',
                    'BR.',
                    'B.R',
                    '.RB',
                    'R.B',
                    'B.R',
                    '.BR'
                ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'red', 'blue' ],
                rows: [
                    'R.B',
                    'RB.',
                    '.RB',
                    'R.B',
                    'B.R',
                    '.BR',
                    'RB.',
                    'R.B'
                ]
            },
            {
                splitAfterLane: 0,
                colors: [ 'red', 'blue' ],
                rows: [
                    '.RB',
                    'R.B',
                    'RB.',
                    '.BR',
                    'B.R',
                    'BR.',
                    'R.B',
                    '.RB'
                ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'blue', 'red' ],
                rows: [
                    'B.R',
                    '.BR',
                    'BR.',
                    'R.B',
                    '.RB',
                    'B.R',
                    'RB.',
                    '.BR'
                ]
            }
        ]
    },
    {
        name: '4',
        forwardSpeed: 560,
        rowSpacing: 135,
        //  The colour that pays out changes lane almost every row.
        sections: [
            {
                splitAfterLane: 0,
                colors: [ 'blue', 'red' ],
                rows: [ 'B.R', '.BR', 'R.B', 'B.R', 'BR.', '.RB', 'B.R', 'RB.' ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'red', 'blue' ],
                rows: [ 'R.B', 'RB.', '.BR', 'R.B', 'B.R', '.RB', 'RB.', 'R.B' ]
            },
            {
                splitAfterLane: 0,
                colors: [ 'red', 'blue' ],
                rows: [ '.RB', 'R.B', 'B.R', 'RB.', '.BR', 'R.B', 'BR.', '.RB' ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'blue', 'red' ],
                rows: [ 'B.R', '.BR', 'RB.', 'B.R', 'R.B', '.RB', 'BR.', 'B.R' ]
            }
        ]
    },
    {
        name: '5',
        forwardSpeed: 600,
        rowSpacing: 128,
        //  Rows close enough together that a lane change has to be committed to
        //  before the previous one has finished.
        sections: [
            {
                splitAfterLane: 1,
                colors: [ 'red', 'blue' ],
                rows: [ 'R.B', '.RB', 'RB.', 'B.R', '.BR', 'BR.', 'R.B', '.RB' ]
            },
            {
                splitAfterLane: 0,
                colors: [ 'blue', 'red' ],
                rows: [ 'B.R', 'BR.', '.BR', 'R.B', 'RB.', '.RB', 'B.R', 'BR.' ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'blue', 'red' ],
                rows: [ '.BR', 'B.R', 'BR.', '.RB', 'R.B', 'RB.', 'B.R', '.BR' ]
            },
            {
                splitAfterLane: 0,
                colors: [ 'red', 'blue' ],
                rows: [ 'R.B', '.RB', 'RB.', 'B.R', '.BR', 'BR.', 'R.B', 'RB.' ]
            }
        ]
    },
    {
        name: '6',
        forwardSpeed: 640,
        rowSpacing: 120,
        //  Everything at once, and a section longer than anything before it.
        sections: [
            {
                splitAfterLane: 0,
                colors: [ 'blue', 'red' ],
                rows: [ 'B.R', '.BR', 'BR.', 'R.B', '.RB', 'RB.', 'B.R', '.BR' ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'red', 'blue' ],
                rows: [ 'R.B', 'RB.', '.RB', 'B.R', 'BR.', '.BR', 'R.B', 'RB.' ]
            },
            {
                splitAfterLane: 0,
                colors: [ 'red', 'blue' ],
                rows: [ '.RB', 'R.B', 'RB.', 'B.R', '.BR', 'BR.', 'R.B', '.RB' ]
            },
            {
                splitAfterLane: 1,
                colors: [ 'blue', 'red' ],
                rows: [ 'B.R', 'BR.', '.BR', 'R.B', 'RB.', '.RB', 'B.R', 'BR.' ]
            },
            {
                splitAfterLane: 0,
                colors: [ 'blue', 'red' ],
                rows: [ '.BR', 'B.R', 'BR.', '.RB', 'R.B', 'RB.', 'B.R', '.BR' ]
            }
        ]
    }
];

export const LEVEL_COUNT = LEVELS.length;

/**
 * Clamps a level index into the range that exists, so a stray index can never
 * start an undefined level.
 */
export function clampLevelIndex (index: number): number
{
    return Math.max(0, Math.min(LEVEL_COUNT - 1, index));
}

export function hasNextLevel (index: number): boolean
{
    return index < LEVEL_COUNT - 1;
}
