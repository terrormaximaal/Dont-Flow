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

//  Lanes a level carries unless it says otherwise. A level may ask for two
//  instead, which the early ones do: the road stays the same width, so two
//  lanes are wide ones and there is only ever one way to go.
//
//  Where the lanes actually are is worked out in `systems/Lanes`, from whatever
//  the level being played asked for - not from here.
export const DEFAULT_LANES = 3;
export const MIN_LANES = 2;

export const TRACK_WIDTH = 330;
export const TRACK_LEFT = (GAME_WIDTH - TRACK_WIDTH) / 2;

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
//  Perspective projection
//
//  The world is authored straight - lanes and distances - and put into
//  perspective only when it is drawn. Collision never sees any of this, which
//  is what keeps the camera free to change without touching gameplay.
// ---------------------------------------------------------------------------

/** How high up the screen the horizon sits: the camera's pitch. */
export const HORIZON_Y = GAME_HEIGHT * 0.24;

/**
 * The vanishing point's distance left of centre: the camera's yaw.
 *
 * Zero, and meant to stay zero. Anything else swings the far end of the road
 * to one side while its near end stays under the player, which reads as the
 * whole world being skewed across the screen rather than running away from the
 * camera. The road is meant to go straight forward from the player to the
 * middle of the horizon.
 *
 * Pitch and yaw are separate: HORIZON_Y above is what gives the view its
 * height and depth, and it is not affected by this being zero.
 */
export const VANISH_OFFSET = 0;

/** The depth the projection pivots around: the drop's own line stays put. */
export const PROJECTION_PIVOT_Y = DROP_SCREEN_Y;

/**
 * World distance at which something sits halfway between the horizon and the
 * player. Smaller bunches the far field harder into the distance.
 */
export const PERSPECTIVE_DEPTH = 900;

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

//  Passing a gate floods the new colour down through the drop instead of
//  swapping it in one frame. An exponential rate, fast enough that the drop has
//  finished changing well before the section's first orb arrives - even on the
//  quickest level, where that is about a third of a second away.
export const DROP_FLOOD_SPEED = 9;
//  Where the flood line starts and finishes, as multiples of the radius: above
//  the tip and below the belly, so it sweeps the whole body.
export const DROP_FLOOD_FROM = -2.2;
export const DROP_FLOOD_TO = 1.3;

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
/**
 * How much a collect thickens the streak, and how far it takes to settle.
 *
 * Distance rather than time, so a fast level does not get a shorter surge than
 * a slow one. Consecutive collects stack it, which is what makes a combo build
 * visibly without anything having to count.
 */
export const TRAIL_SURGE = 0.9;
export const TRAIL_SURGE_CAP = 2.2;
export const TRAIL_SURGE_DECAY = 320;

export const TRAIL_WIDTH = 34;
export const TRAIL_TAPER = 0.6;
//  Strongest a mark ever is, right under the drop.
export const TRAIL_ALPHA = 0.3;

// ---------------------------------------------------------------------------
//  The rainbow drop
//
//  A pickup that makes the drop match everything for a stretch: every orb
//  scores, every barrier is passed straight through. The only thing in the game
//  that changes the rules rather than the numbers, so it is rare, brief, and
//  always announces itself on the way out.
// ---------------------------------------------------------------------------

//  Measured in rows rather than seconds or pixels. A level's rows are its
//  opportunities, so counting them is what makes the power-up worth the same on
//  a slow early level as on a fast late one - seconds would be worth less where
//  rows come quickly, and pixels more.
export const RAINBOW_ROWS = 9;

//  The last share of it, over which the colours race and the drop pulses. It
//  must never simply stop: hitting a barrier because the power-up quietly
//  lapsed is the definition of unfair.
export const RAINBOW_WARNING = 0.32;

//  Colours per second while it runs, and while it is running out.
export const RAINBOW_CYCLE_SPEED = 2.4;
export const RAINBOW_WARNING_SPEED = 7;

