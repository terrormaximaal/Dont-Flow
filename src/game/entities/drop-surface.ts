import {
    DROP_BELLY,
    DROP_AGITATION_RIPPLE,
    DROP_RIPPLE_AMOUNTS,
    DROP_RIPPLE_LOBES,
    DROP_RIPPLE_SPEEDS,
    DROP_SURFACE_POINTS,
    DROP_TIP_LENGTH,
    DROP_TIP_SPREAD,
    DROP_TIP_SWAY,
    DROP_TIP_SWAY_SPEED,
    DROP_TIP_TRAIL
} from '../config/constants';

export interface Point
{
    x: number;
    y: number;
}

/**
 * The outline is written into this one array and handed back, rather than a
 * fresh array being built 60 times a second. Every caller draws immediately and
 * then forgets it, so nothing ever holds a stale outline - but that is the
 * contract: the points are only valid until the next call.
 */
const buffer: Point[] = Array.from({ length: DROP_SURFACE_POINTS }, () => ({ x: 0, y: 0 }));

/**
 * The drop's edge for one frame, as points around a local origin at the centre
 * of the bulb.
 *
 * Three things are happening at once. Overlapping ripples push the edge in and
 * out, which is the liquid. A soft peak pulled out of one side makes it a
 * teardrop rather than a blob, and that peak leans away from a sideways move so
 * the tip whips along behind the body. The bottom hangs slightly heavier than
 * the top, so it never reads as a circle with a hat on.
 *
 * Pure geometry: no Phaser, no state, no drawing. The same inputs always give
 * the same shape, which is what keeps it something you can reason about while
 * tuning the numbers.
 *
 * @param radius     Resting radius of the bulb.
 * @param time       Seconds since the drop appeared, driving the ripples.
 * @param lean       Sideways tilt, -1 to 1, from how fast it is changing lane.
 * @param agitation  0 to 1 of extra churn, from having just swallowed an orb.
 */
export function waterOutline (radius: number, time: number, lean: number, agitation: number): Point[]
{
    const churn = 1 + (agitation * DROP_AGITATION_RIPPLE);

    //  Straight up, pushed off it by the lean and its own slow drift.
    const tipAngle = -(Math.PI / 2)
        + (lean * DROP_TIP_TRAIL)
        + (Math.sin(time * DROP_TIP_SWAY_SPEED) * DROP_TIP_SWAY);

    for (let i = 0; i < DROP_SURFACE_POINTS; i++)
    {
        const theta = (i / DROP_SURFACE_POINTS) * Math.PI * 2;

        let ripple = 0;

        for (let mode = 0; mode < DROP_RIPPLE_LOBES.length; mode++)
        {
            ripple += Math.sin((theta * DROP_RIPPLE_LOBES[mode]) + (time * DROP_RIPPLE_SPEEDS[mode]))
                * DROP_RIPPLE_AMOUNTS[mode];
        }

        //  Falls away from the tip as a cusp rather than a dome, which is what
        //  gives a point instead of a bulge.
        const tip = Math.exp(-Math.abs(angleBetween(theta, tipAngle)) / DROP_TIP_SPREAD);

        //  Positive y is down, so this is the underside.
        const belly = 1 + (DROP_BELLY * Math.sin(theta));

        const r = radius * (1 + (ripple * churn)) * belly * (1 + (DROP_TIP_LENGTH * tip));

        buffer[i].x = Math.cos(theta) * r;
        buffer[i].y = Math.sin(theta) * r;
    }

    return buffer;
}

/**
 * The shortest way round between two angles, in radians.
 *
 * Needed because the tip sits near the wrap point: without this, points just
 * past it would measure almost a full turn away and the tip would be sliced in
 * half.
 */
function angleBetween (a: number, b: number): number
{
    const difference = (a - b) % (Math.PI * 2);

    if (difference > Math.PI)
    {
        return difference - (Math.PI * 2);
    }

    if (difference < -Math.PI)
    {
        return difference + (Math.PI * 2);
    }

    return difference;
}
