import { mixColor } from '../utils/color';
import { LayerSpec, WorldSpec } from './worlds';

/**
 * A world seen again, under a different sky.
 *
 * Twenty levels and ten worlds. The alternative was ten more worlds, and it is
 * the wrong alternative: a place you have never been is not more interesting
 * than a place you know at a different hour, and the second visit is where a
 * game gets to say "you have been here before, and it is not the same now".
 *
 * So a level can ask for its world at night. Everything is derived from the
 * world's own colours rather than replaced with new ones, which is what keeps
 * the two visits recognisably the same place: the ice is still the ice, and the
 * mountains are still those mountains, lit differently.
 *
 * Pure, and returns a fresh spec rather than mutating the shared one - two
 * levels can name the same world in the same session and neither may see the
 * other's lighting.
 */
export type WorldVariant = 'night';

/** The tone everything is pulled towards after dark. */
const NIGHT = 0x05060f;

/** How far each part of a world travels towards it. */
const NIGHT_SKY = 0.72;
const NIGHT_GROUND = 0.6;
const NIGHT_LAYER = 0.55;
const NIGHT_HAZE = 0.5;

/**
 * How much brighter the road's own lights get.
 *
 * The one thing that gains rather than loses. Everything else in a world dims
 * after dark, so a road that dimmed with it would leave the player reading a
 * dark shape on a dark ground - and the lit edge is the single line that says
 * where the road is.
 */
const NIGHT_EDGE = 0.35;

/** Light text and a dark outline, since every night world is a dark one. */
const NIGHT_HUD = { hudText: '#eaf3ff', hudDim: '#93a6c4', hudStroke: '#03060e' };

function darken (color: number, amount: number): number
{
    return mixColor(color, NIGHT, amount);
}

function nightLayer (layer: LayerSpec): LayerSpec
{
    return {
        ...layer,
        color: darken(layer.color, NIGHT_LAYER),
        //  Detail is what is picked out *by* light - snow on a peak, windows in
        //  a tower - so it survives the night rather than being dimmed with the
        //  mass it sits on. Windows are the whole point of a city after dark.
        detail: layer.detail === undefined ? undefined : mixColor(layer.detail, 0xffffff, 0.15),
        detailAlpha: layer.detailAlpha === undefined ? undefined : Math.min(1, layer.detailAlpha * 1.4)
    };
}

/**
 * The same world under the given variant, or the world itself if it has none.
 */
export function applyVariant (world: WorldSpec, variant?: WorldVariant): WorldSpec
{
    if (variant !== 'night')
    {
        return world;
    }

    return {
        ...world,
        ...NIGHT_HUD,

        skyTop: darken(world.skyTop, NIGHT_SKY + 0.12),
        skyBottom: darken(world.skyBottom, NIGHT_SKY),

        groundColor: darken(world.groundColor ?? world.track, NIGHT_GROUND),
        track: darken(world.track, NIGHT_GROUND),
        rung: darken(world.rung, NIGHT_GROUND * 0.7),

        //  Up, not down. See NIGHT_EDGE.
        laneLine: mixColor(world.laneLine, 0xffffff, NIGHT_EDGE * 0.5),
        trackEdge: mixColor(world.trackEdge, 0xffffff, NIGHT_EDGE),

        hazeColor: darken(world.hazeColor, NIGHT_HAZE),
        hazeAlpha: world.hazeAlpha * 0.7,

        layers: world.layers.map(nightLayer),

        roadside: world.roadside === undefined
            ? undefined
            : { ...world.roadside, color: darken(world.roadside.color, NIGHT_LAYER) },

        //  A sun becomes a moon: smaller, colder, and much fainter.
        orbColor: world.orbColor === undefined ? undefined : mixColor(world.orbColor, 0xcfe0ff, 0.6),
        orbAlpha: world.orbAlpha === undefined ? undefined : world.orbAlpha * 0.55,
        orbRadius: world.orbRadius === undefined ? undefined : world.orbRadius * 0.6,

        //  Every night sky has them, including the six that had none by day.
        stars: world.stars ?? { count: 70, color: 0xdce8ff, alpha: 0.45 },

        //  A harder level carries more colours, so a night visit uses the
        //  world's own five rather than the two or three its first visit did.
        palette: world.nightPalette ?? world.palette
    };
}
