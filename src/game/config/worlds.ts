import { ColorId } from './constants';

//  The ten environments. Each is a set of layered silhouettes drawn
//  procedurally - no image assets - and a palette the level's colours are
//  chosen from.
//
//  Backgrounds exist to give each level an identity and a sense of travel, and
//  must never compete with the gameplay: every band here is low contrast
//  against the orbs and obstacles drawn on top of it.

export type WorldId =
    | 'sky'
    | 'mountains'
    | 'canyon'
    | 'forest'
    | 'ice'
    | 'desert'
    | 'storm'
    | 'city'
    | 'space'
    | 'void';

/** How a layer's silhouettes are shaped. */
export type LayerShape = 'hills' | 'peaks' | 'mesa' | 'trees' | 'buildings' | 'dunes' | 'blobs' | 'shards';

export interface LayerSpec
{
    shape: LayerShape;

    /** Fill colour of the silhouette. */
    color: number;

    alpha: number;

    /** Fraction of the scroll speed. Smaller is further away. */
    parallax: number;

    /**
     * How far below the horizon the silhouettes are rooted.
     *
     * Scenery stands *on* the horizon, so this is a small number: a few pixels
     * of overlap keeps the bases hidden behind the ground rather than floating
     * above it.
     */
    baseline: number;

    /** Height of the silhouettes above the baseline. */
    height: number;

    /**
     * Colour of the detail picked out on this layer, if any: lit windows in the
     * towers, snow on the peaks. Leave it out and the layer stays a flat
     * cut-out, which is what the nearest layers want - detail close to the road
     * competes with the orbs drawn on it.
     */
    detail?: number;
    detailAlpha?: number;

    /** Horizontal period of the shape, in pixels. */
    period: number;

    /**
     * Width of one tile of the layer, which is also how far it scrolls before
     * wrapping.
     *
     * Layers drift sideways rather than falling: on a road, distant scenery
     * passes across the view as you travel: it does not slide down the sky.
     * Must be at least a screen wide or the seam becomes visible.
     */
    wrap: number;

    /** Deterministic variation between otherwise identical layers. */
    seed: number;
}

export interface RoadsideSpec
{
    shape: LayerShape;
    color: number;
    alpha: number;

    /** Height of a prop at the player's own line. */
    height: number;

    /** Distance along the road between props on one side. */
    spacing: number;

    /** How far out from the centre of the road they stand. */
    offset: number;

    seed: number;
}

/** Shapes that hang in the sky, drifting past far slower than the ground. */
export type FloaterShape = 'island' | 'crystal' | 'ring';

export interface FloaterSpec
{
    shape: FloaterShape;
    color: number;
    alpha: number;

    /** How many hang in the sky at once. */
    count: number;

    /** Size of one, in pixels at its widest. */
    size: number;

    /**
     * The band of sky they occupy, as distances *above* the horizon.
     *
     * Above it, always. These are the one piece of scenery with nothing
     * anchoring it to the ground, so nothing stops them wandering down over the
     * road except saying they may not.
     */
    lowest: number;
    highest: number;

    /** Fraction of the scroll speed. Small, or they read as close. */
    parallax: number;

    seed: number;
}

export interface SpeckSpec
{
    /** Small drifting particles: snow, stars, embers, rain. */
    count: number;
    color: number;
    alpha: number;
    radius: number;

    /** Downward drift in px/s, on top of the track's own motion. */
    fall: number;

    /** Sideways lean of the drift, for rain and snow. */
    drift: number;

    /** Drawn as short lines rather than dots, for rain. */
    streak?: number;
}

/**
 * How a world marks its road.
 *
 * The one thing that was the same in all ten. Every world had its own sky,
 * ground, scenery and weather, and then the identical corridor drawn down the
 * middle of it in a different colour - which is the largest object on screen
 * and the one the player actually looks at, so ten worlds still read as one
 * road in ten palettes.
 *
 * Every field is optional and falls back to the constant it replaces, so a
 * world that says nothing here is drawn exactly as it always was. What is on
 * offer is deliberately the parameters the road is already drawn from rather
 * than a list of named looks: a boardwalk is close-set heavy cross-bars with no
 * light strips, and saying so in numbers keeps the space open.
 */
export interface RoadSurfaceSpec
{
    /** Distance along the road between cross-bars. Larger is sparser. */
    rungSpacing?: number;
    rungThickness?: number;

    /** Zero for a road with no cross-bars at all. */
    rungAlpha?: number;

    /**
     * Lane dividers broken into dashes rather than run solid.
     *
     * Measured along the road like everything else, so they bunch towards the
     * horizon by themselves. This is the difference between a highway and a
     * light-grid, and it is worth having as its own thing rather than as a
     * spacing: a solid line says "stay in your lane" and a dashed one says
     * "cross when you like", which is what this game is actually about.
     */
    dashSpacing?: number;
    dashLength?: number;

    /** The running light strips down each side. Zero turns them off. */
    stripAlpha?: number;

    /** The wet-looking reflection down the middle. Zero turns it off. */
    sheenAlpha?: number;

    /** How far the shoulder reaches out past the road. */
    vergeWidth?: number;
}

export interface WorldSpec
{
    /** Sky colour at the top of the screen. */
    skyTop: number;

    /** Sky colour at the horizon. */
    skyBottom: number;

    /** The corridor's own colours, so the track sits in its environment. */
    track: number;

    /** The plane the road sits on. Falls back to the road's own colour. */
    groundColor?: number;
    laneLine: number;
    trackEdge: number;
    rung: number;

    /** HUD text tint, so readouts stay legible on light and dark worlds. */
    hudText: string;
    hudDim: string;
    hudStroke: string;

    /** A haze band at the horizon, for depth. */
    hazeColor: number;
    hazeAlpha: number;

    layers: LayerSpec[];

    /**
     * Objects standing beside the road itself.
     *
     * Unlike the background layers these are placed at distances along the
     * road, so they rush past at the speed the player is travelling. That is
     * what actually reads as moving through somewhere, rather than looking at
     * a backdrop that happens to slide.
     */
    roadside?: RoadsideSpec;

    specks?: SpeckSpec;

    /** Things hanging in this world's sky: islands, crystals, structures. */
    floaters?: FloaterSpec;

    /** Optional disc low in the sky: a sun, a moon, a planet. */
    orbColor?: number;
    orbAlpha?: number;
    orbRadius?: number;
    orbX?: number;
    /**
     * Where the sun or moon sits, measured from the horizon rather than from the
     * top of the screen - a disc half below it reads as setting, and that has to
     * stay true if the horizon is ever moved.
     */
    orbY?: number;

    /**
     * A scatter of stars across the sky, for the worlds dark enough to show
     * them. Drawn once and left, since anything this far away does not move.
     */
    stars?: { count: number; color: number; alpha: number };

    /** Occasional full-screen flash, for the storm. */
    lightning?: boolean;

    /** How this world's road is marked. Left out, it is marked the default way. */
    surface?: RoadSurfaceSpec;

    /** The colours levels in this world draw from. */
    palette: ColorId[];

    /**
     * The colours the same world draws from after dark.
     *
     * A second visit is a harder level, and a harder level carries more colours
     * - so the night set is always five, where a first visit may be two. Still
     * the world's own set rather than an arbitrary one: the ice at night is
     * colder colours, the desert warmer.
     */
    nightPalette?: ColorId[];
}
