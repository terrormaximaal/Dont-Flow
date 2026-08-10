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

    /** Optional disc low in the sky: a sun, a moon, a planet. */
    orbColor?: number;
    orbAlpha?: number;
    orbRadius?: number;
    orbX?: number;
    orbY?: number;

    /** Occasional full-screen flash, for the storm. */
    lightning?: boolean;

    /** The colours levels in this world draw from. */
    palette: ColorId[];
}
