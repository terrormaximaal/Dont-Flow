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

//  The drop never moves up or down the screen - the world comes towards it.
//  Sat low, so most of the screen is the road ahead rather than behind.
export const DROP_SCREEN_Y = GAME_HEIGHT * 0.78;

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
//  Diagonal projection
//
//  The world is authored straight - lanes and distances - and sheared into a
//  diagonal corridor only when it is drawn. Collision never sees any of this,
//  which is what keeps the tilt free to change without touching gameplay.
// ---------------------------------------------------------------------------

/** Where the road converges. Everything ahead runs towards this point. */
export const HORIZON_Y = GAME_HEIGHT * 0.30;

/**
 * The vanishing point's distance left of centre.
 *
 * This is what makes the road diagonal: the near end stays under the player
 * while the far end pulls away to one side, so the world reads as turning past
 * the camera rather than sliding down a chute.
 */
export const VANISH_OFFSET = 104;

/** The depth the projection pivots around: the drop's own line stays put. */
export const PROJECTION_PIVOT_Y = DROP_SCREEN_Y;

/**
 * World distance at which something sits halfway between the horizon and the
 * player. Smaller bunches the far field harder into the distance.
 */
export const PERSPECTIVE_DEPTH = 1150;

/** How fast something already passed drops away below the screen. */
export const BEHIND_RATE = 0.55;

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

//  How quickly the lean catches up with the drop's actual sideways speed.
//
//  That speed is worked out as "how far it moved since the last frame, divided
//  by how long the frame took", which is a noisy way to ask: an uneven frame
//  changes the answer by a tenth even when the drop is sliding perfectly
//  smoothly. Easing towards it filters that out, so the lean, the trailing tip
//  and the slosh are all driven by something steady. Low enough to smooth,
//  high enough that the lean still arrives with the slide rather than after it.
export const DROP_TILT_SMOOTHING = 26;
//  Radians of lean at full tilt.
export const DROP_LEAN_MAX = 0.34;
//  How much the drop stretches into the direction of travel at full tilt.
export const DROP_STRETCH = 0.16;

//  A shadow on the road under the drop, which is what actually places it in the
//  world rather than on the glass.
//  Surface. The drop is not a fixed shape that gets scaled - its outline is
//  rebuilt every frame from a set of overlapping ripples, which is what makes it
//  read as liquid rather than as a sprite being squashed.

//  Points around the outline. Below about 40 the ripples start to show as
//  straight edges; above 60 costs more for nothing.
export const DROP_SURFACE_POINTS = 56;

//  The ripples the surface is made of, as matched entries: how many lobes each
//  one has around the outline, how fast it travels (negative runs the other
//  way), and how far it pushes the edge in and out as a fraction of the radius.
//  Deliberately unrelated numbers, so the two never line up into a loop the eye
//  can catch.
//
//  Two low, slow ripples rather than three faster ones, one of them five-lobed.
//  Lobes are bumps: five of them around a drop this small, moving that quickly,
//  read as the edge shivering rather than as liquid. Keeping the counts low and
//  the amounts small leaves a long, soft swell that stays close to round, which
//  is what makes it look full instead of lumpy.
export const DROP_RIPPLE_LOBES = [ 2, 3 ];
export const DROP_RIPPLE_SPEEDS = [ 1.0, -1.6 ];
export const DROP_RIPPLE_AMOUNTS = [ 0.032, 0.018 ];

//  How much a pop - swallowing an orb - multiplies those ripples on top of
//  their resting size. This is the splash.
export const DROP_AGITATION_RIPPLE = 2.2;

//  The tip, which is what makes it a drop rather than a blob. Length is how far
//  it is pulled out past the radius; spread is how wide that pull is in radians,
//  where small is a sharp point.
export const DROP_TIP_LENGTH = 1.05;
export const DROP_TIP_SPREAD = 0.34;
//  Radians the tip trails behind a sideways move, so it whips along after the
//  body instead of turning with it.
export const DROP_TIP_TRAIL = 0.55;
//  The tip's own slow drift, and how fast it drifts.
export const DROP_TIP_SWAY = 0.12;
export const DROP_TIP_SWAY_SPEED = 0.9;

//  How much heavier the bottom of the drop hangs than the top. One smooth
//  swelling rather than a ripple, so it adds fullness without adding a bump.
export const DROP_BELLY = 0.14;

