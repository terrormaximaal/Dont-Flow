import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/config/levels';
import { demandOf, hasPressure, isRecovery, RECOVERY_PRESSURE, routeOf, shapeOf } from '../src/game/config/shape';

describe('what a doorway is worth', () => {

    //  The defect this file was written to find, and the reason measuring a
    //  section beats reading it. Twenty sections shipped with a doorway that
    //  collected nothing at all: every orb behind it belonged to the other
    //  colour, so taking it meant a whole section of walls for no score, with
    //  no way to know in advance. Not a risk-and-reward route - a door with a
    //  cost and no upside.
    it('never offers a doorway that collects nothing', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            for (const [ at, section ] of spec.sections.entries())
            {
                for (const gate of section.gate)
                {
                    const shape = shapeOf(spec, at, spec.palette[gate]);

                    expect(
                        shape.matching,
                        `level ${index + 1} section ${at + 1}, the ${spec.palette[gate]} door`
                    ).toBeGreaterThan(0);
                }
            }
        }

    });

    //  And the other end of it: a doorway worth so much more than its partner
    //  that there is nothing to weigh. A choice is only a choice while both
    //  answers are defensible.
    //
    //  Four, a shade above the widest split in the game, which is 3.25.
    //  A regression guard rather than a standard discovered from first
    //  principles: a lopsided doorway is the whole idea of a route, and the
    //  only real claim here is that it must not grow past the point where the
    //  cheaper door stops being defensible.
    it('never makes one doorway worth more than four times the other', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            for (let at = 0; at < spec.sections.length; at++)
            {
                const route = routeOf(spec, at);

                if (route === null)
                {
                    continue;
                }

                expect(
                    route.bold.matching / route.safe.matching,
                    `level ${index + 1} section ${at + 1}`
                ).toBeLessThanOrEqual(4);
            }
        }

    });

});

describe('somewhere to get a run back', () => {

    //  Score is the survival condition, so a level that never lets a run
    //  recover is a level that only forgives players who never slip. Every one
    //  needs somewhere the score can be rebuilt.
    it('gives every level at least two places to recover', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            if (!hasPressure(spec))
            {
                continue;
            }

            const rests = spec.sections.filter((_, at) => isRecovery(spec, at)).length;

            expect(rests, `level ${index + 1}`).toBeGreaterThanOrEqual(2);
        }

    });

    //  A run of hard sections with no relief between them is where a level
    //  stops being difficult and starts being attritional: each one takes a
    //  little score, none of them gives any back, and the run dies several
    //  sections after the mistake that killed it.
    //  Six is the longest run in the game, in the back half of level twenty,
    //  where sustained pressure is the point. This holds that shape rather than
    //  imposing a new one: the number is measured, not chosen, and what it
    //  guards is that the run cannot quietly get longer as levels are edited.
    it('never runs seven pressured sections together without relief', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            let since = 0;

            for (let at = 0; at < spec.sections.length; at++)
            {
                if (isRecovery(spec, at) || shapeOf(spec, at).pressure <= RECOVERY_PRESSURE)
                {
                    since = 0;

                    continue;
                }

                since += 1;

                expect(
                    since,
                    `level ${index + 1}: ${since} sections deep by section ${at + 1}`
                ).toBeLessThanOrEqual(6);
            }
        }

    });

    //  A rest at the end is not a rest, it is an anticlimax - and the finale is
    //  meant to be the hardest thing in the level.
    it('never ends a level on a recovery section', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            if (!hasPressure(spec))
            {
                continue;
            }

            expect(
                isRecovery(spec, spec.sections.length - 1),
                `level ${index + 1}`
            ).toBe(false);
        }

    });

});

describe('the pressure across a level', () => {

    //  The curve, measured rather than asserted. The back half of a level has
    //  to lean on the player harder than the front half, or the shape the
    //  rework asks for exists only in the section names.
    it('leans harder in the back half than the front', () => {

        for (const [ index, spec ] of LEVELS.entries())
        {
            if (!hasPressure(spec))
            {
                continue;
            }

            const middle = Math.floor(spec.sections.length / 2);

            const mean = (from: number, to: number): number => {
                let total = 0;

                for (let at = from; at < to; at++) { total += shapeOf(spec, at).pressure; }

                return total / (to - from);
            };

            expect(
                mean(middle, spec.sections.length),
                `level ${index + 1}`
            ).toBeGreaterThan(mean(0, middle));
        }

    });

});

describe('the curve across the twenty', () => {

    //  Written after measuring, because measuring said something surprising.
    //  Hazard density is *not* monotonic: it dips nineteen per cent from level
    //  eight to nine and fifteen from twelve to thirteen, which read at first
    //  like the difficulty curve inverting the way the durations once did.
    //
    //  It is not inverting. Those levels arrive faster than the ones before
    //  them, and the road coming at you quicker is a demand whether or not
    //  there is anything on it. Neither figure says that alone, so the guard
    //  is on the sum - and no level was rebalanced to make it pass, because
    //  once the right thing was measured there was nothing wrong.
    it('asks more of the player at every step, all twenty of them', () => {

        for (let at = 1; at < LEVELS.length; at++)
        {
            expect(
                demandOf(LEVELS[at]),
                `level ${at + 1} against level ${at}`
            ).toBeGreaterThan(demandOf(LEVELS[at - 1]));
        }

    });

    //  And it must climb rather than creep: the last level should be a
    //  markedly different proposition from the first, not a slightly busier
    //  one.
    it('ends up asking several times what it started with', () => {

        expect(demandOf(LEVELS[LEVELS.length - 1]) / demandOf(LEVELS[0]))
            .toBeGreaterThan(3);

    });

});
