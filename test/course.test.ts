import { describe, expect, it } from 'vitest';
import { DEFAULT_LANES, JUMP_CLEAR_HEIGHT } from '../src/game/config/constants';
import { Level } from '../src/game/config/level';
import { Course } from '../src/game/systems/Course';
import { laneCenterX, useLanes } from '../src/game/systems/Lanes';

/** Enough of a scene for the course to build its objects into. */
function stubScene (): unknown
{
    const gfx: Record<string, unknown> = new Proxy({}, { get: () => () => gfx });

    return { add: { graphics: () => gfx, circle: () => gfx, text: () => gfx } };
}

/** Runs a course past a single orb in lane 1 and reports how often it was taken. */
function runPastOrb (targetLane: number, height: number): number
{
    useLanes(DEFAULT_LANES);

    let taken = 0;

    const level: Level = {
        gates: [],
        orbs: [ { distance: 1000, lane: 1, color: 'red' } ],
        obstacles: [],
        powerUps: [],
        zones: [],
        finishDistance: 100000
    };

    //  eslint-disable-next-line @typescript-eslint/no-explicit-any
    const course = new Course(stubScene() as any, level, {
        onGate: () => {},
        onOrb: () => { taken++; },
        onBlocked: () => {},
        onFinish: () => {}
    });

    for (let travelled = 900; travelled <= 1100; travelled += 10)
    {
        //  Sitting right on the orb the whole way past. What varies is where the
        //  drop is *going* and how high it is.
        course.update(travelled, laneCenterX(1), laneCenterX(targetLane), 'red', false, height);
    }

    return taken;
}

function courseWith (profile: 'full' | 'low' | 'gap', onBlocked: () => void): Course
{
    useLanes(DEFAULT_LANES);

    const level: Level = {
        gates: [],
        orbs: [],
        obstacles: [ { distance: 1000, lane: 1, color: 'red', kind: 'static', profile } ],
        powerUps: [],
        zones: [],
        finishDistance: 100000
    };

    //  eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Course(stubScene() as any, level, {
        onGate: () => {},
        onOrb: () => {},
        onBlocked,
        onFinish: () => {}
    });
}

/** Runs a course past the barrier at a given height and reports the hits. */
function runPast (
    profile: 'full' | 'low' | 'gap',
    height: number,
    color: 'red' | 'blue' = 'blue',
    wild = false
): number
{
    let hits = 0;

    const course = courseWith(profile, () => { hits++; });

    for (let travelled = 900; travelled <= 1100; travelled += 10)
    {
        //  Sitting in the barrier's own lane. 'blue' is the worst case against
        //  a red barrier; 'red' is the colour that would excuse one.
        course.update(travelled, laneCenterX(1), laneCenterX(1), color, wild, height);
    }

    return hits;
}

describe('a barrier the course is carrying', () => {

    //  The unit rule is tested next door in jump.test. This is the wiring:
    //  whether the height the drop reports actually reaches the rule, which is
    //  a different thing and the one more likely to be got wrong.
    it('blocks a grounded drop whatever its profile', () => {

        expect(runPast('full', 0), 'full').toBe(1);
        expect(runPast('low', 0), 'low').toBe(1);

    });

    it('lets a jumping drop over a low one', () => {

        expect(runPast('low', 1)).toBe(0);
        expect(runPast('low', JUMP_CLEAR_HEIGHT)).toBe(0);

    });

    //  The regression for every level built before the jump existed.
    it('never lets a jumping drop through a full-height one', () => {

        for (let height = 0; height <= 1; height += 0.1)
        {
            expect(runPast('full', height), `height ${height.toFixed(1)}`).toBe(1);
        }

    });

    it('still blocks a low one from a drop that has barely left the road', () => {

        expect(runPast('low', JUMP_CLEAR_HEIGHT - 0.05)).toBe(1);

    });

    //  Height is the last argument and defaults to zero, so anything calling
    //  the old way must still get the old answer.
    it('treats a caller that passes no height as grounded', () => {

        let hits = 0;

        const course = courseWith('low', () => { hits++; });

        for (let travelled = 900; travelled <= 1100; travelled += 10)
        {
            course.update(travelled, laneCenterX(1), laneCenterX(1), 'blue');
        }

        expect(hits).toBe(1);

    });

});

describe('an orb the course is carrying', () => {

    it('is collected by a drop settling in its lane', () => {

        expect(runPastOrb(1, 0)).toBe(1);

    });

    //  Passing over a lane on the way to another one is travel, not arrival.
    //  Without this, a two-lane swipe takes whatever is in the middle lane -
    //  including the wrong colour it was swiping to avoid.
    it('is left alone by a drop only crossing its lane', () => {

        expect(runPastOrb(0, 0), 'crossing to the left').toBe(0);
        expect(runPastOrb(2, 0), 'crossing to the right').toBe(0);

    });

    //  An orb sits on the road like everything else on it.
    it('is cleared by jumping over it', () => {

        expect(runPastOrb(1, 1), 'top of the arc').toBe(0);
        expect(runPastOrb(1, JUMP_CLEAR_HEIGHT), 'just high enough').toBe(0);
        expect(runPastOrb(1, JUMP_CLEAR_HEIGHT - 0.05), 'barely off the road').toBe(1);

    });

});

describe('a hole in the road', () => {

    it('swallows a grounded drop', () => {

        expect(runPast('gap', 0)).toBe(1);

    });

    it('is cleared by jumping it', () => {

        expect(runPast('gap', 1)).toBe(0);
        expect(runPast('gap', JUMP_CLEAR_HEIGHT)).toBe(0);

    });

    //  The whole point of the profile. Every other hazard in the game is a
    //  question about which colour you are carrying; this one is not, and the
    //  colour that would walk you through the identical barrier does nothing.
    it('is not excused by carrying its colour', () => {

        expect(runPast('full', 0, 'red'), 'wall of your colour').toBe(0);
        expect(runPast('gap', 0, 'red'), 'hole of your colour').toBe(1);

    });

    it('is not excused by a rainbow drop either', () => {

        expect(runPast('full', 0, 'blue', true), 'wall while rainbow').toBe(0);
        expect(runPast('gap', 0, 'blue', true), 'hole while rainbow').toBe(1);

    });

});