//  The shaded underside that turns a flat disc into something rounded.
//
//  Painted as several ellipses inside one another rather than one, because a
//  single flat oval on a drop this size reads as a grey shape laid on top, with
//  a rim you can pick out. Sharing the alpha between passes fades it out at the
//  edge instead.
export const DROP_SHADE_ALPHA = 0.17;
export const DROP_SHADE_LAYERS = 4;
export const DROP_SHADE_WIDTH = 1.5;
export const DROP_SHADE_HEIGHT = 0.85;
export const DROP_SHADE_DROP = 0.42;
//  How much smaller each pass is than the one before it.
export const DROP_SHADE_STEP = 0.17;

//  How far the highlight and the shaded underside slide against a sideways
//  move, as a fraction of the radius: the inside of the drop lagging behind the
//  outside, the way liquid does in a glass.
export const DROP_SLOSH = 0.34;

// ---------------------------------------------------------------------------
//  Wet trail
//
//  The drop leaves the road wet behind it. Marks are stamped at a fixed spacing
//  along the course rather than every frame, so the trail is the same length
//  however fast the level runs and however the frame rate wanders.
// ---------------------------------------------------------------------------

//  Track pixels between one mark and the next. Marks have to overlap or the
//  streak reads as a row of beads: at this spacing they sit about 4 screen
//  pixels apart against a mark half that tall again.
export const TRAIL_STAMP_SPACING = 7;
//  How far behind the drop a mark survives. Kept under the distance it takes to
//  fall off the bottom of the screen, so the trail fades rather than vanishing.
export const TRAIL_FADE_DISTANCE = 250;
//  Width of the streak at the drop's own depth, and how far it narrows over its
//  length - it should thin away behind rather than stop on a line.
export const TRAIL_WIDTH = 34;
export const TRAIL_TAPER = 0.6;
//  Strongest a mark ever is, right under the drop.
export const TRAIL_ALPHA = 0.3;

//  Blobs: the same liquid the drop is made of, at small sizes. Orbs use these,
//  and so does anything else that wants a wobbling lump rather than a circle.
//
//  A blob is much smaller than the drop, so its ripples have to be a bigger
//  share of its radius to read at all, and fewer points around it are enough -
//  which matters, because there can be a dozen on screen at once.
export const BLOB_SURFACE_POINTS = 22;
export const BLOB_RIPPLE_LOBES = [ 2, 3 ];
export const BLOB_RIPPLE_SPEEDS = [ 1.4, -2.2 ];
export const BLOB_RIPPLE_AMOUNTS = [ 0.075, 0.045 ];
//  Blobs ripple with distance travelled rather than with the clock, like
//  everything else in the world: they hold still when the game is paused, and a
//  level looks the same on every run.
export const BLOB_RIPPLE_PER_PIXEL = 0.01;

//  Growth. Collecting orbs swells the drop, which is the run's reward made
//  visible without reading a number. Purely cosmetic: collision uses
//  DROP_CONTACT_RADIUS, which never changes, so a fat drop is never harder to
//  squeeze past a barrier than a small one.

//  Score at which the drop reaches full size. Past this it stops growing, so a
//  long combo cannot fill the screen.
//  Sized against what a level can actually pay now that the combo multiplies:
//  a near-perfect run is worth somewhere under a thousand, so only a run like
//  that fills the drop right up.
export const DROP_GROWTH_FULL_SCORE = 900;
//  Size multiplier at that score. 1 would mean no growth at all.
export const DROP_GROWTH_MAX_SCALE = 1.4;
//  How quickly the drop eases towards its new size, as an exponential rate.
//  Low enough that the swell is a visible motion, not a jump.
export const DROP_GROWTH_SPEED = 5;

//  The squash the drop pops with each time it swallows an orb, on top of its
//  current size, and how fast that settles back.
export const DROP_POP_AMOUNT = 0.24;
export const DROP_POP_SPEED = 9;

//  Idle life. A drop of liquid is never quite still, and a player who is not
//  steering should still have something moving to look at.
export const DROP_IDLE_SPEED = 2.6;
//  How far it breathes: added to the width and taken off the height.
export const DROP_IDLE_SQUASH = 0.05;
//  Radians of lazy sway, on a slower cycle than the breathing so the two never
//  line up into an obvious loop.
export const DROP_IDLE_SWAY = 0.06;

