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
export const DEPTH_DROP = 20;
