import { LevelSpec } from './level';

//  The game's ten levels, in order.
//
//  Row characters, one per lane:
//    '.'      empty
//    '1'-'5'  an orb of that palette colour
//    'a'-'e'  a barrier of that palette colour
//
//  Three rules every row must keep, all enforced by the tests:
//    - one character per lane, so a two-lane level's rows are two long;
//    - never completely full, so there is always somewhere to dodge to;
//    - never barriers all the way across, which has no way through at all.
//
//  The first two levels are two lanes wide. The road is the same road, so the
//  lanes are half again as wide and there is only one direction to go: the
//  player learns what the colours mean before being asked to choose a lane as
//  well. The third opens the middle lane, and from there the ramp is in the
//  five dials - how fast the track flows, how tightly rows are packed, how many
//  colours are in play, how much a colour moves about, and which barrier kinds
//  are present. Each barrier kind is introduced on its own before being
//  combined with anything else.
//
//  Levels run roughly half a minute. Short enough to want another, long enough
//  that a good run feels like one.

export const LEVELS: LevelSpec[] = [
    {
        name: '1',
        world: 'sky',
        lanes: 2,
        palette: [ 'red', 'blue' ],
        forwardSpeed: 380,
        rowSpacing: 190,
        //  One orb at a time, half a second apart, on a road with two lanes.
        //  Everything the game is about and nothing else: this colour is mine,
        //  that one is not.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.', '..', '.2', '1.', '..', '.2', '1.', '.1', '2.', '..', '.1', '2.', '1.', '.2' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '.2', '1.', '..', '.1', '2.', '.2', '1.', '..', '2.', '.1', '1.', '.2', '2.', '.1' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.', '.2', '2.', '.1', '..', '1.', '.2', '1.', '.1', '2.', '.2', '1.', '..', '.1' ]
            }
        ]
    },
    {
        name: '2',
        world: 'mountains',
        lanes: 2,
        palette: [ 'red', 'blue' ],
        forwardSpeed: 400,
        rowSpacing: 180,
        //  The same two lanes, with the gaps taken out and the colours changing
        //  sides more often. Still nothing to hit.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '.1', '2.', '.2', '1.', '.1', '1.', '.2', '2.', '.1', '1.', '2.', '.2', '.1', '1.', '.2' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.', '.2', '1.', '2.', '.1', '.2', '1.', '.1', '2.', '.2', '1.', '.1', '2.', '.2', '1.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '.2', '1.', '.1', '2.', '.2', '1.', '.2', '2.', '.1', '1.', '.2', '.1', '2.', '1.', '.1' ]
            }
        ]
    },
    {
        name: '3',
        world: 'canyon',
        palette: [ 'orange', 'purple' ],
        forwardSpeed: 420,
        rowSpacing: 172,
        //  The middle lane opens. Same two colours, so the only new thing to
        //  learn is that there are now three places to be.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..1', '.1.', '2..', '..2', '.1.', '1..', '..1', '.2.', '2..', '..1', '.1.', '1.2', '..1' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                rows: [ '..2', '.1.', '2..', '.2.', '..1', '1..', '.2.', '..2', '.1.', '2..', '1.2', '.2.', '..1', '2..', '.2.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 0, 1 ],
                rows: [ '.1.', '2..', '..1', '1..', '.2.', '..2', '1..', '.1.', '2.1', '..2', '.1.', '1..', '..1', '.2.', '2..' ]
            }
        ]
    },
    {
        name: '4',
        world: 'forest',
        palette: [ 'green', 'yellow', 'purple' ],
        forwardSpeed: 440,
        rowSpacing: 165,
        //  A third colour, and still nothing to hit. Two colours on a row now,
        //  so a row can be a real choice rather than a yes or no.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..3', '1.2', '.3.', '2..', '.*.', '.2.', '3..', '..2', '1.3', '.1.', '..3', '2..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                rows: [ '.2.', '..3', '2..', '.3.', '..2', '3.2', '.2.', '..3', '2..', '.1.', '..2', '3..', '.3.', '2.3' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                rows: [ '..3', '1..', '.3.', '..1', '3..', '.1.', '1.3', '..3', '.*.', '3..', '..1', '.3.', '1..', '..3' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                rows: [ '1..', '..3', '.1.', '3..', '..1', '.3.', '1.3', '..1', '3..', '.1.', '..3', '1..', '.3.', '..1' ]
            }
        ]
    },
    {
        name: '5',
        world: 'ice',
        palette: [ 'cyan', 'blue', 'pink' ],
        forwardSpeed: 460,
        rowSpacing: 158,
        //  The first barriers. Static, one at a time, and always with two lanes
        //  open beside them - a barrier in your own colour is passed straight
        //  through, which is the whole reason to notice what colour you are.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..1', '.1.', '2..', '..2', '1..', '.2.', '..1', '2..', '.1.', '..2', '1..', '.2.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                obstacles: 'static',
                rows: [ '..2', 'a..', '.1.', '..2', '.b.', '.*.', '..1', 'a..', '.2.', '..2', '.a.', '2..', '..1', '.b.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1..', '..c', '.1.', 'a..', '..3', '.c.', '1..', '..1', 'a..', '.3.', '..c', '1..', '.a.', '..3' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '..3', '.1.', 'c..', '..1', '.a.', '3..', '..3', 'c..', '.1.', '.*.', '3..', '.3.', '..1', 'c..' ]
            }
        ]
    },
    {
        name: '6',
        world: 'desert',
        palette: [ 'yellow', 'orange', 'blue' ],
        forwardSpeed: 480,
        rowSpacing: 152,
        //  Static barriers, now regularly, and orbs tucked in beside them.
        //
        //  Also where the jump is taught. A hurdle spans the whole road, so
        //  there is no lane to steer into and the only way through is over -
        //  which is the lesson, and it is taught by a wall the player cannot
        //  misread rather than by a line of text. Introduced alone, in the
        //  quietest part of the level, before it is ever mixed with anything.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                obstacles: 'static',
                rows: [ '1..', '.b.', '..1', '2..', '.a.', '..2', '1.b', '..1', 'a..', '.*.', '..b', '1..', '.1.', 'b..', '..2' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                obstacles: 'static',
                //  One clear run at it, then a second with orbs either side so
                //  the jump is worth timing rather than just surviving.
                rows: [ '...', '.2.', '...', 'AAA', '...', '.1.', '...', 'AAA', '2.2', '...', '.1.', 'AAA', '...', '.2.', '...' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'static',
                rows: [ '.2.', 'c..', '..2', '.3.', '..c', '2..', '.b.', '..3', '2.c', '.2.', 'b..', '..3', '.3.', '..b', '2..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '..3', '.a.', '1..', '..1', 'c..', '.3.', '.*.', '1..', '.1.', '..c', '3..', '.a.', '..3', '1..', '.c.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1..', '..c', '.a.', '3..', '..1', '.c.', '1..', '.3.', 'a..', '..3', '.1.', 'c..', '..1', '.a.', '3..' ]
            }
        ]
    },
    {
        name: '7',
        world: 'storm',
        palette: [ 'blue', 'red', 'green', 'yellow' ],
        forwardSpeed: 505,
        rowSpacing: 147,
        //  Sliding barriers, first on their own so the movement can be read,
        //  then beside the static ones already known.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..4', '1.2', '.4.', '2..', '..1', '.2.', '4..', '..2', '1.4', '.1.', '..4', '2..', '.1.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'slider',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '.*.', 'a..', '.3.', '..2', 'd..', '.3.', '..2', 'a..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'static',
                rows: [ '..3', '.4.', 'b..', '..4', '.3.', '..b', '3..', '.4.', 'a..', '..3', '.b.', '4..', '..4', '.3.', 'b..' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'slider',
                rows: [ '4..', '..1', '.b.', '4..', '.*.', 'c..', '.1.', '..4', '.c.', '1..', '..1', 'b..', '.4.', '..1', '.b.' ]
            }
        ]
    },
    {
        name: '8',
        world: 'city',
        palette: [ 'cyan', 'magenta', 'yellow', 'green' ],
        forwardSpeed: 530,
        rowSpacing: 142,
        //  Pulsing barriers, again alone before they are mixed. They never
        //  reach the next lane along, so what they cost is nerve, not room.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..3', '1.2', '.3.', '.*.', '..1', '.3.', '2..', '..2', '1.3', '.1.', '..3', '2..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'pulse',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '..3' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'static',
                rows: [ '..3', '.4.', 'b..', '..4', '.3.', 'a..', '..3', '.4.', 'b..', '.*.', '.a.', '4..', '..4', '.3.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'pulse',
                rows: [ '4..', '..1', '.c.', '4..', '..4', 'b..', '.1.', '..4', '.b.', '1..', '..1', 'c..', '.4.', '..1' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1..', '..3', '.b.', '1..', '..1', 'd..', '.*.', '..1', '.d.', '3..', '..3', 'b..', '.1.', '..3' ]
            }
        ]
    },
    {
        name: '9',
        world: 'space',
        palette: [ 'magenta', 'cyan', 'orange', 'green' ],
        forwardSpeed: 560,
        rowSpacing: 138,
        //  Everything met so far, in the same level but still a kind to a
        //  section, so each stretch reads as one idea.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..3', '1.2', '.3.', '2..', '..1', '.2.', '3..', '..2', '1.3', '.1.', '..3', '2..', '.1.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'slider',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.*.', '..3', 'a..', '.3.', '..2', 'd..', '.3.', '..2', 'a..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'pulse',
                rows: [ '..3', '.4.', 'b..', '..4', '.3.', 'a..', '..3', '.4.', 'b..', '..3', '.a.', '4..', '..4', '.3.', 'b..' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'static',
                rows: [ '4..', '..1', '.c.', '4..', '..4', 'b..', '.1.', '..4', '.*.', '1..', '..1', 'c..', '.4.', '..1', '.c.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 0, 3 ],
                obstacles: 'slider',
                rows: [ '1..', '..4', '.c.', '1..', '..1', 'd..', '.4.', '..1', '.d.', '4..', '..4', 'c..', '.1.', '..4', '.c.' ]
            }
        ]
    },
    {
        name: '10',
        world: 'void',
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ],
        forwardSpeed: 590,
        rowSpacing: 134,
        //  Five colours and every kind of barrier. Nothing new is introduced
        //  here - it is the exam, not the lesson.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..3', '1.2', '.3.', '2..', '..1', '.2.', '.*.', '..2', '1.3', '.1.', '..3', '2..', '.1.', '..2' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'slider',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '..3', 'a..', '.3.', '..2', 'e..', '.3.', '..2', 'a..', '.2.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'pulse',
                rows: [ '..3', '.4.', 'b..', '..4', '.3.', '.*.', '..3', '.4.', 'e..', '..3', '.a.', '4..', '..4', '.3.', 'b..', '..4' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'static',
                rows: [ '4..', '..5', '.c.', '4..', '..4', 'b..', '.5.', '..4', '.b.', '5..', '..5', 'c..', '.4.', '..5', '.c.', '4..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 4, 0 ],
                obstacles: 'slider',
                rows: [ '5..', '..1', '.c.', '5..', '..5', 'd..', '.1.', '..5', '.d.', '1..', '.*.', 'c..', '.5.', '..1', '.c.', '5..' ]
            }
        ]
    }
];

export const LEVEL_COUNT = LEVELS.length;

/** Keeps a level index inside the list, whatever it was read from. */
export function clampLevelIndex (index: number): number
{
    return Math.max(0, Math.min(LEVEL_COUNT - 1, index));
}

/** Whether there is a level after this one. */
export function hasNextLevel (index: number): boolean
{
    return index < LEVEL_COUNT - 1;
}