export const DROP_SHADOW_ALPHA = 0.3;
export const DROP_SHADOW_DROP = 26;
export const DROP_SHADOW_SQUASH = 0.34;
export const DROP_GLOW_LAYERS = 4;
export const DROP_GLOW_SPREAD = 9;
export const DROP_GLOW_ALPHA = 0.11;

// ---------------------------------------------------------------------------
//  Input
// ---------------------------------------------------------------------------

//  Horizontal drag distance (px) that counts as one lane change. Higher means
//  the player has to commit to the swipe; lower gets twitchy.
export const SWIPE_THRESHOLD = 44;
//  A swipe must be this many times more horizontal than vertical to register,
//  so vertical drags do not steer the drop.
export const SWIPE_DOMINANCE = 1.5;
//  Shortest gap (ms) between two lane changes inside one unbroken drag. Without
//  any pacing a single fast flick fires both changes in consecutive frames and
//  the drop appears at the far edge rather than travelling there.
//
//  The ceiling on this is the game itself, not taste. Level 10 puts a row every
//  161ms and crossing two lanes takes 76ms of sliding on top of this wait, so
//  anything above about 85 makes a two-lane move between consecutive rows
//  impossible to ask for without lifting a finger - which cost real points on
//  the late levels while a first pass at 170 was in.
//
//  Note the pacing only applies within one drag. Two separate flicks, and the
//  keyboard, are never held up.
export const SWIPE_REPEAT_DELAY = 70;

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

export const COLOR_BLUE = 0x2b6ef5;
export const COLOR_RED = 0xff4d5a;

//  Chosen to stay separable at a glance on a phone: no two sit close in hue,
//  and all are bright enough to read against both the light and dark worlds.
//  A level should still only use colours from opposite ends of this set.
export const COLOR_VALUES: Record<ColorId, number> = {
    red: COLOR_RED,
    blue: COLOR_BLUE,
    yellow: 0xffd23f,
    orange: 0xff6a1f,
    purple: 0xc9a3ff,
    cyan: 0x1ef0c4,
    green: 0x3fb84f,
    pink: 0xff7ab8,
    magenta: 0xf01fa8
};

// ---------------------------------------------------------------------------
//  Gates
// ---------------------------------------------------------------------------

//  Portals stand *up* from the road rather than lying flat across it, so the
//  colour is read as a doorway to travel through.
export const PORTAL_HEIGHT = 150;
export const PORTAL_ARCH_RISE = 0.34;
export const PORTAL_ARCH_STEPS = 12;
export const PORTAL_FRAME_THICKNESS = 7;
export const PORTAL_INNER_ALPHA = 0.16;
export const PORTAL_GLOW_LAYERS = 3;
export const PORTAL_GLOW_SPREAD = 13;
export const PORTAL_GLOW_ALPHA = 0.07;

/** Light thrown onto the road in front of a portal. */
export const PORTAL_SPILL_DEPTH = 240;
export const PORTAL_SPILL_ALPHA = 0.16;
export const PORTAL_SPILL_STEPS = 9;

/** Motes drifting around the doorway. */
export const PORTAL_MOTES = 9;
export const PORTAL_MOTE_RADIUS = 3;
export const PORTAL_MOTE_ALPHA = 0.75;
export const PORTAL_MOTE_RISE = 90;

//  Kept for the level-complete banner's colours.
export const GATE_HEIGHT = PORTAL_HEIGHT;

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

//  Master switch. Off means levels are free and unlimited and the meter is
//  hidden, which is where this wants to be while the game is still being tuned:
//  waiting ten minutes to try a change again is no way to judge how something
//  feels. Everything below still works and is still tested - turning this back
//  on restores the costs, the waiting and the meter with nothing else to change.
export const ENERGY_ENABLED = false;

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

/**
 * Level select is a grid, not a list: ten rows in one column ran off the bottom
 * of the screen and took the BACK button with them, which on a touch device
 * left no way out at all.
 */
export const LEVEL_COLUMNS = 2;
export const LEVEL_ROW_WIDTH = 150;
export const LEVEL_ROW_HEIGHT = 66;
export const LEVEL_ROW_GAP = 14;
//  Leaves room for the energy meter and its countdown above the first row.
export const LEVEL_ROW_FIRST_Y = 248;
export const LEVEL_ROW_NAME_SIZE = 24;
export const LEVEL_ROW_DETAIL_SIZE = 12;
export const LEVEL_ROW_NAME_OFFSET = -11;
export const LEVEL_ROW_DETAIL_OFFSET = 15;

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