//  The pickup itself, a little larger than an orb so it reads as a prize.
export const RAINBOW_RADIUS = 17;
export const RAINBOW_CORE_ALPHA = 0.75;

// ---------------------------------------------------------------------------
//  Swallowing an orb
//
//  The mirror of a burst: strands of the orb's colour collapse inwards instead
//  of being thrown out. An explosion says the orb was destroyed; this says it
//  was absorbed, which is the word the game is built on.
//
//  Contact happens when the orb has reached the drop, not before, so there is
//  no distance to travel in from - the strands are placed in a ring around the
//  meeting point and pulled to its centre.
// ---------------------------------------------------------------------------

export const SWALLOW_STRANDS = 6;
//  How far out the ring starts. Wider than the drop looks like something
//  bursting off it rather than being taken into it.
export const SWALLOW_SPREAD = 25;
//  A strand is long and thin, drawn pointing at the centre, so it reads as
//  liquid being drawn in rather than as a dot moving.
export const SWALLOW_LENGTH = 15;
export const SWALLOW_THICKNESS = 6;
export const SWALLOW_DURATION = 230;
//  Extra milliseconds spread across the strands, so they do not all land at
//  once and the drop looks fed rather than switched.
export const SWALLOW_STAGGER = 90;

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
//  Lighting
//
//  One light for the whole game, pointing up and to the left, which is where
//  the drop's highlight has always sat. Everything lit reads from this so the
//  scene agrees with itself.
// ---------------------------------------------------------------------------

export const LIGHT_X = -0.55;
export const LIGHT_Y = -0.84;

/** Tightens the lit band into a glancing highlight rather than a lit half. */
export const LIGHT_FALLOFF = 2.6;

// ---------------------------------------------------------------------------
//  Road surface
//
//  All of this is drawn between the road's flat fill and its markings, and all
//  of it is projected quads and lines - the same primitives the road itself is
//  made of, so none of it costs a new pass or a texture.
// ---------------------------------------------------------------------------

/**
 * Bands of shade laid over the road, darkest at the horizon.
 *
 * A single flat fill gives the eye nothing to measure distance against; this is
 * aerial perspective, and it is most of what makes the road read as receding
 * rather than as a painted triangle.
 */
export const ROAD_DEPTH_BANDS = 18;
export const ROAD_DEPTH_ALPHA = 0.5;

/** A soft sheen down the middle of the road, as if the sky were reflected. */
export const ROAD_SHEEN_LAYERS = 3;
export const ROAD_SHEEN_ALPHA = 0.05;
export const ROAD_SHEEN_WIDTH = 0.62;

/** A dark contact line where the road meets the verge, to seat one on the other. */
export const ROAD_CONTACT_WIDTH = 15;
export const ROAD_CONTACT_ALPHA = 0.16;

/** Soft light along the road's edges, widest and faintest on the outside. */
export const EDGE_GLOW_LAYERS = 3;
export const EDGE_GLOW_ALPHA = 0.12;
export const EDGE_GLOW_SPREAD = 7;

/**
 * Light strips running down the road, faster and further apart than the rungs.
 *
 * Two rates of movement read as more speed than one, because the eye picks the
 * difference between them rather than either on its own.
 */
export const STRIP_SPACING = 470;
export const STRIP_LENGTH = 150;
export const STRIP_WIDTH = 5;
export const STRIP_ALPHA = 0.16;
export const STRIP_INSET = 0.24;

// ---------------------------------------------------------------------------
//  Drop surfacing
// ---------------------------------------------------------------------------

/** A lit edge where the drop turns away from the light. */
export const DROP_RIM_ALPHA = 0.75;
export const DROP_RIM_THICKNESS = 2.4;

/** Light coming back up off the road, along the drop's underside. */
export const DROP_BOUNCE_ALPHA = 0.3;
export const DROP_BOUNCE_THICKNESS = 2;

