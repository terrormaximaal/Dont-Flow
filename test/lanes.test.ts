import { describe, expect, it } from 'vitest';
import {
    GAME_WIDTH,
    LANE_CHANGE_SPEED,
    LANE_COUNT,
    LANE_WIDTH,
    TRACK_LEFT,
    TRACK_WIDTH
} from '../src/game/config/constants';
import { clampLane, laneCenterX } from '../src/game/systems/Lanes';
import { clamp, easeTowards } from '../src/game/utils/math';

describe('laneCenterX', () => {

    it('centres the middle lane on the track', () => {

        expect(laneCenterX(1)).toBe(GAME_WIDTH / 2);

    });

    it('spaces lanes evenly and keeps them inside the track', () => {

        for (let lane = 0; lane < LANE_COUNT; lane++)
        {
            const x = laneCenterX(lane);

            expect(x).toBeGreaterThan(TRACK_LEFT);
            expect(x).toBeLessThan(TRACK_LEFT + TRACK_WIDTH);
        }

        expect(laneCenterX(1) - laneCenterX(0)).toBe(LANE_WIDTH);
        expect(laneCenterX(2) - laneCenterX(1)).toBe(LANE_WIDTH);

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
        expect(clampLane(LANE_COUNT)).toBe(LANE_COUNT - 1);
        expect(clampLane(99)).toBe(LANE_COUNT - 1);

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
