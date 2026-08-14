import { ObstacleKind } from './level';

//  The pieces an endless run is built from.
//
//  Handcrafted rather than generated. A row assembled at random is a row that
//  is sometimes impossible and always shapeless: the whole reason the twenty
//  levels read as designed is that somebody chose where each thing went, and
//  throwing that away for survival mode would make it the worse half of its own
//  game. So the *pieces* are authored and only the *order* is chosen at run
//  time - which is the arrangement that keeps every piece playable while making
//  no two runs the same.
//
//  Every chunk here is held to exactly the rules the levels are, by the same
//  tests, run over generated courses.

export interface Chunk
{
    /** What it is, for reading a failure message. */
    name: string;

    /**
     * How hard it is, 0 upwards.
     *
     * Not a number of hazards - a judgement about what it asks. A tier only
     * becomes eligible once a run has gone far enough, so a run's first minute
     * cannot contain the things its fifth is made of.
     */
    tier: number;

    /** How its barriers behave. */
    obstacles?: ObstacleKind;

    /** Rows, one character per lane, in the same language the levels use. */
    rows: string[];

    /**
     * Somewhere to get a run back.
     *
     * Marked rather than measured, because the generator needs to know before
     * it places one; that the marking is honest is checked by test against the
     * same measurement the levels are held to.
     */
    recovery?: boolean;
}

/**
 * The library.
 *
 * Ordered by tier so the progression is readable down the file. Colours are
 * left as palette indices 1 and 2 throughout - the generator rewrites them to
 * whichever pair its gate offers, so a chunk never assumes a palette.
 */
export const CHUNKS: Chunk[] = [

    //  Tier 0 - open road. Nothing in the way, and enough to collect that a run
    //  arriving hurt can leave whole.
    {
        name: 'open',
        tier: 0,
        recovery: true,
        rows: [ '1..', '.2.', '..1', '1.2', '.1.', '2.1', '1..', '.2.', '..1', '1.2', '.1.', '2.1' ]
    },
    {
        name: 'weave',
        tier: 0,
        recovery: true,
        rows: [ '1..', '.1.', '..1', '.2.', '2..', '.2.', '..2', '.1.', '1..', '.1.', '..1', '.2.' ]
    },
    {
        name: 'shower',
        tier: 0,
        recovery: true,
        rows: [ '121', '.1.', '212', '.2.', '121', '.1.', '212', '.2.', '121', '.1.', '212', '.2.' ]
    },

    //  Tier 1 - walls that hold their lane. The first thing to go round.
    {
        name: 'posts',
        tier: 1,
        obstacles: 'static',
        rows: [ '1..', 'a..', '.2.', '..a', '..1', 'a..', '.1.', '..a', '2..', 'a..', '.2.', '..a' ]
    },
    {
        name: 'alternating',
        tier: 1,
        obstacles: 'static',
        rows: [ '.1.', 'a.b', '.2.', '..1', '.2.', 'b.a', '.1.', '2..', '.1.', 'a.b', '.2.', '..2' ]
    },

    //  Tier 2 - barriers that will not stay still.
    {
        name: 'sway',
        tier: 2,
        obstacles: 'slider',
        rows: [ '.1.', '..2', 'a..', '.1.', '..1', '..b', '.2.', '..1', 'a..', '.2.', '..2', '..b' ]
    },
    {
        name: 'breathing',
        tier: 2,
        obstacles: 'pulse',
        rows: [ '1..', '.a.', '..2', '.1.', 'b..', '..1', '.2.', '.a.', '2..', '.1.', '..b', '.2.' ]
    },

    //  Tier 3 - the ground stops being reliable. Hurdles first, since they are
    //  answered by the jump the levels teach on seven.
    {
        name: 'hurdles',
        tier: 3,
        obstacles: 'static',
        rows: [ '.1.', '..2', 'AAA', '..1', '.2.', '...', '.1.', '2..', 'BBB', '..2', '.1.', '...' ]
    },
    {
        name: 'holes',
        tier: 3,
        obstacles: 'static',
        rows: [ '.2.', '1..', '000', '..1', '.2.', '...', '.1.', '..2', '000', '2..', '.1.', '...' ]
    },

    //  Tier 4 - the road narrows, and things turn.
    {
        name: 'bridge',
        tier: 4,
        obstacles: 'static',
        rows: [ '.1.', '..2', '0.0', '0.0', '.00', '.00', '0.0', '0.0', '00.', '00.', '.1.', '..2' ]
    },
    {
        name: 'bars',
        tier: 4,
        obstacles: 'rotor',
        rows: [ '.1.', 'a..', '..2', '.1.', '..b', '2..', '.2.', 'a..', '..1', '.2.', '..b', '1..' ]
    },

    //  Tier 5 - the floor itself.
    {
        name: 'vanishing',
        tier: 5,
        obstacles: 'blinker',
        rows: [ '.1.', '..2', '000', '..1', '.2.', '...', '.2.', '1..', '000', '..2', '.1.', '...' ]
    },
    {
        name: 'gauntlet',
        tier: 5,
        obstacles: 'pulse',
        rows: [ '1..', '.a.', '..2', 'b..', '.1.', '..a', '2..', '.b.', '..1', 'a..', '.2.', '..b' ]
    }
];

/** The hardest tier the library has anything for. */
export const MAX_TIER = CHUNKS.reduce((top, chunk) => Math.max(top, chunk.tier), 0);
