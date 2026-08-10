import { describe, expect, it } from 'vitest';
import { BLOB_SURFACE_POINTS, DROP_RADIUS, DROP_TIP_LENGTH } from '../src/game/config/constants';
import { blobOutline, clipAbove, Point } from '../src/game/entities/drop-surface';

const square: Point[] = [
    { x: -10, y: -10 },
    { x: 10, y: -10 },
    { x: 10, y: 10 },
    { x: -10, y: 10 }
];

/** Copies out of the shared buffer, which the next call would overwrite. */
const taken = (result: { points: Point[]; count: number }): Point[] =>
    result.points.slice(0, result.count).map((p) => ({ x: p.x, y: p.y }));

describe('clipping an outline to what is above a line', () => {

    it('keeps everything when the line is below the shape', () => {

        expect(taken(clipAbove(square, 50))).toEqual(square);

    });

    it('keeps nothing when the line is above the shape', () => {

        expect(clipAbove(square, -50).count).toBe(0);

    });

    it('cuts a shape in half along the line', () => {

        const top = taken(clipAbove(square, 0));

        //  The two corners above the line, and a crossing on each side.
        expect(top).toHaveLength(4);
        expect(top.filter((p) => p.y === 0)).toHaveLength(2);
        expect(Math.max(...top.map((p) => p.y))).toBe(0);

    });

    it('crosses back and forth as often as the edge does', () => {

        //  A ripple can carry the outline over the line more than twice, which
        //  is the case a two-crossing shortcut would get wrong.
        const zigzag: Point[] = [
            { x: 0, y: -10 },
            { x: 10, y: 10 },
            { x: 20, y: -10 },
            { x: 30, y: 10 },
            { x: 40, y: -10 },
            { x: 40, y: -20 },
            { x: 0, y: -20 }
        ];

        const top = clipAbove(zigzag, 0);

        expect(top.count).toBeGreaterThan(6);

    });

    it('leaves the real drop shape usable at every step of a flood', () => {

        //  Walking the line down through the drop must never produce something
        //  unfillable, whatever the ripples are doing.
        for (let step = 0; step <= 20; step++)
        {
            const cut = DROP_RADIUS * (-2.2 + ((3.5 * step) / 20));
            const result = clipAbove(blobOutline(DROP_RADIUS, step * 0.13, 0), cut);

            expect(result.count === 0 || result.count >= 3).toBe(true);
        }

    });

});

describe('a blob', () => {

    it('stays close to round, so it reads as an orb and not a splat', () => {

        const radii = blobOutline(10, 1.4, 0.7).map((p) => Math.hypot(p.x, p.y));

        expect(Math.min(...radii)).toBeGreaterThan(10 * 0.8);
        expect(Math.max(...radii)).toBeLessThan(10 * 1.2);

    });

    it('has no tip, unlike the drop', () => {

        const radii = blobOutline(10, 0, 0).map((p) => Math.hypot(p.x, p.y));

        expect(Math.max(...radii)).toBeLessThan(10 * (1 + DROP_TIP_LENGTH));

    });

    it('is somewhere different for each phase, so a lane does not pulse in step', () => {

        const first = blobOutline(10, 0, 0).map((p) => p.x).join();
        const second = blobOutline(10, 0, 1.7).map((p) => p.x).join();

        expect(first).not.toBe(second);
        expect(blobOutline(10, 0, 0)).toHaveLength(BLOB_SURFACE_POINTS);

    });

});
