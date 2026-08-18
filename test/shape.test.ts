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
                for (const [ side, gate ] of section.gate.entries())
                {
                    //  A barred doorway is meant to collect nothing - that is
                    //  what barring it means, and the section behind it is
                    //  written in the colour still on offer. Asking it to pay
                    //  would be asking it not to be barred.
                    if (section.gateSealed === side)
                    {
                        continue;
                    }

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

        //  Barred doorways excepted, for the reason above: one side of a sealed
        //  gate is closed, so the two sides are not being compared.

        for (const [ index, spec ] of LEVELS.entries())
        {
            for (let at = 0; at < spec.sections.length; at++)
            {
                if (spec.sections[at].gateSealed !== undefined)
                {
                    continue;
                }

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

        for (let at = 1; at < 20; at++)
        {
            expect(
                demandOf(LEVELS[at]),
                `level ${at + 1} against level ${at}`
            ).toBeGreaterThan(demandOf(LEVELS[at - 1]));
        }

    });

    //  And the thirty that follow all ask more than level twenty does.
    //
    //  More than that cannot honestly be asked of this measure, and finding out
    //  why was most of the work of building them. Demand is rows per second
    //  plus hazards per second. The first term is nearly fixed after level
    //  twenty - the pace has 10% of headroom left before it crosses the floor a
    //  lane change needs - so the whole of a rising curve would have to come out
    //  of the second, and the second saturates: past a certain density every
    //  row already has something on it and adding more changes what a movement
    //  is made of rather than how much it asks.
    //
    //  Pushed to that ceiling, the thirty measure as a plateau a little above
    //  level twenty rather than a climb - and they measure that way because a
    //  climb by this measure alone would mean thirty levels packed to the same
    //  maximum, which is the one thing they must not be. What actually rises
    //  across them is length, the number of mechanics a level combines, and how
    //  little relief there is between them. Those are guarded below and in
    //  pacing.test; this one guards the floor.
    it('all ask more than the twenty that came before them', () => {

        for (let at = 20; at < LEVELS.length; at++)
        {
            expect(demandOf(LEVELS[at]), `level ${at + 1} against level 20`)
                .toBeGreaterThan(demandOf(LEVELS[19]));
        }

    });

    //  What does climb, band by band: how much a level combines. A late level
    //  is measured by how many different kinds of problem it puts in one place -
    //  barrier kinds, doorways that swap or are barred, stretches that charge
    //  score - because that is what these levels get harder by.
    it('combines more mechanics band by band', () => {

        const combining = (spec: typeof LEVELS[number]): number => {

            const kinds = new Set<string>();

            for (const section of spec.sections)
            {
                if (section.obstacles) { kinds.add(section.obstacles); }
                if (section.gateSwap) { kinds.add('swap'); }
                if (section.gateSealed !== undefined) { kinds.add('sealed'); }
                if (section.drain) { kinds.add('drain'); }
            }

            return kinds.size;
        };

        const bands: number[] = [];

        for (let at = 20; at < LEVELS.length; at += 5)
        {
            const band = LEVELS.slice(at, at + 5).map(combining);

            bands.push(band.reduce((a, b) => a + b, 0) / band.length);
        }

        expect(bands[bands.length - 1], 'the last band against the first')
            .toBeGreaterThan(bands[0]);

    });

    //  And it must climb rather than creep: the last level should be a
    //  markedly different proposition from the first, not a slightly busier
    //  one.
    it('ends up asking several times what it started with', () => {

        expect(demandOf(LEVELS[LEVELS.length - 1]) / demandOf(LEVELS[0]))
            .toBeGreaterThan(3);

    });

});
