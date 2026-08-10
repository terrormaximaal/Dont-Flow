import { LevelSpec } from './level';

//  The game's ten levels, in order.
//
//  Row characters, one per lane:
//    '.'      empty
//    '1'-'5'  an orb of that palette colour
//    'a'-'e'  a barrier of that palette colour
//
//  Two rules every row must keep, both enforced by the tests:
//    - three orbs would leave no empty lane to dodge into;
//    - a row of nothing but barriers has no safe way through at all.
//
//  Difficulty comes from five dials, not just speed: how fast the track flows,
//  how tightly rows are packed, how many colours are in play, how much a colour
//  zig-zags between lanes, and which barrier kinds are present. Each barrier
//  kind is introduced on its own before being combined with anything else.

export const LEVELS: LevelSpec[] = [
    {
        name: '1',
        world: 'sky',
        palette: [ 'red', 'blue' ],
        //  Two colours, no barriers, each colour largely holding one lane. The
        //  mechanic teaches itself.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '2.1', '2.1', '.21', '2.1', '21.', '2.1', '.21', '2.1' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 0, 1 ],
                rows: [ '1.2', '.12', '1.2', '12.', '1.2', '.12', '1.2', '12.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                rows: [ '2.1', '.21', '12.', '2.1', '1.2', '.12', '21.', '2.1' ]
            }
        ]
    },
    {
        name: '2',
        world: 'mountains',
        palette: [ 'red', 'blue', 'yellow' ],
        forwardSpeed: 470,
        rowSpacing: 165,
        sections: [
            //  A third colour first, on its own.
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '2.1', '.23', '2.1', '3.2', '.31', '2.1', '.23', '3.1' ]
            },
            //  Then the first barriers, static and one at a time.
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1.a', '.1a', 'a.1', '1a.', '.a1', '1.a', 'a1.', '.1a' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 1 ],
                obstacles: 'static',
                rows: [ '3.b', '.3b', 'b.3', '3b.', '.b3', '3.b', 'b3.', '.3b' ]
            }
        ]
    },
    {
        name: '3',
        world: 'canyon',
        palette: [ 'orange', 'purple', 'cyan' ],
        forwardSpeed: 510,
        rowSpacing: 155,
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.2', '.12', '2.1', '1.2', '21.', '.21', '1.2', '.12' ]
            },
            //  Barriers that slide, so a gap has to be timed rather than aimed.
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'slider',
                rows: [ '2.a', '.2a', 'a.2', '2a.', '.a2', '2.a', 'a2.', '.2a' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 0 ],
                obstacles: 'slider',
                rows: [ '3.c', '.3c', 'c.3', '3c.', '.c3', '3.c', 'c3.', '.3c' ]
            }
        ]
    },
    {
        name: '4',
        world: 'forest',
        palette: [ 'green', 'yellow', 'purple' ],
        forwardSpeed: 545,
        rowSpacing: 148,
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.2', '.12', '2.1', '1.2', '21.', '.21', '1.2', '.12' ]
            },
            //  Barriers that breathe, closing the safe gap and opening it again.
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'pulse',
                rows: [ '2.a', '.2a', 'a.2', '2a.', '.a2', '2.a', 'a2.', '.2a' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 0 ],
                obstacles: 'pulse',
                rows: [ '3.b', '.3b', 'b.3', '3b.', '.b3', '3.b', 'b3.', '.3b' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1.c', '.1c', 'c.1', '1c.', '.c1', '1.c', 'c1.', '.1c' ]
            }
        ]
    },
    {
        name: '5',
        world: 'ice',
        palette: [ 'cyan', 'blue', 'pink' ],
        forwardSpeed: 580,
        rowSpacing: 142,
        sections: [
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                rows: [ '1.3', '.13', '3.1', '1.3', '31.', '.31', '1.3', '.13' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 1 ],
                obstacles: 'slider',
                rows: [ '3.b', '.3b', 'b.3', '3b.', '.b3', '3.b', 'b3.', '.3b' ]
            },
            //  Two sliding barriers a row, with the safe lane moving under them.
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                obstacles: 'slider',
                rows: [ '2.a', 'a.2', '.2a', 'a2.', '2.a', '.a2', 'a.2', '2a.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1.c', 'c.1', '.1c', 'c1.', '1.c', '.c1', 'c.1', '1c.' ]
            }
        ]
    },
    {
        name: '6',
        world: 'desert',
        palette: [ 'yellow', 'orange', 'blue', 'purple' ],
        forwardSpeed: 610,
        rowSpacing: 136,
        sections: [
            //  Four colours in play from here on.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.2', '.14', '2.1', '4.2', '.21', '1.4', '.12', '2.1' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'static',
                rows: [ '2.a', '.2c', 'a.2', '2c.', '.a2', '2.c', 'a2.', '.2c' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'slider',
                rows: [ '3.d', '.3b', 'd.3', '3b.', '.d3', '3.b', 'd3.', '.3b' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 3, 0 ],
                obstacles: 'pulse',
                rows: [ '4.a', '.4a', 'a.4', '4a.', '.a4', '4.a', 'a4.', '.4a' ]
            }
        ]
    },
    {
        name: '7',
        world: 'storm',
        palette: [ 'blue', 'red', 'green', 'yellow' ],
        forwardSpeed: 640,
        rowSpacing: 130,
        sections: [
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                rows: [ '1.3', '.14', '3.1', '4.3', '.31', '1.4', '.13', '3.1' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 1 ],
                obstacles: 'slider',
                rows: [ '3.b', 'b.3', '.3b', 'b3.', '3.b', '.b3', 'b.3', '3b.' ]
            },
            //  Sliding and pulsing barriers alternating row to row.
            {
                splitAfterLane: 1,
                gate: [ 1, 3 ],
                obstacles: 'pulse',
                rows: [ '2.d', '.2d', 'd.2', '2d.', '.d2', '2.d', 'd2.', '.2d' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'slider',
                rows: [ '4.a', 'a.4', '.4a', 'a4.', '4.a', '.a4', 'a.4', '4a.' ]
            }
        ]
    },
    {
        name: '8',
        world: 'city',
        palette: [ 'cyan', 'magenta', 'yellow', 'green' ],
        forwardSpeed: 665,
        rowSpacing: 126,
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.2', '.13', '2.1', '3.2', '.21', '1.3', '.12', '2.1' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 3 ],
                obstacles: 'pulse',
                rows: [ '2.d', 'd.2', '.2d', 'd2.', '2.d', '.d2', 'd.2', '2d.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 2 ],
                obstacles: 'slider',
                rows: [ '4.c', 'c.4', '.4c', 'c4.', '4.c', '.c4', 'c.4', '4c.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '3.a', 'a.3', '.3a', 'a3.', '3.a', '.a3', 'a.3', '3a.' ]
            }
        ]
    },
    {
        name: '9',
        world: 'space',
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ],
        forwardSpeed: 690,
        rowSpacing: 120,
        sections: [
            //  Five colours, and the gate colours stop repeating.
            {
                splitAfterLane: 1,
                gate: [ 0, 1 ],
                rows: [ '1.2', '.15', '2.1', '5.3', '.21', '3.5', '.12', '2.1' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'slider',
                rows: [ '3.d', 'd.3', '.3d', 'd3.', '3.d', '.d3', 'd.3', '3d.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 4, 2 ],
                obstacles: 'pulse',
                rows: [ '5.c', 'c.5', '.5c', 'c5.', '5.c', '.c5', 'c.5', '5c.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 1, 4 ],
                obstacles: 'slider',
                rows: [ '2.e', 'e.2', '.2e', 'e2.', '2.e', '.e2', 'e.2', '2e.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 3, 0 ],
                obstacles: 'static',
                rows: [ '4.a', 'a.4', '.4a', 'a4.', '4.a', '.a4', 'a.4', '4a.' ]
            }
        ]
    },
    {
        name: '10',
        world: 'void',
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ],
        forwardSpeed: 715,
        rowSpacing: 115,
        sections: [
            //  Every barrier kind met so far, in the order they were learned,
            //  then all of them at once.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1.a', '.13', '3.a', 'a.1', '.31', '1.a', 'a3.', '.1a' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 4 ],
                obstacles: 'slider',
                rows: [ '2.e', 'e.2', '.2e', 'e2.', '2.e', '.e2', 'e.2', '2e.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 4, 3 ],
                obstacles: 'pulse',
                rows: [ '5.d', 'd.5', '.5d', 'd5.', '5.d', '.d5', 'd.5', '5d.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 3, 1 ],
                obstacles: 'slider',
                rows: [ '4.b', 'b.4', '.4b', 'b4.', '4.b', '.b4', 'b.4', '4b.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 0 ],
                obstacles: 'pulse',
                rows: [ '3.a', 'a.3', '.3a', 'a3.', '3.a', '.a3', 'a.3', '3a.' ]
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
