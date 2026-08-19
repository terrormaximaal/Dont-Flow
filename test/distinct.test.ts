import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/config/levels';

/**
 * Whether the levels are actually different from each other.
 *
 * Every other guard in the suite asks whether a level is playable. None asks
 * whether it is worth playing after the one before it, and that turned out to
 * be the thing most easily lost: thirty levels can each carry a distinct design
 * note, a distinct world, a distinct set of mechanics, and still put the same
 * road under the player.
 *
 * Measured as runs of consecutive rows rather than as a bag of rows, because a
 * run is what a player experiences. The alphabet is tiny - three lanes, and a
 * lane is empty, an orb, a wall, a hurdle or a hole - so any two levels share
 * plenty of single rows; what says two levels feel alike is sharing the
 * sequences.
 *
 * Held against the first twenty rather than against a number picked out of the
 * air. Those were written a row at a time by hand, they are what the game means
 * by "different levels", and they share 14% of their eight-row runs.
 */
function runsOf (index: number, length: number): Map<string, number> {

    const shape = (row: string): string => [ ...row ].map((c) => (
        c === '.' ? '.'
            : c === '0' ? '0'
                : '12345'.includes(c) ? 'o'
                    : 'abcde'.includes(c) ? 'w'
                        : 'h'
    )).join('');

    const rows = LEVELS[index].sections.flatMap((section) => section.rows).map(shape);
    const runs = new Map<string, number>();

    for (let at = 0; at + length <= rows.length; at++)
    {
        const key = rows.slice(at, at + length).join('|');

        runs.set(key, (runs.get(key) ?? 0) + 1);
    }

    return runs;
}

/** How much of their road two levels have in common, 0 to 1. */
function sharing (a: number, b: number, length = 8): number {

    const first = runsOf(a, length);
    const second = runsOf(b, length);

    let shared = 0;
    let mine = 0;
    let theirs = 0;

    for (const [ key, count ] of first)
    {
        shared += Math.min(count, second.get(key) ?? 0);
        mine += count;
    }

    for (const count of second.values()) { theirs += count; }

    return shared / Math.max(mine, theirs, 1);
}

describe('levels being different from each other', () => {

    //  The brief for the late levels asked for this before it asked for
    //  anything else, and the first version of them missed it: they shared 38%
    //  of their eight-row runs against the first twenty's 14%, because thirty
    //  levels were drawing on one written shape per movement. Every motif has
    //  several now, chosen by where the level and the movement sit.
    it('never puts more than half of one late level inside another', () => {

        for (let a = 20; a < LEVELS.length; a++)
        {
            for (let b = a + 1; b < LEVELS.length; b++)
            {
                expect(
                    sharing(a, b),
                    `levels ${a + 1} and ${b + 1}`
                ).toBeLessThan(0.52);
            }
        }

    });

    //  And the one the brief actually asked for: that a level does not feel
    //  like the level before it. Held tighter than the pairs above, because two
    //  levels twenty apart being alike is a much smaller sin than two in a row.
    //
    //  Both numbers are set just above where the levels actually sit rather
    //  than at a round figure, so the guard is a ratchet: the next change to
    //  these levels can improve on it and cannot quietly undo it.
    it('never lets a level repeat the one before it', () => {

        for (let at = 21; at < LEVELS.length; at++)
        {
            expect(
                sharing(at - 1, at),
                `level ${at + 1} against level ${at}`
            ).toBeLessThan(0.43);
        }

    });

    //  The measure has teeth: a level made of one movement repeated is caught.
    it('catches a level that repeats itself', () => {

        const dull = runsOf(20, 8);
        const most = Math.max(...dull.values());

        expect(most / [ ...dull.values() ].reduce((a, b) => a + b, 0), 'the commonest run in level 21')
            .toBeLessThan(0.2);

    });

});
