import { describe, expect, it } from 'vitest';
import {
    buildLevel,
    FINISH_GAP,
    GATE_TO_ORBS,
    LEAD_IN,
    LevelSpec,
    ORB_ROW_SPACING,
    rowHasSafeLane,
    SECTION_GAP
} from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';

const base = (sections: LevelSpec['sections'], extra: Partial<LevelSpec> = {}): LevelSpec => ({
    name: 'test',
    world: 'sky',
    palette: [ 'red', 'blue', 'yellow' ],
    sections,
    ...extra
});

describe('a level and its lanes', () => {

    it('gives every row exactly one character per lane', () => {

        //  A short row silently drops a lane; a long one puts an orb where there
        //  is no road. Both build without complaint, so this is the guard.
        for (const spec of LEVELS)
        {
            const lanes = spec.lanes ?? 3;

            for (const section of spec.sections)
            {
                for (const row of section.rows)
                {
                    expect(row.length, `level ${spec.name}: "${row}"`).toBe(lanes);
                    expect(row, `level ${spec.name}`).toMatch(/^[1-5a-eA-E0.*]+$/);
                }
            }
        }

    });

    it('only splits a two-lane level down the middle', () => {

        //  With two lanes there is one boundary, so a gate can only meet on it.
        for (const spec of LEVELS.filter((level) => level.lanes === 2))
        {
            for (const section of spec.sections)
            {
                expect(section.splitAfterLane, `level ${spec.name}`).toBe(0);
            }
        }

    });

});

describe('buildLevel', () => {

    it('places the first gate after the lead-in, in palette colours', () => {

        const level = buildLevel(base([ { splitAfterLane: 0, gate: [ 1, 0 ], rows: [ '2.1' ] } ]));

        expect(level.gates).toHaveLength(1);
        expect(level.gates[0].distance).toBe(LEAD_IN);
        expect(level.gates[0].colors).toEqual([ 'blue', 'red' ]);

    });

    it('reads a row as one character per lane', () => {

        const level = buildLevel(base([ { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '2.1' ] } ]));

        expect(level.orbs).toEqual([
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 0, color: 'blue' },
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 2, color: 'red' }
        ]);

    });

    it('reads letters as barriers of the same palette colours', () => {

        const level = buildLevel(base([
            { splitAfterLane: 0, gate: [ 0, 1 ], obstacles: 'slider', rows: [ 'a.c' ] }
        ]));

        expect(level.orbs).toHaveLength(0);
        expect(level.obstacles).toEqual([
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 0, color: 'red', kind: 'slider', profile: 'full' },
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 2, color: 'yellow', kind: 'slider', profile: 'full' }
        ]);

    });

    //  Capitals are the same barrier, low enough to jump. One character apart
    //  on purpose: a row of hurdles should read as a row of barriers, because
    //  that is what it is.
    it('reads capitals as the same barriers, low enough to jump', () => {

        const level = buildLevel(base([
            { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ 'A.c' ] }
        ]));

        expect(level.obstacles).toHaveLength(2);

        expect(level.obstacles[0].profile).toBe('low');
        expect(level.obstacles[1].profile).toBe('full');

    });

    it('takes a barrier\'s colour from its letter, whatever its case', () => {

        const lower = buildLevel(base([ { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ 'c..' ] } ]));
        const upper = buildLevel(base([ { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ 'C..' ] } ]));

        expect(upper.obstacles[0].color).toBe(lower.obstacles[0].color);
        expect(upper.obstacles[0].profile).not.toBe(lower.obstacles[0].profile);

    });

    it('gives a capital the same movement as the section it is in', () => {

        const level = buildLevel(base([
            { splitAfterLane: 0, gate: [ 0, 1 ], obstacles: 'slider', rows: [ 'B..' ] }
        ]));

        expect(level.obstacles[0].kind).toBe('slider');
        expect(level.obstacles[0].profile).toBe('low');

    });

    it('defaults barriers to static', () => {

        const level = buildLevel(base([ { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ 'a..' ] } ]));

        expect(level.obstacles[0].kind).toBe('static');

    });

    it('spaces rows and carries sections on from the last row', () => {

        const level = buildLevel(base([
            { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '1..', '..2' ] },
            { splitAfterLane: 1, gate: [ 1, 0 ], rows: [ '.1.', '2..' ] }
        ]));

        const firstRow = LEAD_IN + GATE_TO_ORBS;
        const secondGate = firstRow + ORB_ROW_SPACING + SECTION_GAP;

        expect(level.gates.map((gate) => gate.distance)).toEqual([ LEAD_IN, secondGate ]);

    });

    it('puts the finish a fixed gap past the final row', () => {

        const level = buildLevel(base([
            { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '1..', '..2', '.1.' ] }
        ]));

        const lastRow = Math.max(...level.orbs.map((orb) => orb.distance));

        expect(level.finishDistance).toBe(lastRow + FINISH_GAP);

    });

    it('counts a barrier row towards the course length', () => {

        const level = buildLevel(base([
            { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '1..', 'a..' ] }
        ]));

        const lastBarrier = Math.max(...level.obstacles.map((obstacle) => obstacle.distance));

        expect(level.finishDistance).toBe(lastBarrier + FINISH_GAP);

    });

    it('honours a level\'s own row spacing', () => {

        const level = buildLevel(base([ { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '1..', '1..' ] } ], { rowSpacing: 50 }));

        const [ first, second ] = level.orbs.map((orb) => orb.distance);

        expect(second - first).toBe(50);

    });

    it('ignores empty lanes and unknown characters', () => {

        const level = buildLevel(base([ { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '...', 'X?!' ] } ]));

        expect(level.orbs).toHaveLength(0);
        expect(level.obstacles).toHaveLength(0);

    });

    it('falls back to the first palette colour for an index that is not there', () => {

        const level = buildLevel(base([ { splitAfterLane: 0, gate: [ 9, 9 ], rows: [ '5..' ] } ]));

        expect(level.gates[0].colors).toEqual([ 'red', 'red' ]);
        expect(level.orbs[0].color).toBe('red');

    });

});

