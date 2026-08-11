import { describe, expect, it } from 'vitest';
import { LIGHT_X, LIGHT_Y } from '../src/game/config/constants';
import { bounced, facing } from '../src/game/ui/lighting';

describe('the key light', () => {

    it('is brightest on the surface pointing straight at it', () => {

        const straight = facing(LIGHT_X, LIGHT_Y);

        expect(straight).toBeCloseTo(1, 10);

        //  Nothing can be brighter than facing the light head on.
        for (let angle = 0; angle < Math.PI * 2; angle += 0.2)
        {
            expect(facing(Math.cos(angle), Math.sin(angle))).toBeLessThanOrEqual(straight + 1e-9);
        }

    });

    it('gives nothing at all to surfaces turned away', () => {

        //  Directly away, and both directions square on to the light.
        expect(facing(-LIGHT_X, -LIGHT_Y)).toBe(0);
        expect(facing(-LIGHT_Y, LIGHT_X)).toBeCloseTo(0, 10);
        expect(facing(LIGHT_Y, -LIGHT_X)).toBeCloseTo(0, 10);

    });

    //  The rim is drawn by multiplying an alpha by this, so a value outside 0..1
    //  would either vanish or draw an opaque band around the drop.
    it('stays within 0 and 1 all the way round', () => {

        for (let angle = 0; angle < Math.PI * 2; angle += 0.05)
        {
            const value = facing(Math.cos(angle), Math.sin(angle));

            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }

    });

    it('does not divide by a zero-length direction', () => {

        expect(facing(0, 0)).toBe(0);
        expect(bounced(0, 0)).toBe(0);

    });

    //  Scale must not matter: callers hand in a raw offset from the drop's
    //  centre, whose length is the local radius and changes with every ripple.
    it('reads the same for a direction however long it is', () => {

        for (const scale of [ 0.01, 1, 7, 250 ])
        {
            expect(facing(LIGHT_X * scale, LIGHT_Y * scale)).toBeCloseTo(facing(LIGHT_X, LIGHT_Y), 10);
        }

    });

    it('points up and to the left, where the drop\'s highlight sits', () => {

        expect(LIGHT_X).toBeLessThan(0);
        expect(LIGHT_Y).toBeLessThan(0);

    });

});

describe('the light bouncing off the road', () => {

    it('is brightest straight underneath and absent above', () => {

        expect(bounced(0, 1)).toBeCloseTo(1, 10);
        expect(bounced(0, -1)).toBe(0);

    });

    //  It fills the underside the key light leaves dark. If they overlapped
    //  strongly the drop would be lit from everywhere and read flat.
    it('does not light what the key light already lights', () => {

        expect(facing(LIGHT_X, LIGHT_Y) * bounced(LIGHT_X, LIGHT_Y)).toBe(0);

    });

    it('stays within 0 and 1 all the way round', () => {

        for (let angle = 0; angle < Math.PI * 2; angle += 0.05)
        {
            const value = bounced(Math.cos(angle), Math.sin(angle));

            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }

    });

});
