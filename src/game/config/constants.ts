//  DON'T FLOW - central tuning file.
//  Every value that changes how the game *feels* lives here, so the systems
//  themselves stay free of magic numbers.

// ---------------------------------------------------------------------------
//  Screen & layout
// ---------------------------------------------------------------------------

//  Design resolution. The game is authored at this size in portrait and then
//  scaled to fit whatever screen it lands on.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

export const LANE_COUNT = 3;
export const TRACK_WIDTH = 330;
export const LANE_WIDTH = TRACK_WIDTH / LANE_COUNT;
export const TRACK_LEFT = (GAME_WIDTH - TRACK_WIDTH) / 2;

//  Which lane the drop starts in (0 = left, 1 = middle, 2 = right).
export const START_LANE = 1;

//  The drop never moves up or down the screen - the track scrolls past it.
export const DROP_SCREEN_Y = GAME_HEIGHT * 0.72;

/**
 * When this matches, the game is unplayable and asks to be rotated.
 *
 * Orientation alone is not enough: a desktop window is landscape too, and the
 * game must stay keyboard-playable there. Gating on height as well means only
 * short landscape viewports - phones on their side - are blocked, while desktop
 * and landscape tablets play on.
 *
 * `public/style.css` shows the notice from the identical media query. The two
 * have to be changed together.
 */
export const BLOCK_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 520px)';

// ---------------------------------------------------------------------------
//  Motion
// ---------------------------------------------------------------------------

//  How fast the track flows past, in track-pixels per second.
export const FORWARD_SPEED = 420;

//  Lane slide smoothing rate. This is an exponential rate constant, not a
//  duration: higher = snappier, lower = floatier. ~14 lands around a 0.2s
//  slide. The drop always eases towards the target lane, it never snaps.
export const LANE_CHANGE_SPEED = 14;

//  Largest timestep we will simulate in one frame. Stops the drop teleporting
//  when the tab is backgrounded and delta spikes.
export const MAX_DELTA = 1 / 30;

// ---------------------------------------------------------------------------
//  Drop appearance & juice
// ---------------------------------------------------------------------------

export const DROP_RADIUS = 21;

//  Sideways speed (px/s) that counts as "full tilt" for lean and stretch.
export const DROP_LEAN_REFERENCE_SPEED = 620;
//  Radians of lean at full tilt.
export const DROP_LEAN_MAX = 0.34;
//  How much the drop stretches into the direction of travel at full tilt.
export const DROP_STRETCH = 0.16;

// ---------------------------------------------------------------------------
//  Input
// ---------------------------------------------------------------------------

//  Horizontal drag distance (px) that counts as one lane change.
export const SWIPE_THRESHOLD = 26;
//  A swipe must be this many times more horizontal than vertical to register,
//  so vertical drags do not steer the drop.
export const SWIPE_DOMINANCE = 1.2;

//  How far a drag may wander vertically before it is measured afresh.
//
//  Without this, vertical distance accumulates from the point the finger first
//  landed and never resets, so a drag that starts downwards can never steer
//  again however far sideways it later goes - the input simply dies. Thumbs
//  move in arcs, so that is a normal way to hold the phone, not an edge case.
export const SWIPE_REANCHOR_DISTANCE = 40;

// ---------------------------------------------------------------------------
//  Track visuals
// ---------------------------------------------------------------------------

//  Distance between the scrolling cross-bars that sell forward motion.
export const RUNG_SPACING = 118;
export const RUNG_THICKNESS = 5;

//  Faint marks outside the track that scroll slower, for a sense of depth.
export const SIDE_TICK_SPACING = 76;
export const SIDE_TICK_PARALLAX = 0.55;
export const SIDE_TICK_WIDTH = 26;
export const SIDE_TICK_THICKNESS = 3;
export const SIDE_TICK_GAP = 16;

export const LANE_LINE_THICKNESS = 2;
export const TRACK_EDGE_THICKNESS = 3;

// ---------------------------------------------------------------------------
//  Gameplay colours
//
//  The colour a drop carries is an identity ('blue' / 'red'), not a hex value,
//  so matching an orb is a cheap string compare and the palette can be
//  restyled here without touching any logic.
// ---------------------------------------------------------------------------

export type ColorId =
    | 'red'
    | 'blue'
    | 'yellow'
    | 'orange'
    | 'purple'
    | 'cyan'
    | 'green'
    | 'pink'
    | 'magenta';

export const COLOR_BLUE = 0x3fa9f5;
export const COLOR_RED = 0xff4d5a;

//  Chosen to stay separable at a glance on a phone: no two sit close in hue,
//  and all are bright enough to read against both the light and dark worlds.
//  A level should still only use colours from opposite ends of this set.
export const COLOR_VALUES: Record<ColorId, number> = {
    red: COLOR_RED,
    blue: COLOR_BLUE,
    yellow: 0xffd23f,
    orange: 0xff8c42,
    purple: 0xa964ff,
    cyan: 0x2fe3d0,
    green: 0x5ddf6a,
    pink: 0xff7ab8,
    magenta: 0xff4fd8
};