/** A soft core, so the drop reads as full of something rather than painted. */
export const DROP_CORE_ALPHA = 0.1;

/** The tight glint, drawn as a run of shrinking circles along the light. */
export const DROP_GLINT_STEPS = 4;
export const DROP_GLINT_LENGTH = 0.3;

/** The puff of colour thrown off when a gate repaints the drop. */
export const BLOOM_MOTES = 10;
export const BLOOM_SPREAD = 46;
export const BLOOM_SIZE = 7;
export const BLOOM_DURATION = 340;

// ---------------------------------------------------------------------------
//  Gate presence
//
//  All of it driven by distance travelled rather than the clock, so a portal
//  breathes with the world and stops dead when the run is paused.
// ---------------------------------------------------------------------------

/** The portal's resting breath: how deep, and how far the world moves per cycle. */
export const PORTAL_PULSE_DEPTH = 0.28;
export const PORTAL_PULSE_PERIOD = 620;

/**
 * How far out a portal starts reacting to the drop, and how much brighter it
 * gets by the threshold.
 *
 * The point is to answer the player before they arrive: a doorway that only
 * responds once passed through has told them nothing they could act on.
 */
export const PORTAL_REACT_DISTANCE = 900;
export const PORTAL_REACT_GAIN = 0.7;

/** Bands of energy climbing the inside of a doorway. */
export const PORTAL_ENERGY_BANDS = 5;
export const PORTAL_ENERGY_ALPHA = 0.22;
export const PORTAL_ENERGY_RISE = 340;

/** The wave of light thrown back down the road as a gate is crossed. */
export const WAVE_DURATION = 420;
export const WAVE_THICKNESS = 26;
export const WAVE_ALPHA = 0.55;

/** A small punch of the camera on crossing. Never a shake. */
export const GATE_ZOOM = 1.015;
export const GATE_ZOOM_IN_MS = 70;
export const GATE_ZOOM_OUT_MS = 160;

// ---------------------------------------------------------------------------
//  Roadside lighting and atmosphere
// ---------------------------------------------------------------------------

/**
 * How far a distant prop fades into the world's own air.
 *
 * The road already does this. Props standing beside a road that recedes into
 * haze while they stay full strength read as cut out and pasted on, which is
 * most of what made the scenery look flat.
 *
 * Scaled by each world's own hazeAlpha at the point of use, because that is
 * what says how thick its air is. Applied flat, this washed the forest's near
 * black pines to pale mint - the forest names a light haze colour but lays it
 * on at 0.16, and the fog has to respect that.
 */
export const PROP_FOG = 0.9;

/**
 * The lit face down the side of a prop turned towards the light: how much
 * lighter it is, how wide a strip of the prop it covers, and how far towards
 * the light it sits.
 *
 * A strip, not a repaint. At half the prop's width it stops reading as a lit
 * edge and simply becomes the prop's colour, which turned every silhouette in
 * the forest grey.
 */
export const PROP_LIT_TINT = 0.42;

/** How far the world's haze is brightened before it is used as the light. */
export const PROP_LIGHT_LIFT = 0.4;
export const PROP_LIT_WIDTH = 0.3;
export const PROP_LIT_OFFSET = 0.62;

/** A prop's shadow, cast away from the light along the ground. */
export const PROP_SHADOW_ALPHA = 0.2;
export const PROP_SHADOW_LENGTH = 0.5;
export const PROP_SHADOW_SQUASH = 0.16;

// ---------------------------------------------------------------------------
//  Slipstream
//
//  Motes streaking past the drop, placed at world distances like everything
//  else, so they sweep by at exactly the speed the player is travelling and
//  hold still when the run is paused.
//
//  Kept off the road on purpose. The corridor is where the player is reading
//  orbs and barriers, and speed lines over it would be noise in the one place
//  that must stay clean.
// ---------------------------------------------------------------------------

