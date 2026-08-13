import { describe, expect, it } from 'vitest';
import { WORLDS } from '../src/game/config/worldData';
import { WorldId } from '../src/game/config/worlds';
import { DEFAULT_SURFACE, hasMotionCue, resolveSurface } from '../src/game/systems/roadSurface';

const IDS = Object.keys(WORLDS) as WorldId[];

/** Every world's road markings, with the defaults filled in. */
function surfaces (): Array<{ id: WorldId; surface: ReturnType<typeof resolveSurface> }>
{
    return IDS.map((id) => ({ id, surface: resolveSurface(WORLDS[id].surface) }));
}

describe('a world\'s road markings', () => {

    it('are the default ones when a world says nothing', () => {

        expect(resolveSurface()).toEqual(DEFAULT_SURFACE);
        expect(resolveSurface({})).toEqual(DEFAULT_SURFACE);

    });

    it('replace only what a world actually names', () => {

        const surface = resolveSurface({ stripAlpha: 0 });

        expect(surface.stripAlpha).toBe(0);
        expect(surface.rungSpacing).toBe(DEFAULT_SURFACE.rungSpacing);

    });

    //  The lane lines and the road's edges converge on the vanishing point, so
    //  they sit still on screen however fast the run is going. Only the things
    //  laid at distances *along* the road move past. A world that turns off all
    //  three of those has a road you cannot tell you are travelling on.
    it('always leave something on the road that travels past', () => {

        expect(hasMotionCue(resolveSurface())).toBe(true);

        expect(hasMotionCue(resolveSurface({ rungAlpha: 0, stripAlpha: 0 })), 'nothing left')
            .toBe(false);

        expect(hasMotionCue(resolveSurface({ rungAlpha: 0, stripAlpha: 0, dashSpacing: 200 })), 'dashes only')
            .toBe(true);

    });

});

describe('the ten worlds', () => {

    it('each mark their road with something that moves', () => {

        for (const { id, surface } of surfaces())
        {
            expect(hasMotionCue(surface), `world ${id}`).toBe(true);
        }

    });

    //  The point of the whole thing. Every world already had its own sky,
    //  ground, scenery and weather, and then the identical corridor drawn down
    //  the middle of it in a different colour - which is the largest object on
    //  screen. Ten palettes on one road is not ten worlds.
    it('are none of them marked the same way as another', () => {

        const seen = new Map<string, WorldId>();

        for (const { id, surface } of surfaces())
        {
            const key = JSON.stringify(surface);
            const twin = seen.get(key);

            expect(twin, `world ${id} is marked exactly like ${twin}`).toBeUndefined();

            seen.set(key, id);
        }

    });

    //  And not merely different in the last decimal place. Two roads that
    //  differ only in a sheen nobody can see are the same road.
    it('differ from each other in something a player would notice', () => {

        const all = surfaces();

        for (let i = 0; i < all.length; i++)
        {
            for (let j = i + 1; j < all.length; j++)
            {
                const a = all[i].surface;
                const b = all[j].surface;

                //  Any one of these is a visible difference on its own: whether
                //  the road is crossed at all, whether it is dashed, whether it
                //  carries running lights, or a real change in how often the
                //  cross-bars come.
                const notable = ((a.rungAlpha > 0) !== (b.rungAlpha > 0))
                    || ((a.dashSpacing !== undefined) !== (b.dashSpacing !== undefined))
                    || ((a.stripAlpha > 0) !== (b.stripAlpha > 0))
                    || (Math.abs(a.rungSpacing - b.rungSpacing) > 20)
                    || (Math.abs((a.dashSpacing ?? 0) - (b.dashSpacing ?? 0)) > 40)
                    || (Math.abs(a.stripAlpha - b.stripAlpha) > 0.08)
                    || (Math.abs(a.vergeWidth - b.vergeWidth) > 30);

                expect(notable, `${all[i].id} against ${all[j].id}`).toBe(true);
            }
        }

    });

    it('keep every marking inside a range that still reads as a road', () => {

        for (const { id, surface } of surfaces())
        {
            //  Cross-bars closer than this are hatching, further apart are
            //  landmarks rather than a rhythm.
            if (surface.rungAlpha > 0)
            {
                expect(surface.rungSpacing, `world ${id} rungs`).toBeGreaterThanOrEqual(40);
                expect(surface.rungSpacing, `world ${id} rungs`).toBeLessThanOrEqual(220);
            }

            //  A dash longer than its own spacing is a solid line with gaps
            //  bitten out of it, which is not the same thing at all.
            if (surface.dashSpacing !== undefined)
            {
                expect(surface.dashLength ?? 0, `world ${id} dashes`).toBeLessThan(surface.dashSpacing);
                expect(surface.dashLength ?? 0, `world ${id} dashes`).toBeGreaterThan(0);
            }

            //  A sheen this strong stops being a reflection and becomes fog
            //  sitting on the surface.
            expect(surface.sheenAlpha, `world ${id} sheen`).toBeLessThanOrEqual(0.2);

            //  A verge wide enough to converge into a second road behind the
            //  real one - the thing the narrow default exists to avoid.
            expect(surface.vergeWidth, `world ${id} verge`).toBeLessThanOrEqual(180);
            expect(surface.vergeWidth, `world ${id} verge`).toBeGreaterThanOrEqual(0);
        }

    });

});
