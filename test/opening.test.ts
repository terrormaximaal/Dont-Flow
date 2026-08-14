import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES, SCORE_PENALTY, SCORE_PER_ORB } from '../src/game/config/constants';
import { LEVELS } from '../src/game/config/levels';
import { ScoreSystem } from '../src/game/systems/ScoreSystem';

/** Characters that are a hazard rather than something to collect. */
const HAZARDS = 'abcdeABCDE0';

/** Every level's opening movement, with the lane count it is written for. */
const OPENINGS = LEVELS.map((spec) => ({
    name: spec.name,
    lanes: spec.lanes ?? DEFAULT_LANES,
    section: spec.sections[0]
}));

/**
 * The lanes behind each half of a gate.
 *
 * Every level splits after lane zero, so the left portal has one lane behind it
 * and the right has the rest - but this is derived rather than assumed, because
 * a level that changed its split would otherwise pass this file while being
 * completely wrong.
 */
function lanesBehind (splitAfterLane: 0 | 1, lanes: number): [ number[], number[] ]
{
    const left: number[] = [];
    const right: number[] = [];

    for (let lane = 0; lane < lanes; lane++)
    {
        (lane <= splitAfterLane ? left : right).push(lane);
    }

    return [ left, right ];
}

describe('the opening movement of every level', () => {

    //  Under the rule that a level starts at nothing and ends below zero, the
    //  first wrong colour a player touches is fatal. So the opening cannot be a
    //  test of anything: it is the stretch that buys the rest of the level, and
    //  a player who does nothing at all has to come out of it with points.
    it('carries no hazard of any kind', () => {

        for (const { name, section } of OPENINGS)
        {
            expect(section.obstacles, `level ${name}`).toBeUndefined();

            for (const row of section.rows)
            {
                for (const character of row)
                {
                    expect(HAZARDS.includes(character), `level ${name} row "${row}"`).toBe(false);
                }
            }
        }

    });

    //  The construction that makes it safe: each lane holds only the colour of
    //  the portal it sits behind. Whichever side of the gate the player took,
    //  every orb in front of them is theirs, and the colour they are not
    //  carrying is never in a lane they are standing in.
    it('gives every lane only the colour of the gate it sits behind', () => {

        for (const { name, lanes, section } of OPENINGS)
        {
            const [ left, right ] = lanesBehind(section.splitAfterLane, lanes);

            const allowed = new Map<number, string>();

            for (const lane of left) { allowed.set(lane, String(section.gate[0] + 1)); }
            for (const lane of right) { allowed.set(lane, String(section.gate[1] + 1)); }

            for (const row of section.rows)
            {
                for (let lane = 0; lane < lanes; lane++)
                {
                    const character = row[lane];

                    if (character === undefined || character === '.')
                    {
                        continue;
                    }

                    expect(character, `level ${name} row "${row}" lane ${lane}`)
                        .toBe(allowed.get(lane));
                }
            }
        }

    });

    //  Being unable to die is not enough - the opening has to actually pay, or
    //  the player arrives at the first hazard still on zero and the level is no
    //  more survivable than it was.
    it('banks a real cushion for a player who only stands still', () => {

        for (const { name, lanes, section } of OPENINGS)
        {
            const [ left, right ] = lanesBehind(section.splitAfterLane, lanes);

            //  Both sides of the gate, since a player takes one or the other
            //  and the opening has to pay whichever they took.
            for (const [ side, group ] of [ [ 'left', left ], [ 'right', right ] ] as const)
            {
                //  The worst lane on that side: the one a player could be
                //  standing in that collects least.
                const worst = Math.min(...group.map((lane) =>
                    section.rows.filter((row) => row[lane] !== undefined && row[lane] !== '.').length));

                const scoring = new ScoreSystem();

                for (let i = 0; i < worst; i++)
                {
                    scoring.collect();
                }

                //  Three mistakes' worth. Enough that the first hazard section
                //  is a challenge rather than an execution.
                expect(scoring.getScore(), `level ${name}, ${side} of the gate, ${worst} orbs`)
                    .toBeGreaterThanOrEqual(SCORE_PENALTY * 3);
            }
        }

    });

    //  And it has to pay quickly. A cushion that only exists by the end of a
    //  twenty-row opening is no use to a player who meets something on row six.
    it('is paying within the first few rows, not only by the end', () => {

        for (const { name, lanes, section } of OPENINGS)
        {
            const [ left, right ] = lanesBehind(section.splitAfterLane, lanes);

            for (const group of [ left, right ])
            {
                const best = Math.max(...group.map((lane) =>
                    section.rows.slice(0, 4).filter((row) => row[lane] !== undefined && row[lane] !== '.').length));

                expect(best * SCORE_PER_ORB, `level ${name} in its first four rows`)
                    .toBeGreaterThan(0);
            }
        }

    });

});