// ---------------------------------------------------------------------------
//  Gates
// ---------------------------------------------------------------------------

export const GATE_HEIGHT = 104;
export const GATE_BAR_THICKNESS = 7;
export const GATE_PANEL_ALPHA = 0.22;
export const GATE_POST_WIDTH = 4;
export const GATE_POST_ALPHA = 0.55;

// ---------------------------------------------------------------------------
//  Finish
// ---------------------------------------------------------------------------

export const FINISH_HEIGHT = 44;
export const FINISH_ROWS = 2;
export const FINISH_COLUMNS = 6;
export const COLOR_FINISH_LIGHT = 0xf2f6ff;
export const COLOR_FINISH_DARK = 0x1b2540;

/** The track eases to a stop rather than freezing on the finish line. */
export const FINISH_SLOWDOWN_MS = 520;

// ---------------------------------------------------------------------------
//  Saving
// ---------------------------------------------------------------------------

/** localStorage key. The version suffix lets a future format start clean. */
export const STORAGE_KEY = 'dont-flow.save';

/** Bumping this discards saves written by an older, incompatible format. */
export const SAVE_VERSION = 1;

/** Reload drops the player back into the level they were last on. */
export const RESUME_AT_LAST_LEVEL = true;

// ---------------------------------------------------------------------------
//  Energy
//
//  Starting a level costs energy, which refills with real time. This gates how
//  much can be played in a sitting; it is not health, and it never affects a
//  run once started.
// ---------------------------------------------------------------------------

export const MAX_ENERGY = 5;

/** Real time to regain one energy. */
export const ENERGY_REFILL_MS = 10 * 60 * 1000;

/** Charged once per level start, including retries. */
export const ENERGY_COST_PER_LEVEL = 1;

export const ENERGY_PIP_RADIUS = 7;
export const ENERGY_PIP_GAP = 9;
export const ENERGY_TIMER_SIZE = 13;
export const ENERGY_TIMER_OFFSET = 20;
export const COLOR_ENERGY_FULL = 0x3fa9f5;
export const COLOR_ENERGY_EMPTY = 0x243352;

export const TITLE_ENERGY_Y = GAME_HEIGHT * 0.775;
export const MENU_ENERGY_Y = 134;
export const OVERLAY_ENERGY_Y = GAME_HEIGHT * 0.835;

/** How often the completion panel refreshes its energy countdown. */
export const OVERLAY_ENERGY_TICK_MS = 500;

// ---------------------------------------------------------------------------
//  Level complete overlay
// ---------------------------------------------------------------------------

export const OVERLAY_FADE_MS = 260;
export const OVERLAY_DIM_ALPHA = 0.78;
export const COLOR_OVERLAY_DIM = 0x060a14;

export const OVERLAY_TITLE_SIZE = 34;
export const OVERLAY_SCORE_SIZE = 76;
export const OVERLAY_DETAIL_SIZE = 20;
export const OVERLAY_BEST_SIZE = 18;
export const COLOR_NEW_BEST = '#ffc857';

export const BUTTON_WIDTH = 220;
export const BUTTON_HEIGHT = 62;
export const BUTTON_LABEL_SIZE = 24;
export const BUTTON_GAP = 14;
export const COLOR_BUTTON = 0x3fa9f5;
export const COLOR_BUTTON_LABEL = '#04101f';
export const COLOR_BUTTON_SECONDARY = 0x243352;
export const COLOR_BUTTON_SECONDARY_LABEL = '#c3d0e8';
export const COLOR_BUTTON_LOCKED = 0x141d33;
export const COLOR_BUTTON_LOCKED_LABEL = '#4a5675';

// ---------------------------------------------------------------------------
//  Menus
// ---------------------------------------------------------------------------

/** Menu screens scroll the track behind them, at a fraction of play speed. */
export const MENU_SCROLL_SPEED = 90;

export const TITLE_LOGO_Y = GAME_HEIGHT * 0.30;
export const TITLE_DROP_RADIUS = 30;
export const TITLE_SIZE = 46;
export const TITLE_TAGLINE_SIZE = 15;
export const TITLE_BUTTONS_Y = GAME_HEIGHT * 0.60;

export const MENU_HEADING_SIZE = 26;
export const MENU_HEADING_Y = 92;

/** Level select rows. */
export const LEVEL_ROW_WIDTH = 300;
export const LEVEL_ROW_HEIGHT = 68;
export const LEVEL_ROW_GAP = 12;
//  Leaves room for the energy meter and its countdown above the first row.
export const LEVEL_ROW_FIRST_Y = 214;
export const LEVEL_ROW_NAME_SIZE = 22;
export const LEVEL_ROW_DETAIL_SIZE = 14;
export const LEVEL_ROW_TEXT_INSET = 22;

// ---------------------------------------------------------------------------
//  Pause
// ---------------------------------------------------------------------------