describe('the rainbow drop', () => {

    it('is read out of a row as a power-up with no colour', () => {

        const level = buildLevel(base([ { splitAfterLane: 0, gate: [ 0, 1 ], rows: [ '.*.' ] } ]));

        expect(level.orbs).toHaveLength(0);
        expect(level.obstacles).toHaveLength(0);
        expect(level.powerUps).toEqual([ { distance: LEAD_IN + GATE_TO_ORBS, lane: 1 } ]);

    });

    it('counts as somewhere safe to be', () => {

        expect(rowHasSafeLane('a*a')).toBe(true);

    });

    it('shows up from level four, once the basics are taught', () => {

        const withPowerUps = LEVELS
            .map((level, index) => ({ index, count: buildLevel(level).powerUps.length }))
            .filter((entry) => entry.count > 0);

        expect(withPowerUps.length).toBeGreaterThan(0);
        expect(Math.min(...withPowerUps.map((entry) => entry.index))).toBeGreaterThanOrEqual(3);

    });

});

describe('rowHasSafeLane', () => {

    it('accepts a row with an empty lane', () => {

        expect(rowHasSafeLane('a.a')).toBe(true);

    });

    it('accepts a row whose only gap is an orb', () => {

        //  An orb is safe to be in: at worst it costs points, never a blocked
        //  route.
        expect(rowHasSafeLane('a1a')).toBe(true);

    });

    it('rejects a row that is barriers all the way across', () => {

        expect(rowHasSafeLane('abc')).toBe(false);

    });

});

