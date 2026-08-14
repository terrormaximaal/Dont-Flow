import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES, DROP_CONTACT_RADIUS, SCORE_PENALTY, LANE_CHANGE_SPEED, ORB_CATCH_RADIUS, SWIPE_REPEAT_DELAY } from '../src/game/config/constants';
import { buildLevel, LevelSpec, ObstacleSpec } from '../src/game/config/level';
import { CHUNKS, MAX_TIER } from '../src/game/config/chunks';
import { generateRun, paceAt, pickChunk, randomFrom, REST_EVERY, tierAt } from '../src/game/config/survival';
import { shapeOf } from '../src/game/config/shape';
import { isSheltered, loseLife, SURVIVAL_GRACE, SURVIVAL_REVIVE } from '../src/game/systems/lives';
import { barrierCentre, barrierHalfWidth } from '../src/game/systems/barrier';
import { laneCenterX, laneCount, laneWidth, useLanes } from '../src/game/systems/Lanes';

const PALETTE = [ 'cyan', 'magenta', 'yellow', 'green', 'purple' ] as const;

/** A run's worth of course, from a seed. */
function runFor (seed: number, count = 40): LevelSpec
{
    return generateRun(seed, count, [ ...PALETTE ], 'sky').spec;
}

/** Enough seeds that a rule holding on all of them means something. */
const SEEDS = Array.from({ length: 60 }, (_, i) => (i * 7919) + 13);

describe('the generator itself', () => {

    it('gives the same run for the same seed, and different runs for different ones', () => {

        expect(generateRun(42, 20, [ ...PALETTE ], 'sky').names)
            .toEqual(generateRun(42, 20, [ ...PALETTE ], 'sky').names);

        expect(generateRun(42, 20, [ ...PALETTE ], 'sky').names)
            .not.toEqual(generateRun(43, 20, [ ...PALETTE ], 'sky').names);

    });

    it('spreads its draws across the whole library rather than favouring one', () => {

        const seen = new Map<string, number>();

        for (const seed of SEEDS)
        {
            for (const name of generateRun(seed, 40, [ ...PALETTE ], 'sky').names)
            {
                seen.set(name, (seen.get(name) ?? 0) + 1);
            }
        }

        //  Every piece in the library has to actually turn up, or it is dead
        //  weight that nobody will notice is broken.
        for (const chunk of CHUNKS)
        {
            expect(seen.get(chunk.name) ?? 0, `the ${chunk.name} chunk`).toBeGreaterThan(0);
        }

    });

    it('never plays the same piece twice running', () => {

        for (const seed of SEEDS)
        {
            const names = generateRun(seed, 40, [ ...PALETTE ], 'sky').names;

            for (let at = 1; at < names.length; at++)
            {
                //  Tier zero has three pieces, so even the opening has a choice.
                expect(names[at], `seed ${seed} at chunk ${at}`).not.toBe(names[at - 1]);
            }
        }

    });

    it('holds nothing back for the first chunks, and everything by the end', () => {

        expect(tierAt(0)).toBe(0);
        expect(tierAt(1000)).toBe(MAX_TIER);

        //  A tier never falls back as a run goes on.
        for (let at = 1; at < 200; at++)
        {
            expect(tierAt(at)).toBeGreaterThanOrEqual(tierAt(at - 1));
        }

    });

    it('never offers a piece the run has not reached the tier for', () => {

        for (const seed of SEEDS)
        {
            const names = generateRun(seed, 40, [ ...PALETTE ], 'sky').names;

            names.forEach((name, at) => {

                const chunk = CHUNKS.find((c) => c.name === name)!;

                expect(chunk.tier, `seed ${seed}: ${name} at chunk ${at}`)
                    .toBeLessThanOrEqual(tierAt(at));

            });
        }

    });

    //  A run that never gets its score back dies to arithmetic rather than to
    //  any mistake the player made.
    it('never runs long without somewhere to recover', () => {

        for (const seed of SEEDS)
        {
            const names = generateRun(seed, 60, [ ...PALETTE ], 'sky').names;

            let since = 0;

            names.forEach((name, at) => {

                const chunk = CHUNKS.find((c) => c.name === name)!;

                since = chunk.recovery === true ? 0 : since + 1;

                expect(since, `seed ${seed} at chunk ${at}`).toBeLessThanOrEqual(REST_EVERY);

            });
        }

    });

    it('gets faster and tighter as the tiers come, and then stops', () => {

        for (let tier = 1; tier <= MAX_TIER; tier++)
        {
            expect(paceAt(tier).speed, `tier ${tier}`).toBeGreaterThan(paceAt(tier - 1).speed);
            expect(paceAt(tier).spacing, `tier ${tier}`).toBeLessThanOrEqual(paceAt(tier - 1).spacing);
        }

        //  The floor is the promise that it cannot tighten forever.
        expect(paceAt(MAX_TIER).spacing).toBeGreaterThanOrEqual(120);

    });

    //  The one rule that outranks variety: a rest that is overdue is taken
    //  whatever the draw wanted.
    it('forces a rest when one is overdue, however the dice fall', () => {

        const random = randomFrom(1);

        for (let i = 0; i < 200; i++)
        {
            const chunk = pickChunk(random, MAX_TIER, REST_EVERY, null);

            expect(chunk.recovery, `draw ${i}`).toBe(true);
        }

    });

});

