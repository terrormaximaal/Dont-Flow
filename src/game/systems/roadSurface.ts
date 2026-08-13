import {
    ROAD_SHEEN_ALPHA,
    RUNG_SPACING,
    RUNG_THICKNESS,
    STRIP_ALPHA
} from '../config/constants';
import { RoadSurfaceSpec } from '../config/worlds';

/**
 * How far the verge reaches out past each edge of the road, in track pixels.
 *
 * Narrow by default. Spread wide it stops reading as a shoulder and becomes a
 * second, paler road behind the real one: its edges still converge on the
 * vanishing point, so however far out it goes it draws a hard wedge across the
 * ground rather than disappearing off the sides.
 */
export const VERGE_WIDTH = 92;

export interface RoadSurface
{
    rungSpacing: number;
    rungThickness: number;
    rungAlpha: number;
    dashSpacing?: number;
    dashLength?: number;
    stripAlpha: number;
    sheenAlpha: number;
    vergeWidth: number;
}

/** The road as it is marked when a world does not say otherwise. */
export const DEFAULT_SURFACE: RoadSurface = {
    rungSpacing: RUNG_SPACING,
    rungThickness: RUNG_THICKNESS,
    rungAlpha: 0.85,
    stripAlpha: STRIP_ALPHA,
    sheenAlpha: ROAD_SHEEN_ALPHA,
    vergeWidth: VERGE_WIDTH
};

/**
 * A world's road markings, with every gap filled from the default.
 *
 * Separated from the drawing so that what a world's road actually *is* can be
 * asked about without standing a scene up - which is the only way the two
 * things worth guaranteeing here can be checked at all: that no two worlds are
 * marked the same, and that none of them is marked in a way that leaves the
 * road with nothing on it that moves.
 */
export function resolveSurface (surface?: RoadSurfaceSpec): RoadSurface
{
    return { ...DEFAULT_SURFACE, ...surface };
}

/**
 * Whether a road has anything on it that travels past the player.
 *
 * The lane lines and the edges converge on the vanishing point and so sit
 * still on screen however fast the run is going. Only the cross-bars, the light
 * strips and the dashes are laid at distances along the road, and so only those
 * three move - a road with none of them is a road you cannot tell you are
 * moving along, whatever the scenery either side is doing.
 */
export function hasMotionCue (surface: RoadSurface): boolean
{
    return (surface.rungAlpha > 0)
        || (surface.stripAlpha > 0)
        || (surface.dashSpacing !== undefined);
}
