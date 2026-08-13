import { beforeEach, describe, expect, it } from 'vitest';
import {
    ColorId,
    DEFAULT_LANES,
    FORWARD_SPEED,
    GATE_SWAP_SPAN,
    GATE_SWAP_START,
    LANE_CHANGE_SPEED,
    ORB_CATCH_RADIUS,
    SWIPE_REPEAT_DELAY
} from '../src/game/config/constants';
import { buildLevel } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import { GATE_SWAP_REACTION, gateColorsAt, gateSwapFlash, gateSwapProgress } from '../src/game/systems/gates';
import { laneCount, laneWidth, useLanes } from '../src/game/systems/Lanes';

const PAIR: [ ColorId, ColorId ] = [ 'red', 'blue' ];

/** A gate a long way down the course, so there is road on both sides of it. */
const AT = 10000;

describe('a gate that does not swap', () => {

    it('never changes what it is', () => {

        for (let d = 0; d <= AT + 500; d += 97)
        {
            expect(gateColorsAt(PAIR, AT, d, false), `at ${d}`).toEqual(PAIR);
        }

    });

    it('never flashes', () => {

        for (let d = 0; d <= AT + 500; d += 97)
        {
            expect(gateSwapFlash(AT, d, false), `at ${d}`).toBe(0);
        }

    });

});

describe('a gate that swaps', () => {

    it('is what it says it is until the swap begins', () => {

        expect(gateColorsAt(PAIR, AT, 0, true)).toEqual(PAIR);
        expect(gateColorsAt(PAIR, AT, AT - GATE_SWAP_START - 1, true)).toEqual(PAIR);

    });

    //  Halfway, not at the end. A gate that has finished changing colour but
    //  still answers as its old self is a lie rather than a twist, and one that
    //  answers as its new self before it looks like it is the same thing the
    //  other way round.
    it('trades sides at the halfway point of the change', () => {

        const start = AT - GATE_SWAP_START;

        expect(gateColorsAt(PAIR, AT, start + (GATE_SWAP_SPAN * 0.49), true), 'just before')
            .toEqual(PAIR);

        expect(gateColorsAt(PAIR, AT, start + (GATE_SWAP_SPAN * 0.51), true), 'just after')
            .toEqual([ PAIR[1], PAIR[0] ]);

    });

    it('has finished swapping by the time it is reached', () => {

        expect(gateSwapProgress(AT, AT, true)).toBe(1);
        expect(gateColorsAt(PAIR, AT, AT, true)).toEqual([ PAIR[1], PAIR[0] ]);

    });

    it('holds its new colours from the swap all the way to contact', () => {

        const done = AT - GATE_SWAP_REACTION;

        for (let d = done; d <= AT; d += 13)
        {
            expect(gateColorsAt(PAIR, AT, d, true), `at ${d}`).toEqual([ PAIR[1], PAIR[0] ]);
        }

    });

    it('flashes hardest exactly where the colours change hands', () => {

        const start = AT - GATE_SWAP_START;

        expect(gateSwapFlash(AT, start, true), 'at the start').toBeCloseTo(0, 5);
        expect(gateSwapFlash(AT, start + (GATE_SWAP_SPAN / 2), true), 'at the middle').toBeCloseTo(1, 5);
        expect(gateSwapFlash(AT, start + GATE_SWAP_SPAN, true), 'at the end').toBeCloseTo(0, 5);

    });

    it('is not flashing at any point the player is not being asked to look', () => {

        expect(gateSwapFlash(AT, 0, true)).toBe(0);
        expect(gateSwapFlash(AT, AT, true)).toBe(0);
        expect(gateSwapFlash(AT, AT + 5000, true)).toBe(0);

    });

    //  Total: the gate is asked every frame, from before it exists on screen to
    //  after it is behind the player.
    it('answers at any distance at all', () => {

        for (let d = -5000; d < AT + 5000; d += 211)
        {
            const colors = gateColorsAt(PAIR, AT, d, true);
            const flash = gateSwapFlash(AT, d, true);

            expect(new Set(colors).size, `at ${d}`).toBe(2);
            expect(flash, `at ${d}`).toBeGreaterThanOrEqual(0);
            expect(flash, `at ${d}`).toBeLessThanOrEqual(1);
        }

    });

});

describe('the swap being fair', () => {

    beforeEach(() => useLanes(DEFAULT_LANES));

    /** How much road it takes to get from one side of the track to the other. */
    function crossingDistance (speed: number): number
    {
        const seconds = (
            SWIPE_REPEAT_DELAY
            + ((Math.log(((laneCount() - 1) * laneWidth()) / ORB_CATCH_RADIUS) / LANE_CHANGE_SPEED) * 1000)
        ) / 1000;

        return speed * seconds;
    }

    //  The whole mechanic rests on this. A swap that completes with less road
    //  left than a lane change costs is a gate nobody can answer, however well
    //  they are watching - and it would be a bug nothing else in the suite
    //  would notice, because every level would still compile and play.
    it('leaves room to cross the whole track on every level that uses it', () => {

        for (const spec of LEVELS)
        {
            useLanes(spec.lanes ?? DEFAULT_LANES);

            if (!spec.sections.some((section) => section.gateSwap))
            {
                continue;
            }

            //  The fastest this level ever runs, since a speed zone shortens
            //  exactly this window.
            const speed = (spec.forwardSpeed ?? FORWARD_SPEED)
                * Math.max(1, ...spec.sections.map((section) => section.speed ?? 1));

            expect(GATE_SWAP_REACTION, `level ${spec.name}`)
                .toBeGreaterThan(crossingDistance(speed) * 2);
        }

    });

    it('starts the swap after the swap has somewhere to finish', () => {

        expect(GATE_SWAP_SPAN).toBeLessThan(GATE_SWAP_START);
        expect(GATE_SWAP_REACTION).toBeGreaterThan(0);

    });

});

describe('where the swap appears in the game', () => {

    /** Level indices whose gates swap, in order. */
    function levelsWithSwap (): number[]
    {
        return LEVELS
            .map((spec, index) => ({ index, has: spec.sections.some((section) => section.gateSwap) }))
            .filter((entry) => entry.has)
            .map((entry) => entry.index);
    }

    it('exists at all', () => {

        expect(levelsWithSwap().length).toBeGreaterThan(0);

    });

    //  Every other kind in this game is introduced on its own before it is
    //  combined with anything, and a gate that changes its mind is the hardest
    //  thing to read in the game - so it arrives late and it arrives alone.
    it('arrives late, once every other kind has been met', () => {

        expect(Math.min(...levelsWithSwap())).toBeGreaterThanOrEqual(8);

    });

    it('is met first on a stretch with nothing else on the road', () => {

        const first = Math.min(...levelsWithSwap());
        const spec = LEVELS[first];

        const introduction = spec.sections.find((section) => section.gateSwap);

        //  No barriers of any kind in the section that introduces it. Orbs are
        //  fine - they are what makes the colour question worth answering.
        for (const row of introduction!.rows)
        {
            expect(row, `level ${spec.name}`).toMatch(/^[1-5.]+$/);
        }

    });

    it('compiles onto the gate rather than being lost between the two', () => {

        for (const spec of LEVELS)
        {
            const level = buildLevel(spec);

            spec.sections.forEach((section, index) => {

                expect(level.gates[index].swap ?? false, `level ${spec.name} section ${index}`)
                    .toBe(section.gateSwap ?? false);

            });
        }

    });

});
