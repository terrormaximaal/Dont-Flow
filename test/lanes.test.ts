import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_LANES, GAME_WIDTH, LANE_CHANGE_SPEED, TRACK_LEFT, TRACK_WIDTH } from '../src/game/config/constants';
import { clampLane, laneCenterX, laneCount, laneWidth, startLane, useLanes } from '../src/game/systems/Lanes';
import { clamp, easeTowards } from '../src/game/utils/math';

//  The layout is shared state, set once as a level is built, so anything that
//  changes it has to put it back.
afterEach(() => useLanes(DEFAULT_LANES));

describe('the track laid out in three lanes', () => {

    it('centres the middle lane on the track', () => {

        useLanes(3);

        expect(laneCenterX(1)).toBe(GAME_WIDTH / 2);

    });

    it('spaces lanes evenly and keeps them inside the track', () => {

        useLanes(3);

        for (let lane = 0; lane < laneCount(); lane++)
        {
            const x = laneCenterX(lane);

            expect(x).toBeGreaterThan(TRACK_LEFT);
            expect(x).toBeLessThan(TRACK_LEFT + TRACK_WIDTH);
        }

        expect(laneCenterX(1) - laneCenterX(0)).toBe(laneWidth());
        expect(laneCenterX(2) - laneCenterX(1)).toBe(laneWidth());

    });

    it('starts the drop in the middle', () => {

        useLanes(3);

        expect(startLane()).toBe(1);

    });

});

describe('the track laid out in two lanes', () => {

    it('uses the same road, in wider lanes', () => {

        useLanes(2);

        expect(laneWidth()).toBe(TRACK_WIDTH / 2);
        expect(laneCenterX(0)).toBe(TRACK_LEFT + (TRACK_WIDTH / 4));
        expect(laneCenterX(1)).toBe(TRACK_LEFT + ((TRACK_WIDTH / 4) * 3));

    });

    it('has no lane past the second', () => {

        useLanes(2);

        expect(laneCount()).toBe(2);
        expect(clampLane(2)).toBe(1);

    });

    it('starts the drop on the left, there being no middle', () => {

        useLanes(2);

        expect(startLane()).toBe(0);

    });

});

describe('clampLane', () => {

    it('leaves valid lanes alone', () => {

        expect(clampLane(0)).toBe(0);
        expect(clampLane(1)).toBe(1);
        expect(clampLane(2)).toBe(2);

    });

    it('holds at the edges rather than wrapping', () => {

        expect(clampLane(-1)).toBe(0);
        expect(clampLane(-99)).toBe(0);
        expect(clampLane(laneCount())).toBe(laneCount() - 1);
        expect(clampLane(99)).toBe(laneCount() - 1);

    });

});

describe('clamp', () => {

    it('bounds a value both ways', () => {

        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(50, 0, 10)).toBe(10);

    });

});

describe('easeTowards', () => {

    const RATE = LANE_CHANGE_SPEED;

    it('moves towards the target without reaching or passing it', () => {

        const next = easeTowards(0, 100, RATE, 1 / 60);

        expect(next).toBeGreaterThan(0);
        expect(next).toBeLessThan(100);

    });

    it('never overshoots, however large the step', () => {

        expect(easeTowards(0, 100, RATE, 10)).toBeLessThanOrEqual(100);
        expect(easeTowards(100, 0, RATE, 10)).toBeGreaterThanOrEqual(0);

    });

    it('works the same in either direction', () => {

        const up = easeTowards(0, 100, RATE, 0.1);
        const down = easeTowards(100, 0, RATE, 0.1);

        expect(up).toBeCloseTo(100 - down, 10);

    });

    //  The property the whole lane feel rests on: a slow device and a fast one
    //  must put the drop in the same place after the same amount of time.
    it('is frame-rate independent', () => {

        const target = 100;
        const seconds = 0.25;

        const oneBigStep = easeTowards(0, target, RATE, seconds);

        let many = 0;

        for (let i = 0; i < 240; i++)
        {
            many = easeTowards(many, target, RATE, seconds / 240);
        }

        expect(many).toBeCloseTo(oneBigStep, 9);

    });

    it('does not move on a zero or negative step', () => {

        //  A zero delta is reachable on the first frame; without this the
        //  caller's velocity calculation divides by zero.
        expect(easeTowards(25, 100, RATE, 0)).toBe(25);
        expect(easeTowards(25, 100, RATE, -1)).toBe(25);

    });

    it('stays put when already at the target', () => {

        expect(easeTowards(50, 50, RATE, 0.1)).toBe(50);

    });

});