/**
 * The combo multiplier: what a streak is actually worth.
 *
 * Every COMBO_STEP orbs in a row, each orb starts paying one step more, up to
 * the cap. This is what makes a streak worth protecting - the flat rate it
 * replaced meant the twentieth orb of a clean run paid exactly what the first
 * one did, and "keep the combo" was a promise the scoring never kept.
 *
 * Sized against the levels rather than picked round: they hold between sixteen
 * and twenty-four orbs of any one colour, so a step of three puts the cap
 * around two thirds of the way through a level - reachable on a clean run,
 * never on a scrappy one.
 *
 * Note what a mistake costs now. The flat penalty below is the small half of
 * it; the real cost is dropping from the cap back to nothing, which is worth
 * far more than the points. That is deliberate, and why the penalty itself does
 * not also scale - being knocked from x5 to x1 is punishment enough.
 */
export const COMBO_STEP = 3;
export const COMBO_MAX_MULTIPLIER = 5;

// ---------------------------------------------------------------------------
//  Obstacles
// ---------------------------------------------------------------------------

/** Half the width of a barrier, in track pixels. */
export const OBSTACLE_HALF_WIDTH = 44;

/** How far a barrier reaches along the track. */
export const OBSTACLE_DEPTH = 52;

/**
 * How tall a barrier stands off the road.
 *
 * Lying flat they read as panels painted on the floor - decoration to drive
 * over. Standing up, they read as something in the way, which is what they are.
 */
export const OBSTACLE_STAND_HEIGHT = 78;
export const OBSTACLE_FOOT_ALPHA = 0.22;

/**
 * How close the drop's centre must be to count as hitting a barrier.
 *
 * Held below half a lane so a barrier only ever blocks its own lane - being in
 * the lane beside one must always be safe, or a level could take points for a
 * mistake the player did not make.
 */
export const DROP_CONTACT_RADIUS = DROP_RADIUS;

export const OBSTACLE_FILL_ALPHA = 0.34;
export const OBSTACLE_EDGE_THICKNESS = 4;
export const OBSTACLE_HATCH_COUNT = 3;
export const OBSTACLE_HATCH_ALPHA = 0.5;

/** Sliding barriers: how far they travel, and over what stretch of track. */
export const SLIDER_AMPLITUDE = LANE_WIDTH;
export const SLIDER_PERIOD = 620;

/** Pulsing barriers: how much they breathe, and how often. */
export const PULSE_AMOUNT = 0.42;
export const PULSE_PERIOD = 300;

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

/** The multiplier is only worth showing once it is actually paying extra. */
export const MULTIPLIER_VISIBLE_FROM = 2;

//  The readout kicks when the multiplier steps up: a number quietly changing at
//  the top of the screen is easy to miss with your eyes on the road.
export const MULTIPLIER_POP_SCALE = 1.7;
export const MULTIPLIER_POP_MS = 280;

// ---------------------------------------------------------------------------
//  Course
// ---------------------------------------------------------------------------

//  How far past the drop an object travels before it is destroyed.
export const CULL_MARGIN = 200;

/**
 * How far ahead objects are drawn at all.
 *
 * Perspective piles everything beyond this into a few pixels at the horizon, so
 * drawing it turns the far distance into an unreadable stack of portals rather
 * than a road running away.
 */
export const DRAW_DISTANCE = 3400;

/** The last stretch of the draw distance, over which something fades in. */
export const FADE_IN_DISTANCE = 900;

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

//  The ground sits below the road so roadside scenery can stand between them.
export const DEPTH_GROUND = -8;
export const DEPTH_ROADSIDE = -4;
export const DEPTH_TRACK = 0;
export const DEPTH_RUNGS = 1;
//  Above the road it is laid on, below the things it must never hide.
export const DEPTH_TRAIL = 2;
export const DEPTH_GATES = 5;
export const DEPTH_ORBS = 6;
export const DEPTH_DROP = 20;
export const DEPTH_FX = 25;
export const DEPTH_HUD = 40;
export const DEPTH_OVERLAY = 50;