export const SLIP_SPACING = 150;
export const SLIP_BUDGET = 20;
export const SLIP_LENGTH = 90;
export const SLIP_THICKNESS = 2.4;
export const SLIP_ALPHA = 0.3;

/** How far out from the road's edge they fly, and how far that varies. */
export const SLIP_OFFSET = 34;
export const SLIP_SPREAD = 150;

/** Nearer than this is where speed actually reads; beyond it they are dots. */
export const SLIP_MIN_SCALE = 0.34;

// ---------------------------------------------------------------------------
//  Vignette
//
//  Bands rather than a radial gradient, which Graphics cannot fill. Drawn once
//  at scene start, not per frame - it never changes.
// ---------------------------------------------------------------------------

export const VIGNETTE_BANDS = 14;
export const VIGNETTE_ALPHA = 0.2;

/**
 * Above the world and the effects, below the HUD.
 *
 * Over the HUD it would darken the score and the pause button - which sits in
 * the top corner, the darkest part of a vignette.
 */
export const VIGNETTE_DEPTH = 30;

// ---------------------------------------------------------------------------
//  Orb presence
// ---------------------------------------------------------------------------

/** Bob and spin, both measured against distance travelled. */
export const ORB_FLOAT = 5;
export const ORB_FLOAT_PERIOD = 300;
export const ORB_SPIN_PER_PIXEL = 0.0022;

/** A soft halo in the orb's own colour. */
export const ORB_GLOW_LAYERS = 3;
export const ORB_GLOW_ALPHA = 0.1;
export const ORB_GLOW_SPREAD = 9;

/** Motes circling an orb, so it reads as alive rather than parked. */
export const ORB_MOTES = 3;
export const ORB_MOTE_RADIUS = 1.6;
export const ORB_MOTE_ORBIT = 1.7;
export const ORB_MOTE_ALPHA = 0.65;

/**
 * How far out an orb starts answering the drop, and how much it swells by.
 *
 * Only ever for an orb the drop is actually lined up with, so the reaction is
 * a promise the game then keeps.
 */
export const ORB_REACT_DISTANCE = 420;
export const ORB_REACT_SWELL = 0.4;

/**
 * How far out a lined-up orb starts drifting towards the drop, and how much of
 * the way it gets. Presentation only: contact is still decided on the orb's
 * own lane position, which never moves.
 */
export const ORB_MAGNET_DISTANCE = 260;
export const ORB_MAGNET_REACH = 0.85;

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
// ---------------------------------------------------------------------------
//  The route
//
//  Levels are laid along a winding path rather than in a grid. A grid says
//  "here is a list of ten things"; a route says "here is a journey, and you
//  have come this far along it" - which is what the screen is actually for.
// ---------------------------------------------------------------------------

/** Where the first and last stop sit vertically. */
export const ROUTE_FIRST_Y = 176;
export const ROUTE_LAST_Y = 690;

/**
 * The wave the route runs along: how far it swings either side of centre, how
 * many full cycles it makes between the first stop and the last, and where in
 * the cycle it starts.
 *
 * Not a whole number of cycles, so the first and last stops sit at different
 * points on the curve and the route does not look like it closes a loop.
 */
export const ROUTE_SWING = 92;

/**
 * 2.25 cycles from a zero phase, which is not a guess.
 *
 * At most cycle counts some pair of consecutive stops straddles a peak of the
 * wave and lands within a few pixels of the same x - which puts two beads on
 * what looks like a straight piece of line. Searched across cycle and phase for
 * the pair that separates the *worst* pair the most: this one leaves every pair
 * a full swing apart horizontally, and 108px apart in all.
 */
export const ROUTE_CYCLES = 2.25;
export const ROUTE_PHASE = 0;

/** The stop itself, and the ring drawn around the one you would play next. */
export const ROUTE_NODE_RADIUS = 25;
export const ROUTE_NODE_RING = 4;
export const ROUTE_NEXT_PULSE = 6;
export const ROUTE_NEXT_PULSE_MS = 1100;

