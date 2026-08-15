import { describe, expect, it } from 'vitest';
import { buildLevel, drainAt, HazardZone } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import { ColorId } from '../src/game/config/constants';

const PLAIN: HazardZone = { from: 1000, to: 2000, drain: 20 };
const RED: HazardZone = { from: 1500, to: 2500, drain: 30, color: 'red' };

describe('what a stretch of road costs', () => {

    it('costs nothing anywhere on a level that has no zones', () => {

        for (const distance of [ -500, 0, 1200, 99999 ])
        {
            expect(drainAt([], distance, 'red'), `at ${distance}`).toBe(0);
        }

    });

    it('charges inside its own stretch and nowhere else', () => {

        expect(drainAt([ PLAIN ], 999, 'red')).toBe(0);
        expect(drainAt([ PLAIN ], 1000, 'red')).toBe(20);
        expect(drainAt([ PLAIN ], 1999, 'red')).toBe(20);

        //  Half open, like every other range in the game: a zone ending where
        //  the next begins must not charge twice on the boundary.
        expect(drainAt([ PLAIN ], 2000, 'red')).toBe(0);

    });

    it('charges a colour hazard only for the colour it objects to', () => {

        expect(drainAt([ RED ], 1600, 'red')).toBe(30);
        expect(drainAt([ RED ], 1600, 'blue')).toBe(0);

    });

    //  A drop between gates carries nothing. A plain zone is a place and still
    //  charges it; a coloured one has nothing to object to.
    it('charges a drop carrying nothing only where the zone has no colour', () => {

        expect(drainAt([ PLAIN ], 1200, null)).toBe(20);
        expect(drainAt([ RED ], 1600, null)).toBe(0);

    });

    //  Two zones over the same road are two costs. Taking the first match
    //  would make whichever was listed second silently free.
    it('adds overlapping zones rather than taking the first', () => {

        expect(drainAt([ PLAIN, RED ], 1700, 'red')).toBe(50);
        expect(drainAt([ RED, PLAIN ], 1700, 'red')).toBe(50);
        expect(drainAt([ PLAIN, RED ], 1700, 'blue')).toBe(20);

    });

    //  The rate is per thousand pixels, which is what makes a zone's price
    //  knowable while authoring and independent of how fast the section runs.
    it('prices a crossing by the road rather than by the clock', () => {

        const crossed = PLAIN.to - PLAIN.from;
        const cost = (drainAt([ PLAIN ], 1500, 'red') * crossed) / 1000;

        expect(cost).toBe(20);

    });

});

describe('the zones the levels actually ship', () => {

    it('never charges for a doorway or for road outside a section', () => {

        for (const spec of LEVELS)
        {
            const level = buildLevel(spec);

            for (const zone of level.hazards)
            {
                expect(zone.to, `level ${spec.name}`).toBeGreaterThan(zone.from);
                expect(zone.drain, `level ${spec.name}`).toBeGreaterThan(0);
                expect(zone.to, `level ${spec.name}`).toBeLessThanOrEqual(level.finishDistance);
            }
        }

    });

    //  The figure that decides whether a zone is a hazard or a death sentence.
    //  Crossing one must cost less than the score a player can reasonably be
    //  holding, or the level is unfinishable for anyone who arrives at it
    //  having made a single mistake.
    it('never charges more for one crossing than a careful run can hold', () => {

        for (const spec of LEVELS)
        {
            const level = buildLevel(spec);

            for (const zone of level.hazards)
            {
                const cost = (zone.drain * (zone.to - zone.from)) / 1000;

                expect(cost, `level ${spec.name}, a zone costing ${cost.toFixed(0)}`)
                    .toBeLessThanOrEqual(120);
            }
        }

    });

    //  A colour hazard has to be a colour the level actually deals in, or it
    //  is a zone that can never trigger and reads as a decorated stretch.
    it('objects only to colours its level can be carrying', () => {

        for (const spec of LEVELS)
        {
            const level = buildLevel(spec);

            for (const zone of level.hazards)
            {
                if (zone.color === undefined)
                {
                    continue;
                }

                expect(spec.palette as ColorId[], `level ${spec.name}`).toContain(zone.color);
            }
        }

    });

});

describe('where the zones arrive on the curve', () => {

    //  The same rule every other mechanic is held to: nothing new before the
    //  player has been given the tools to survive it, and never two new things
    //  in one level. A drain is the first hazard that is not on the road but
    //  *is* the road, so it belongs late.
    it('introduces a plain drain before a coloured one, and both late', () => {

        let plain: number | null = null;
        let coloured: number | null = null;

        LEVELS.forEach((spec, index) => {

            for (const zone of buildLevel(spec).hazards)
            {
                if (zone.color === undefined) { plain ??= index; }
                else { coloured ??= index; }
            }

        });

        expect(plain, 'a plain drain').not.toBeNull();
        expect(coloured, 'a colour hazard').not.toBeNull();

        //  Plain first: a place that costs, before a place that costs only if
        //  you are wearing the wrong thing.
        expect(plain!).toBeLessThan(coloured!);

        //  Both in the back third, after every movement mechanic is taught.
        expect(plain!, 'the first drain').toBeGreaterThanOrEqual(12);

    });

    //  A colour hazard the player cannot avoid is a tax, not a decision. The
    //  gate before it has to offer a way past, or the zone is just a fee for
    //  reaching level seventeen.
    it('lets the gate before a colour hazard choose a colour it allows', () => {

        for (const spec of LEVELS)
        {
            const level = buildLevel(spec);

            for (const [ index, section ] of spec.sections.entries())
            {
                if (section.drainColor === undefined)
                {
                    continue;
                }

                const offered = section.gate.map((i) => spec.palette[i]);
                const objected = spec.palette[section.drainColor];

                expect(offered, `level ${spec.name} section ${index + 1}`).toContain(objected);
                expect(
                    offered.filter((c) => c !== objected).length,
                    `level ${spec.name} section ${index + 1}: a way past`
                ).toBeGreaterThan(0);
            }

            void level;
        }

    });

});
