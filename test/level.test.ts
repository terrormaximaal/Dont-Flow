import { describe, expect, it } from 'vitest';
import {
    buildLevel,
    FINISH_GAP,
    GATE_TO_ORBS,
    LEAD_IN,
    ORB_ROW_SPACING,
    SECTION_GAP
} from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';

describe('buildLevel', () => {

    it('places the first gate after the lead-in', () => {

        const level = buildLevel({
            name: 'test',
            sections: [ { splitAfterLane: 0, colors: [ 'blue', 'red' ], rows: [ 'B.R' ] } ]
        });

        expect(level.gates).toHaveLength(1);
        expect(level.gates[0].distance).toBe(LEAD_IN);
        expect(level.gates[0].splitAfterLane).toBe(0);
        expect(level.gates[0].colors).toEqual([ 'blue', 'red' ]);

    });

    it('reads a row as one character per lane', () => {

        const level = buildLevel({
            name: 'test',
            sections: [ { splitAfterLane: 0, colors: [ 'blue', 'red' ], rows: [ 'B.R' ] } ]
        });

        expect(level.orbs).toEqual([
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 0, color: 'blue' },
            { distance: LEAD_IN + GATE_TO_ORBS, lane: 2, color: 'red' }
        ]);

    });

    it('spaces rows and carries sections on from the last orb', () => {

        const level = buildLevel({
            name: 'test',
            sections: [
                { splitAfterLane: 0, colors: [ 'blue', 'red' ], rows: [ 'B..', '..R' ] },
                { splitAfterLane: 1, colors: [ 'red', 'blue' ], rows: [ '.R.', 'B..' ] }
            ]
        });

        const firstRow = LEAD_IN + GATE_TO_ORBS;
        const lastRowOfFirst = firstRow + ORB_ROW_SPACING;
        const secondGate = lastRowOfFirst + SECTION_GAP;

        expect(level.gates.map((gate) => gate.distance)).toEqual([ LEAD_IN, secondGate ]);
        expect(level.orbs.map((orb) => orb.distance)).toEqual([
            firstRow,
            lastRowOfFirst,
            secondGate + GATE_TO_ORBS,
            secondGate + GATE_TO_ORBS + ORB_ROW_SPACING
        ]);

    });

    it('puts the finish a fixed gap past the final orb', () => {

        const level = buildLevel({
            name: 'test',
            sections: [ { splitAfterLane: 0, colors: [ 'blue', 'red' ], rows: [ 'B..', '..R', '.B.' ] } ]
        });

        const lastOrb = Math.max(...level.orbs.map((orb) => orb.distance));

        expect(level.finishDistance).toBe(lastOrb + FINISH_GAP);

    });

    it('honours a level\'s own row spacing', () => {

        const level = buildLevel({
            name: 'test',
            rowSpacing: 50,
            sections: [ { splitAfterLane: 0, colors: [ 'blue', 'red' ], rows: [ 'B..', 'B..' ] } ]
        });

        const [ first, second ] = level.orbs.map((orb) => orb.distance);

        expect(second - first).toBe(50);

    });

    it('ignores empty lanes and unknown characters', () => {

        const level = buildLevel({
            name: 'test',
            sections: [ { splitAfterLane: 0, colors: [ 'blue', 'red' ], rows: [ '...', 'X?!' ] } ]
        });

        expect(level.orbs).toHaveLength(0);

    });

});

describe('the shipped levels', () => {

    //  Three orbs in a row would leave no empty lane, forcing the drop through
    //  an orb it may not match. A combo should only break through a mistake.
    it('never fill a row completely', () => {

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                for (const row of section.rows)
                {
                    const orbs = [ ...row ].filter((character) => character !== '.').length;

                    expect(orbs, `level ${level.name} row "${row}"`).toBeLessThanOrEqual(2);
                }
            }
        }

    });

    it('describe every row with one character per lane', () => {

        for (const level of LEVELS)
        {
            for (const section of level.sections)
            {
                for (const row of section.rows)
                {
                    expect(row, `level ${level.name}`).toHaveLength(3);
                    expect(row, `level ${level.name}`).toMatch(/^[BR.]{3}$/);
                }
            }
        }

    });

    it('offer both colours in every section, so either gate is playable', () => {

        for (const level of LEVELS)
        {
            for (const [ index, section ] of level.sections.entries())
            {
                const joined = section.rows.join('');

                expect(joined, `level ${level.name} section ${index}`).toContain('B');
                expect(joined, `level ${level.name} section ${index}`).toContain('R');
            }
        }

    });

    it('compile to a course that always ends after its last orb', () => {

        for (const level of LEVELS)
        {
            const course = buildLevel(level);

            expect(course.gates.length).toBe(level.sections.length);
            expect(course.orbs.length).toBeGreaterThan(0);

            for (const orb of course.orbs)
            {
                expect(orb.distance, `level ${level.name}`).toBeLessThan(course.finishDistance);
            }

            for (const gate of course.gates)
            {
                expect(gate.distance, `level ${level.name}`).toBeLessThan(course.finishDistance);
            }
        }

    });

});