describe('the shipped levels', () => {

    it('are twenty, in order', () => {

        expect(LEVELS).toHaveLength(20);
        expect(LEVELS.map((level) => level.name))
            .toEqual(Array.from({ length: 20 }, (_, i) => String(i + 1)));

    });

    //  Ten worlds and twenty levels, so every world is played exactly twice -
    //  once by day and once, much later and much harder, after dark. Twice and
    //  no more: a third visit is a place the game has run out of ideas about.
    it('visit each world at most twice, and never twice by the same light', () => {

        const seen = new Map<string, string[]>();

        for (const level of LEVELS)
        {
            const key = level.world;
            const visits = seen.get(key) ?? [];

            visits.push(level.variant ?? 'day');
            seen.set(key, visits);
        }

        for (const [ world, visits ] of seen)
        {
            expect(visits.length, `world ${world}`).toBeLessThanOrEqual(2);
            expect(new Set(visits).size, `world ${world} lighting`).toBe(visits.length);
        }

    });

    //  And far apart. Two visits three levels apart is a repeat; the whole
    //  point is that the second one arrives long after the first is a memory.
    it('leave a long way between the two visits to a world', () => {

        const first = new Map<string, number>();

        LEVELS.forEach((level, index) => {

            const seen = first.get(level.world);

            if (seen === undefined)
            {
                first.set(level.world, index);

                return;
            }

            expect(index - seen, `world ${level.world}`).toBeGreaterThanOrEqual(8);

        });

    });

    //  A row of hurdles or holes is deliberately full: there is no lane to
    //  steer into, which is exactly what makes it teach the jump. So the rule
    //  is about full-height barriers only - those are the ones that can trap a
    //  player with no way out at all.
    it('never fill a row completely with barriers that cannot be jumped', () => {

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                for (const row of section.rows)
                {
                    const blocking = [ ...row ].filter((character) => 'abcde'.includes(character)).length;

                    //  One short of the lane count, whatever that is, so there
                    //  is always somewhere to go.
                    expect(blocking, `level ${level.name} row "${row}"`)
                        .toBeLessThanOrEqual((level.lanes ?? 3) - 1);
                }
            }
        }

    });

    //  And a row blocked across its whole width must be *entirely* jumpable. A
    //  row mixing a wall with hurdles and no gap would need the player to be in
    //  a particular lane and in the air at once, which is a different game.
    //
    //  Only blockers count. The first version of this counted any occupied
    //  lane, which made a row of two orbs on a two-lane level "full" and
    //  demanded it be jumpable - orbs block nothing, and a dense row of them
    //  is a reward rather than a hazard.
    it('leaves a fully blocked row jumpable end to end', () => {

        const BLOCKERS = 'abcdeABCDE0';

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                for (const row of section.rows)
                {
                    const lanes = level.lanes ?? 3;
                    const blockers = [ ...row ].filter((c) => BLOCKERS.includes(c));

                    if (blockers.length < lanes)
                    {
                        continue;
                    }

                    //  Hurdles and holes both: the way through either is over.
                    const jumpable = blockers.every((c) => 'ABCDE0'.includes(c));

                    expect(jumpable, `level ${level.name} row "${row}"`).toBe(true);
                }
            }
        }

    });

    it('always leave a lane that is safe to be in', () => {

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                for (const row of section.rows)
                {
                    expect(rowHasSafeLane(row), `level ${level.name} row "${row}"`).toBe(true);
                }
            }
        }

    });

    it('only refer to colours their palette actually has', () => {

        for (const level of LEVELS)
        {
            const size = level.palette.length;

            for (const section of level.sections)
            {
                for (const index of section.gate)
                {
                    expect(index, `level ${level.name} gate`).toBeLessThan(size);
                }

                for (const row of section.rows)
                {
                    for (const character of row)
                    {
                        if (character === '.') { continue; }

                        const index = '12345'.includes(character)
                            ? '12345'.indexOf(character)
                            : 'abcde'.indexOf(character);

                        expect(index, `level ${level.name} row "${row}"`).toBeLessThan(size);
                    }
                }
            }
        }

    });

    it('give each section two different gate colours', () => {

        //  A pair whose halves are the same colour would make the choice
        //  meaningless.
        for (const level of LEVELS)
        {
            for (const [ index, section ] of level.sections.entries())
            {
                expect(section.gate[0], `level ${level.name} section ${index}`).not.toBe(section.gate[1]);
            }
        }

    });

    it('introduce barrier kinds one at a time', () => {

        //  A kind must appear on its own in some earlier section before it is
        //  ever mixed with another, so nothing arrives unexplained.
        const seen = new Set<string>();

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                if (section.obstacles)
                {
                    seen.add(section.obstacles);
                }
            }
        }

        expect([ ...seen ].sort()).toEqual([ 'pulse', 'slider', 'static' ]);
        expect(LEVELS[0].sections.every((section) => section.obstacles === undefined)).toBe(true);

    });

    it('get harder without relying on speed alone', () => {

        const speeds = LEVELS.map((level) => level.forwardSpeed ?? 420);
        const spacings = LEVELS.map((level) => level.rowSpacing ?? ORB_ROW_SPACING);
        const colours = LEVELS.map((level) => level.palette.length);

        for (let i = 1; i < LEVELS.length; i++)
        {
            expect(speeds[i], `level ${i + 1} speed`).toBeGreaterThan(speeds[i - 1]);
            expect(spacings[i], `level ${i + 1} spacing`).toBeLessThan(spacings[i - 1]);
            expect(colours[i], `level ${i + 1} colours`).toBeGreaterThanOrEqual(colours[i - 1]);
        }

    });

    it('compile to a course that always ends after its last object', () => {

        for (const level of LEVELS)
        {
            const course = buildLevel(level);

            expect(course.gates.length).toBe(level.sections.length);
            expect(course.orbs.length).toBeGreaterThan(0);

            for (const object of [ ...course.orbs, ...course.obstacles, ...course.gates ])
            {
                expect(object.distance, `level ${level.name}`).toBeLessThan(course.finishDistance);
            }
        }

    });

});