/** Type sizes on a stop: the number, and the line under it. */
export const ROUTE_NUMBER_SIZE = 22;
export const ROUTE_DETAIL_SIZE = 11;

/** How far the detail line sits from the node's centre, out to its own side. */
export const ROUTE_DETAIL_OFFSET = 44;

/** The path between stops: how thick, and how much of it is glow. */
export const ROUTE_LINE_WIDTH = 5;
export const ROUTE_LINE_GLOW = 3;
export const ROUTE_LINE_STEPS = 14;

/** Alpha of the road already walked, and of the part still locked. */
export const ROUTE_DONE_ALPHA = 0.85;
export const ROUTE_LOCKED_ALPHA = 0.16;

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

/**
 * Sliding barriers: how far they travel, and over what stretch of track.
 *
 * A plain distance rather than "one lane". Lane width now depends on how many
 * lanes the level asked for, and a barrier that swung further on the easier
 * levels would be exactly the wrong way round.
 */
export const SLIDER_AMPLITUDE = 110;
export const SLIDER_PERIOD = 620;

/** Pulsing barriers: how much they breathe, and how often. */
export const PULSE_AMOUNT = 0.42;
export const PULSE_PERIOD = 300;

// ---------------------------------------------------------------------------
//  Feedback
// ---------------------------------------------------------------------------

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
//  HUD polish
// ---------------------------------------------------------------------------

/**
 * How fast the score runs up to a new total, in points per second.
 *
 * A number that snaps is read as a different number; one that travels is read
 * as the same number changing, which is the whole reason a counter rolls. Fast
 * enough to have settled long before the next orb arrives.
 */
export const SCORE_ROLL_RATE = 260;

/** Smallest step worth rolling. Below it the roll is slower than just showing it. */
export const SCORE_ROLL_MIN = 2;

/** The score's own kick when it changes, up and down. */
export const SCORE_POP_SCALE = 1.22;
export const SCORE_POP_MS = 190;

/**
 * How long the score wears the colour of what just happened.
 *
 * The colours themselves are the floating-score ones, above: the number that
 * flies off the hit and the total it lands in have to agree.
 */
export const SCORE_TINT_MS = 260;

/**
 * How far towards that colour the world's own text colour is pulled.
 *
 * Low, and set by the tightest world rather than by taste: the desert carries
 * dark text on a bright orange sky, and past about a quarter of the way the
 * score stops separating from it. The kick carries the emphasis; this only has
 * to carry the meaning.
 */
export const SCORE_TINT_SHIFT = 0.25;

/** A soft glow behind the readouts, so they sit on any world without a plate. */
export const HUD_GLOW_BLUR = 12;
export const HUD_LEVEL_TRACKING = 3;

// ---------------------------------------------------------------------------
//  Button surfacing
// ---------------------------------------------------------------------------

/** Corner radius. A hard corner is the fastest way to look unfinished. */
export const BUTTON_RADIUS = 14;

/** How much lighter the top of a button is than its foot. */
export const BUTTON_SHEEN = 0.24;

/** Bands the sheen is stepped through. One step reads as a seam, not a curve. */
export const BUTTON_SHEEN_BANDS = 7;

/** A hairline along the top edge, which is what reads as a raised surface. */
export const BUTTON_EDGE_ALPHA = 0.4;

/** A soft halo under the primary button, in its own colour. */
export const BUTTON_GLOW_LAYERS = 5;
export const BUTTON_GLOW_SPREAD = 9;
export const BUTTON_GLOW_ALPHA = 0.07;

/** The press: how far it sinks, and how long it takes to come back. */
export const BUTTON_PRESS_SCALE = 0.955;
export const BUTTON_PRESS_MS = 90;
export const BUTTON_RELEASE_MS = 220;

/** Letter spacing on a label. Buttons are set wider than sentences. */
export const BUTTON_TRACKING = 2;

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
