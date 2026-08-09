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

export type ColorId = 'blue' | 'red';

export const COLOR_BLUE = 0x3fa9f5;
export const COLOR_RED = 0xff4d5a;

export const COLOR_VALUES: Record<ColorId, number> = {
    blue: COLOR_BLUE,
    red: COLOR_RED
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
//  Level complete overlay
// ---------------------------------------------------------------------------

export const OVERLAY_FADE_MS = 260;
export const OVERLAY_DIM_ALPHA = 0.78;
export const COLOR_OVERLAY_DIM = 0x060a14;

export const OVERLAY_TITLE_SIZE = 34;
export const OVERLAY_SCORE_SIZE = 76;
export const OVERLAY_DETAIL_SIZE = 20;

export const BUTTON_WIDTH = 220;
export const BUTTON_HEIGHT = 62;
export const BUTTON_LABEL_SIZE = 24;
export const BUTTON_GAP = 14;
export const COLOR_BUTTON = 0x3fa9f5;
export const COLOR_BUTTON_LABEL = '#04101f';
export const COLOR_BUTTON_SECONDARY = 0x243352;
export const COLOR_BUTTON_SECONDARY_LABEL = '#c3d0e8';

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
