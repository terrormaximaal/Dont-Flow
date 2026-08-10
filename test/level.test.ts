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
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 0, color: 'red', kind: 'slider' },
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 2, color: 'yellow', kind: 'slider' }
        ]);

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

    it('are ten, in order', () => {

        expect(LEVELS).toHaveLength(10);
        expect(LEVELS.map((level) => level.name)).toEqual([ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10' ]);

    });

    it('each have their own world', () => {

        const worlds = LEVELS.map((level) => level.world);

        expect(new Set(worlds).size).toBe(LEVELS.length);

    });

    it('describe every row with one character per lane', () => {

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                for (const row of section.rows)
                {
                    expect(row, `level ${level.name}`).toHaveLength(3);
                    expect(row, `level ${level.name}`).toMatch(/^[1-5a-e.]{3}$/);
                }
            }
        }

    });

    it('never fill a row completely', () => {

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                for (const row of section.rows)
                {
                    const filled = [ ...row ].filter((character) => character !== '.').length;

                    expect(filled, `level ${level.name} row "${row}"`).toBeLessThanOrEqual(2);
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
