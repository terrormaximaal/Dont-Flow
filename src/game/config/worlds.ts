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

    /** Screen y the layer's baseline sits on. */
    baseline: number;

    /** Height of the silhouettes above the baseline. */
    height: number;

    /** Horizontal period of the shape, in pixels. */
    period: number;

    /** Vertical distance between repeats, as the layer scrolls past. */
    repeat: number;

    /** Deterministic variation between otherwise identical layers. */
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
