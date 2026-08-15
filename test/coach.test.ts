import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES } from '../src/game/config/constants';
import { buildLevel } from '../src/game/config/level';
import { LEVELS } from '../src/game/config/levels';
import { COACH_HOLD, COACH_LEAD, firstForcedJump, isPrompting, wordsFor } from '../src/game/systems/coach';

describe('the row that has to be taught', () => {

    //  The problem this exists for, stated as a fact about the shipped levels
    //  so that nobody can quietly remove the teaching and leave the wall.
    it('exists on level seven, and not before it', () => {

        for (let index = 0; index < 6; index++)
        {
            const spec = LEVELS[index];

            expect(
                firstForcedJump(buildLevel(spec), spec.lanes ?? DEFAULT_LANES),
                `level ${index + 1} asks for a jump before one has been taught`
            ).toBeNull();
        }

        const seventh = LEVELS[6];

        expect(
            firstForcedJump(buildLevel(seventh), seventh.lanes ?? DEFAULT_LANES),
            'level 7'
        ).not.toBeNull();

    });

    //  And it is a wall rather than a setback: a player who does not know the
    //  input cannot get past it at all, however well they play.
    it('is far enough into the level to be a wall rather than a false start', () => {

        const spec = LEVELS[6];
        const level = buildLevel(spec);
        const at = firstForcedJump(level, spec.lanes ?? DEFAULT_LANES)!;

        expect(at / level.finishDistance, 'how far in it sits').toBeGreaterThan(0.2);

    });

    it('finds the earliest one rather than any of them', () => {

        const spec = LEVELS[6];
        const level = buildLevel(spec);
        const at = firstForcedJump(level, spec.lanes ?? DEFAULT_LANES)!;

        const lanes = spec.lanes ?? DEFAULT_LANES;
        const rows = new Map<number, typeof level.obstacles>();

        for (const obstacle of level.obstacles)
        {
            rows.set(obstacle.distance, [ ...(rows.get(obstacle.distance) ?? []), obstacle ]);
        }

        for (const [ distance, obstacles ] of rows)
        {
            const forced = new Set(obstacles.map((o) => o.lane)).size >= lanes
                && obstacles.every((o) => o.profile !== 'full');

            if (forced)
            {
                expect(distance).toBeGreaterThanOrEqual(at);
            }
        }

    });

});

describe('when a prompt is on screen', () => {

    it('arrives before the thing it is about', () => {

        const target = 10000;

        expect(isPrompting(target - COACH_LEAD - 1, target), 'too early').toBe(false);
        expect(isPrompting(target - COACH_LEAD, target), 'the moment it is due').toBe(true);

    });

    //  A prompt that vanishes just before the moment it warned about has taught
    //  nothing at all - which is why it is held for longer than its own lead.
    it('is still there when the thing arrives', () => {

        const target = 10000;

        expect(isPrompting(target, target), 'at the row itself').toBe(true);
        expect(COACH_HOLD, 'held longer than the lead').toBeGreaterThan(COACH_LEAD);

    });

    it('goes away afterwards rather than staying up', () => {

        const target = 10000;

        expect(isPrompting(target + COACH_HOLD, target)).toBe(false);

    });

    //  Enough road to read four short words and act on them. At the pace level
    //  seven runs, this is a little over two seconds.
    it('gives long enough to read at the pace it is read at', () => {

        const seconds = COACH_LEAD / (LEVELS[6].forwardSpeed ?? 420);

        expect(seconds, 'seconds of warning on level 7').toBeGreaterThan(1.5);

    });

});

describe('what a prompt says', () => {

    it('says the input rather than describing the obstacle', () => {

        //  "A barrier ahead" tells a player what they can already see. The one
        //  thing they cannot work out is which finger movement answers it.
        expect(wordsFor('jump')).toContain('UP');
        expect(wordsFor('move')).toContain('SWIPE');

    });

    it('stays short enough to read at speed', () => {

        for (const lesson of [ 'move', 'jump' ] as const)
        {
            expect(wordsFor(lesson).length, lesson).toBeLessThanOrEqual(18);
        }

    });

});
