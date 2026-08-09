import { describe, expect, it } from 'vitest';
import { GAME_WIDTH, LANE_COUNT, LANE_WIDTH, TRACK_LEFT, TRACK_WIDTH } from '../src/game/config/constants';
import { clampLane, laneCenterX } from '../src/game/systems/Lanes';
import { clamp } from '../src/game/utils/math';

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
