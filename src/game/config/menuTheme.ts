import { GAME_HEIGHT } from './constants';

//  The menu's own look.
//
//  Deliberately not one of the ten worlds. The menu used to look down the same
//  road the game is played on, which made it read as a level with buttons over
//  it - the first thing a player sees said "here is the game already" rather
//  than "here is what this game is". This is somewhere else: a liquid cosmos
//  the drop is suspended in, before any of it has become a track.

/** Sky, top to bottom. Three stops, because two cannot bend. */
export const MENU_SKY_TOP = 0x07061c;
export const MENU_SKY_MID = 0x1b0f3f;
export const MENU_SKY_LOW = 0x2c1250;

/** Bands the gradient is built from. Enough that no step is visible. */
export const MENU_SKY_BANDS = 44;

/**
 * The surface the whole scene stands on, as a fraction of the screen.
 *
 * A reflection is what turns a field of glowing shapes into a place: it gives
 * the picture a floor, and everything above it an altitude.
 */
export const MENU_POOL_Y = GAME_HEIGHT * 0.78;
export const MENU_POOL_ALPHA = 0.3;
export const MENU_POOL_SQUASH = 0.42;

/** Ripple lines across the pool, which is what stops it reading as a mirror. */
export const MENU_RIPPLES = 11;
export const MENU_RIPPLE_ALPHA = 0.05;

/** Thickness of one. Hairlines across the whole width read as scan lines. */
export const MENU_RIPPLE_THICKNESS = 5;

/**
 * The slow liquid masses drifting behind everything.
 *
 * Each is a stack of circles at low alpha, which gives a soft edge without a
 * blur pass or a texture. They move on long, unrelated periods so the field
 * never visibly loops.
 */
export interface BlobSpec
{
    color: number;
    radius: number;

    /** Where it sits, and how far it wanders from there. */
    x: number;
    y: number;
    driftX: number;
    driftY: number;

    /** Seconds for one full wander, per axis. Kept coprime-ish on purpose. */
    periodX: number;
    periodY: number;

    alpha: number;
}

/**
 * How many circles each mass is stacked from.
 *
 * High, and the alpha correspondingly low. The accumulated opacity of N stacked
 * circles steps once per circle, so a handful of them does not read as a soft
 * mass at all - it reads as concentric rings, which is exactly what seven of
 * them gave. Twenty is enough that no single step is visible.
 */
export const MENU_BLOB_LAYERS = 20;

export const MENU_BLOBS: BlobSpec[] = [
    //  A warm magenta mass low left, which is what the eye lands on first.
    { color: 0xd8329b, radius: 190, x: 110, y: 470, driftX: 34, driftY: 26, periodX: 23, periodY: 17, alpha: 0.021 },
    //  Cyan opposite it, so the palette has two poles rather than one wash.
    { color: 0x1fd9e0, radius: 165, x: 386, y: 300, driftX: 40, driftY: 30, periodX: 19, periodY: 27, alpha: 0.019 },
    //  A violet body behind both, tying them together.
    { color: 0x7a3ce8, radius: 240, x: 250, y: 210, driftX: 26, driftY: 20, periodX: 31, periodY: 21, alpha: 0.017 },
    //  A small hot core, for a highlight the others cannot give.
    { color: 0xff7ad8, radius: 90, x: 320, y: 560, driftX: 30, driftY: 24, periodX: 13, periodY: 29, alpha: 0.019 }
];

/**
 * Droplets suspended in the cosmos, rising slowly.
 *
 * The one literal thing in an abstract picture: they say what the game is about
 * before the title does.
 */
export const MENU_DROPLETS = 14;
export const MENU_DROPLET_RISE = 22;
export const MENU_DROPLET_ALPHA = 0.5;

/** Far specks, for depth behind the liquid. */
export const MENU_STARS = 60;
export const MENU_STAR_ALPHA = 0.55;

// ---------------------------------------------------------------------------
//  The wordmark
// ---------------------------------------------------------------------------

/** Top and bottom of the title's own gradient. */
export const TITLE_FILL_TOP = '#ffffff';
export const TITLE_FILL_LOW = '#7fd8ff';

/** The glow behind it, and how far it spreads. */
export const TITLE_GLOW = '#2ea8ff';
export const TITLE_GLOW_BLUR = 26;

/** Space between letters. A wordmark is set wider than a sentence. */
export const TITLE_TRACKING = 4;

/** The rule under the wordmark, which is most of what makes it a mark. */
export const TITLE_RULE_WIDTH = 210;
export const TITLE_RULE_ALPHA = 0.85;
