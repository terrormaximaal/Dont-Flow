import { GAME_HEIGHT } from './constants';

//  The menu's own look.
//
//  Deliberately not one of the ten worlds. The menu used to look down the same
//  road the game is played on, which made it read as a level with buttons over
//  it - the first thing a player sees said "here is the game already" rather
//  than "here is what this game is". This is somewhere else: a liquid cosmos
//  the drop is suspended in, before any of it has become a track.

/** Sky, top to bottom. Three stops, because two cannot bend. */
export const MENU_SKY_TOP = 0x05041a;
export const MENU_SKY_MID = 0x1d1046;
export const MENU_SKY_LOW = 0x35155e;

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
    { color: 0xe8339f, radius: 200, x: 96, y: 500, driftX: 34, driftY: 26, periodX: 23, periodY: 17, alpha: 0.034 },
    //  Cyan opposite it, so the palette has two poles rather than one wash.
    { color: 0x21e6ec, radius: 172, x: 396, y: 292, driftX: 40, driftY: 30, periodX: 19, periodY: 27, alpha: 0.031 },
    //  A violet body behind both, tying them together.
    { color: 0x8447ff, radius: 250, x: 248, y: 196, driftX: 26, driftY: 20, periodX: 31, periodY: 21, alpha: 0.027 },
    //  A small hot core, for a highlight the others cannot give.
    { color: 0xff8ade, radius: 96, x: 336, y: 578, driftX: 30, driftY: 24, periodX: 13, periodY: 29, alpha: 0.030 }
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
//  Caustics
//
//  Wavering bands of light on the surface, the way light looks after it has
//  passed through moving water. The one thing that makes a dark pool read as
//  liquid rather than as a dark rectangle.
// ---------------------------------------------------------------------------

export const MENU_CAUSTICS = 9;
export const MENU_CAUSTIC_ALPHA = 0.085;
export const MENU_CAUSTIC_COLOR = 0x9fe8ff;

/** How fast the pattern crawls, and how far each band bends as it goes. */
export const MENU_CAUSTIC_SPEED = 0.22;
export const MENU_CAUSTIC_BEND = 46;

// ---------------------------------------------------------------------------
//  The wordmark
//
//  Two lines, not one. A single line of capitals is a label however it is
//  coloured; stacking a small tracked-out word over a large one is a lockup,
//  and a lockup is what a game is remembered by.
//
//  The size difference does the work. DON'T is set small and wide so it reads
//  as a qualifier, and FLOW is set large and filled with the game's own
//  colours running through it - so the word itself does the thing the game is
//  about, which is the only reason a gradient on a title is ever worth having.
// ---------------------------------------------------------------------------

/** The small word above. */
export const TITLE_TOP_SIZE = 32;
export const TITLE_TOP_TRACKING = 13;
export const TITLE_TOP_COLOR = '#cfe4ff';
export const TITLE_TOP_ALPHA = 0.92;

/** The large word below, which carries the colour. */
export const TITLE_MAIN_SIZE = 84;
export const TITLE_MAIN_TRACKING = 5;

/**
 * The liquid running through it, left to right.
 *
 * Four stops rather than two: a two-stop ramp across four letters gives each
 * letter one flat colour, and the point is that the colour *travels* through
 * the word.
 */
export const TITLE_FLOW_STOPS = [ '#5df3ff', '#7ea8ff', '#d46bff', '#ff6bc4' ];

/** Kept for anything still asking for a single fill. */
export const TITLE_FILL_TOP = '#ffffff';
export const TITLE_FILL_LOW = '#7fd8ff';

/** The glow behind it, and how far it spreads. */
export const TITLE_GLOW = '#8a4bff';
export const TITLE_GLOW_BLUR = 34;

/** Space between letters, for anything setting a single line. */
export const TITLE_TRACKING = 4;

/**
 * The rule above the wordmark, which gives the block a top edge to hang from.
 *
 * Narrow, and above rather than between: the two words sit close enough to
 * read as one mark, so anything laid between them fouls the big one.
 */
export const TITLE_RULE_WIDTH = 96;
export const TITLE_RULE_ALPHA = 0.8;
export const TITLE_RULE_LIFT = 16;

/**
 * The wordmark's own reflection, thrown down into the pool.
 *
 * Not a decoration: it is what ties the top half of the screen to the bottom
 * half, so the title belongs to the place rather than sitting in front of it.
 */
export const TITLE_REFLECT_ALPHA = 0.15;

/**
 * Short and close, not a full mirror image.
 *
 * The first version squashed to 0.55 and sat 26px clear of the word, which put
 * a ghost of FLOW directly on top of the tagline - the layout test was only
 * checking the upright elements, so nothing caught it. A reflection belongs
 * against the thing it reflects; the gap is what made it a second object.
 */
export const TITLE_REFLECT_SQUASH = 0.34;
export const TITLE_REFLECT_GAP = 6;

// ---------------------------------------------------------------------------
//  Arriving
//
//  The menu used to appear all at once, fully formed, which is the single
//  clearest tell that a screen was assembled rather than designed. Everything
//  now comes in from somewhere, in the order the eye should read it.
// ---------------------------------------------------------------------------

/** The drop falls in first and lands, because it is the subject. */
export const ENTER_DROP_MS = 620;
export const ENTER_DROP_FROM = -160;

/** Then the two words, one after the other. */
export const ENTER_MARK_MS = 520;
export const ENTER_MARK_RISE = 26;
export const ENTER_MARK_STAGGER = 110;

export const ENTER_TAGLINE_MS = 460;

/** Then the way in, last, so it is the thing left moving when the eye arrives. */
export const ENTER_BUTTON_MS = 480;
export const ENTER_BUTTON_RISE = 22;
export const ENTER_BUTTON_STAGGER = 90;

/** How long the whole arrival takes. Anything longer is a screen you wait for. */
export const ENTER_TOTAL_MS = 1200;

/** Leaving: a wash to black, so the menu and the level are not cut together. */
export const LEAVE_FADE_MS = 260;

// ---------------------------------------------------------------------------
//  Menu buttons
// ---------------------------------------------------------------------------

/** The primary button's gradient, which is the title's colour again. */
export const MENU_BUTTON_FROM = 0x39c8ff;
export const MENU_BUTTON_TO = 0xa96bff;

/** The ghost button: a stroke and almost nothing else. */
export const COLOR_BUTTON_GHOST = 0x8fb4ff;
export const COLOR_BUTTON_GHOST_LABEL = '#dbe8ff';
export const BUTTON_GHOST_FILL_ALPHA = 0.07;
export const BUTTON_GHOST_EDGE_ALPHA = 0.42;
export const BUTTON_GHOST_EDGE_WIDTH = 1.5;