//  ---------------------------------------------------------------------------
//  The point of building a run as an ordinary LevelSpec: every rule the twenty
//  authored levels are held to can be pointed at generated ones instead. These
//  are the same checks, over sixty seeds.
//  ---------------------------------------------------------------------------

/** The rule the game collides with. */
function isClear (lane: number, obstacle: ObstacleSpec, distance: number): boolean
{
    const gap = Math.abs(laneCenterX(lane) - barrierCentre(obstacle.kind, obstacle.lane, distance));

    return gap >= barrierHalfWidth(obstacle.kind, distance) + DROP_CONTACT_RADIUS;
}

describe('a generated run', () => {

    it('leaves a lane free on every row, whatever colour is carried', () => {

        useLanes(DEFAULT_LANES);

        for (const seed of SEEDS)
        {
            const level = buildLevel(runFor(seed));
            const rows = new Map<number, ObstacleSpec[]>();

            for (const obstacle of level.obstacles)
            {
                rows.set(obstacle.distance, [ ...(rows.get(obstacle.distance) ?? []), obstacle ]);
            }

            for (const [ distance, obstacles ] of rows)
            {
                if (obstacles.every((o) => o.profile !== 'full'))
                {
                    continue;
                }

                const free = [];

                for (let lane = 0; lane < laneCount(); lane++)
                {
                    if (obstacles.every((o) => isClear(lane, o, distance) || o.profile !== 'full'))
                    {
                        free.push(lane);
                    }
                }

                expect(free.length, `seed ${seed}, row at ${distance}`).toBeGreaterThan(0);
            }
        }

    });

    it('can be walked from one end to the other', () => {

        for (const seed of SEEDS)
        {
            const level = buildLevel(runFor(seed));
            const rows = new Map<number, ObstacleSpec[]>();

            for (const obstacle of level.obstacles)
            {
                rows.set(obstacle.distance, [ ...(rows.get(obstacle.distance) ?? []), obstacle ]);
            }

            const ordered = [ ...rows.entries() ].sort((a, b) => a[0] - b[0]);

            let reachable = new Set([ 0, 1, 2 ]);

            for (const [ distance, obstacles ] of ordered)
            {
                const spread = new Set<number>();

                for (const lane of reachable)
                {
                    for (const step of [ -1, 0, 1 ])
                    {
                        if (lane + step >= 0 && lane + step < 3) { spread.add(lane + step); }
                    }
                }

                const blocked = new Set(obstacles.map((o) => o.lane));

                if (blocked.size >= 3 && obstacles.every((o) => o.profile !== 'full'))
                {
                    reachable = spread;

                    continue;
                }

                reachable = new Set([ ...spread ].filter((lane) => !blocked.has(lane)));

                expect(reachable.size, `seed ${seed}, no lane left at ${distance}`).toBeGreaterThan(0);
            }
        }

    });

    it('never puts two sliders or two bars on the same row', () => {

        for (const seed of SEEDS)
        {
            const spec = runFor(seed);

            for (const section of spec.sections)
            {
                if (section.obstacles !== 'slider' && section.obstacles !== 'rotor')
                {
                    continue;
                }

                for (const row of section.rows)
                {
                    const moving = [ ...row ].filter((c) => 'abcde0'.includes(c)).length;

                    expect(moving, `seed ${seed}, ${section.obstacles} row "${row}"`)
                        .toBeLessThanOrEqual(1);
                }
            }
        }

    });

    it('never puts a turning bar anywhere but an outside lane', () => {

        for (const seed of SEEDS)
        {
            const spec = runFor(seed);

            for (const section of spec.sections)
            {
                if (section.obstacles !== 'rotor')
                {
                    continue;
                }

                for (const row of section.rows)
                {
                    for (let lane = 0; lane < row.length; lane++)
                    {
                        if ('abcdeABCDE'.includes(row[lane]))
                        {
                            expect(lane === 0 || lane === 2, `seed ${seed}, row "${row}"`).toBe(true);
                        }
                    }
                }
            }
        }

    });

    it('gives enough road between rows to reach any lane', () => {

        useLanes(DEFAULT_LANES);

        const crossing = (Math.log((2 * laneWidth()) / ORB_CATCH_RADIUS) / LANE_CHANGE_SPEED) * 1000;
        const dragged = SWIPE_REPEAT_DELAY + ((Math.log(laneWidth() / ORB_CATCH_RADIUS) / LANE_CHANGE_SPEED) * 1000);

        //  The worst case in the whole scheme: the tightest spacing the tiers
        //  ever reach, run at the fastest pace they ever reach.
        const spacing = paceAt(MAX_TIER).spacing;
        const speed = paceAt(MAX_TIER).speed;
        const available = (spacing / speed) * 1000;

        expect(available, 'separate swipes at the hardest tier').toBeGreaterThan(crossing);
        expect(available, 'one drag at the hardest tier').toBeGreaterThan(dragged);

    });

    it('offers something to collect behind both doorways, everywhere', () => {

        for (const seed of SEEDS)
        {
            const spec = runFor(seed);

            for (const [ at, section ] of spec.sections.entries())
            {
                for (const gate of section.gate)
                {
                    expect(
                        shapeOf(spec, at, spec.palette[gate]).matching,
                        `seed ${seed}, chunk ${at}, the ${spec.palette[gate]} door`
                    ).toBeGreaterThan(0);
                }
            }
        }

    });

});