/** Kept at a comfortable touch size rather than the size of the icon. */
export const PAUSE_BUTTON_SIZE = 44;
export const PAUSE_BUTTON_MARGIN = 14;
export const PAUSE_BAR_WIDTH = 5;
export const PAUSE_BAR_HEIGHT = 16;
export const PAUSE_BAR_GAP = 6;
export const COLOR_PAUSE_ICON = 0xc3d0e8;

// ---------------------------------------------------------------------------
//  Orbs & scoring
// ---------------------------------------------------------------------------

export const ORB_RADIUS = 13;
export const ORB_CORE_ALPHA = 0.3;

//  How close the drop's centre must be to an orb's lane, horizontally, to touch
//  it. Derived from the two radii, with a little slack so a near miss that
//  looks like a hit counts as one.
export const ORB_CATCH_SLACK = 4;
export const ORB_CATCH_RADIUS = DROP_RADIUS + ORB_RADIUS + ORB_CATCH_SLACK;

export const SCORE_PER_ORB = 10;

/**
 * A wrong colour costs double what a right one pays.
 *
 * The score is allowed to go negative rather than being floored at zero: the
 * penalty has to be felt, and hiding it would make a bad run read the same as a
 * cautious one.
 */
export const WRONG_COLOR_MULTIPLIER = 2;
export const SCORE_PENALTY = SCORE_PER_ORB * WRONG_COLOR_MULTIPLIER;

// ---------------------------------------------------------------------------
//  Feedback
// ---------------------------------------------------------------------------

export const BURST_PARTICLES = 12;
export const BURST_PARTICLE_RADIUS = 4;
export const BURST_SPEED_MIN = 70;
export const BURST_SPEED_MAX = 150;
export const BURST_DURATION = 420;

/** How long the drop stays red after touching a wrong-coloured orb. */
export const FLASH_DURATION = 160;
export const COLOR_FLASH = 0xff2b3d;

/** Haptic pulse lengths in ms. Silently ignored where unsupported. */
export const HAPTIC_COLLECT_MS = 12;
export const HAPTIC_MISS_MS = 45;

/** Screen kick on a wrong colour. Short and small - a nudge, not a jolt. */
export const SHAKE_DURATION = 190;
export const SHAKE_INTENSITY = 0.007;

/** The points won or lost, floating up from where it happened. */
export const FLOAT_SCORE_RISE = 52;
export const FLOAT_SCORE_DURATION = 720;
export const FLOAT_SCORE_SIZE = 22;
export const FLOAT_SCORE_PENALTY_SIZE = 27;
export const COLOR_SCORE_GAIN = '#9df5c4';
export const COLOR_SCORE_LOSS = '#ff6b78';

// ---------------------------------------------------------------------------
//  HUD
// ---------------------------------------------------------------------------

export const HUD_LEVEL_MARGIN_TOP = 15;
export const HUD_LEVEL_SIZE = 15;
export const HUD_MARGIN_TOP = 38;
export const HUD_SCORE_SIZE = 44;
export const HUD_COMBO_SIZE = 22;
export const HUD_FONT = 'Arial Black, Arial, Helvetica, sans-serif';
export const COLOR_HUD_TEXT = '#e8f1ff';
export const COLOR_HUD_DIM = '#7f8db0';

//  The HUD sits in front of the track, so orbs pass directly behind the score.
//  An outline in the background colour separates the text from whatever is
//  under it, without needing a panel behind it.
export const COLOR_HUD_STROKE = '#0b1020';
export const HUD_STROKE_THICKNESS = 5;
export const HUD_STROKE_THICKNESS_SMALL = 3;

/** Combo is only worth showing once it is actually a streak. */
export const COMBO_VISIBLE_FROM = 2;

// ---------------------------------------------------------------------------
//  Course
// ---------------------------------------------------------------------------

//  How far past the drop an object travels before it is destroyed.
export const CULL_MARGIN = 200;

// ---------------------------------------------------------------------------
//  Palette
// ---------------------------------------------------------------------------

export const COLOR_BG = 0x0b1020;
export const COLOR_TRACK = 0x131c30;
export const COLOR_LANE_LINE = 0x1e2b47;
export const COLOR_TRACK_EDGE = 0x2b3d63;
export const COLOR_RUNG = 0x1c2743;
export const COLOR_SIDE_TICK = 0x172038;

export const COLOR_DROP_NEUTRAL = 0xcfe8ff;
export const COLOR_DROP_HIGHLIGHT = 0xffffff;

// ---------------------------------------------------------------------------
//  Render order
// ---------------------------------------------------------------------------

export const DEPTH_TRACK = 0;
export const DEPTH_RUNGS = 1;
export const DEPTH_GATES = 5;
export const DEPTH_ORBS = 6;
export const DEPTH_DROP = 20;
export const DEPTH_FX = 25;
export const DEPTH_HUD = 40;
export const DEPTH_OVERLAY = 50;
