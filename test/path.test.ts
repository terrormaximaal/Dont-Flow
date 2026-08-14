import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES } from '../src/game/config/constants';
import { buildLevel, ObstacleSpec } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';

/**
 * Whether a level can be walked from one end to the other.
 *
 * Every other guard in the suite asks about one row: does *this* row leave a
 * lane free, is *this* pair of hurdles clearable. None of them asks the
 * question a player asks, which is whether the free lanes join up - a level
 * whose every row has a way through can still be impossible if the way through
 * row twelve is three lanes from the way through row eleven.
 *
 * That gap in the guards was harmless while rows were mostly open. It stopped
 * being harmless the moment a road could be narrowed to a single lane, because
 * a narrowed road is nothing but a sequence of forced positions.
 *
 * Walked as a set of reachable lanes rather than as a search, which is the same
 * thing for a track this wide and needs no backtracking: at each row, take
 * everywhere reachable, spread it one lane either way, and keep whatever
 * survives the row.
 */
function reachableThrough (index: number): { ok: boolean; row: number; distance: number }
{
    const spec = LEVELS[index];
    const lanes = spec.lanes ?? DEFAULT_LANES;
    const level = buildLevel(spec);

    const rows = new Map<number, ObstacleSpec[]>();

    for (const obstacle of level.obstacles)
    {
        rows.set(obstacle.distance, [ ...(rows.get(obstacle.distance) ?? []), obstacle ]);
    }

    const ordered = [ ...rows.entries() ].sort((a, b) => a[0] - b[0]);

    let reachable = new Set<number>();

    for (let lane = 0; lane < lanes; lane++)
    {
        reachable.add(lane);
    }

    for (let index = 0; index < ordered.length; index++)
    {
        const [ distance, obstacles ] = ordered[index];

        //  One lane either way between rows. Deliberately the least the player
        //  could manage rather than the most: a level that survives this
        //  survives any faster reading of how far a drop can travel between two
        //  rows, and the spacing guard in barrier.test already holds the levels
        //  to more than this.
        const spread = new Set<number>();

        for (const lane of reachable)
        {
            for (const step of [ -1, 0, 1 ])
            {
                const to = lane + step;

                if (to >= 0 && to < lanes) { spread.add(to); }
            }
        }

        const blocked = new Set(obstacles.map((o) => o.lane));

        //  A row blocked all the way across is a row that is jumped, and a jump
        //  carries the drop over it in whatever lane it was already in. Those
        //  rows are checked for reach by hurdles.test; here they simply do not
        //  narrow the path.
        if (blocked.size >= lanes && obstacles.every((o) => o.profile !== 'full'))
        {
            reachable = spread;

            continue;
        }

        reachable = new Set([ ...spread ].filter((lane) => !blocked.has(lane)));

        if (reachable.size === 0)
        {
            return { ok: false, row: index, distance };
        }
    }

    return { ok: true, row: -1, distance: -1 };
}

describe('a way through from one end to the other', () => {

    it('exists on every level, row after row', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            const walk = reachableThrough(index);

            expect(
                walk.ok,
                `level ${spec.name}: no lane left at row ${walk.row}, distance ${walk.distance}`
            ).toBe(true);
        }

    });

    //  The check would pass anything if the spread were unbounded, so this is
    //  the proof that it is really following a path: a road narrowed to one
    //  lane that jumps from one side to the other cannot be walked.
    it('cannot be found across a bridge that skips a lane', () => {

        //  Left lane open, then right lane open, with nothing in between. Two
        //  rows that are each perfectly passable and cannot both be.
        const lanes = 3;
        const rowsOf = (safe: number[]): Set<number>[] =>
            safe.map((s) => new Set([ 0, 1, 2 ].filter((l) => l !== s)));

        let reachable = new Set([ 0, 1, 2 ]);

        for (const blocked of rowsOf([ 0, 2 ]))
        {
            const spread = new Set<number>();

            for (const lane of reachable)
            {
                for (const step of [ -1, 0, 1 ])
                {
                    const to = lane + step;

                    if (to >= 0 && to < lanes) { spread.add(to); }
                }
            }

            reachable = new Set([ ...spread ].filter((l) => !blocked.has(l)));
        }

        expect(reachable.size, 'lane 0 then lane 2 with one step between').toBe(0);

    });

});