describe('the chances an endless run gets', () => {

    it('spends them one at a time and then says the run is over', () => {

        expect(loseLife(3)).toEqual({ lives: 2, score: SURVIVAL_REVIVE });
        expect(loseLife(2)).toEqual({ lives: 1, score: SURVIVAL_REVIVE });
        expect(loseLife(1)).toEqual({ lives: 0, score: null });

    });

    //  A run ending twice is a bug that shows up as a panel drawn over a panel.
    it('cannot be spent past the last one', () => {

        expect(loseLife(0)).toEqual({ lives: 0, score: null });
        expect(loseLife(-5)).toEqual({ lives: 0, score: null });

    });

    //  Resuming below zero would end the run again on the same frame; resuming
    //  high would make a life worth more than the mistakes that cost it.
    it('resumes alive, and only just', () => {

        expect(SURVIVAL_REVIVE).toBeGreaterThan(0);
        expect(SURVIVAL_REVIVE).toBeLessThanOrEqual(SCORE_PENALTY * 2);

    });

    it('shelters a rescued run for a stretch and then stops', () => {

        expect(isSheltered(1000, 1000), 'the instant it is granted').toBe(true);
        expect(isSheltered(1000 + SURVIVAL_GRACE - 1, 1000), 'just inside').toBe(true);
        expect(isSheltered(1000 + SURVIVAL_GRACE, 1000), 'just outside').toBe(false);
        expect(isSheltered(9999, 1000), 'long after').toBe(false);

    });

    it('shelters nothing on a run that has not been rescued', () => {

        expect(isSheltered(0, null)).toBe(false);
        expect(isSheltered(99999, null)).toBe(false);

    });

    //  The shelter has to outlast the densest thing the generator can put on
    //  the road, or a life can be spent in the moment it is granted.
    it('lasts longer than the tightest row spacing', () => {

        expect(SURVIVAL_GRACE).toBeGreaterThan(paceAt(MAX_TIER).spacing * 3);

    });

});
