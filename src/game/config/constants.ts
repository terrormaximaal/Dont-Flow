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
//  duration: higher = snappier, lower = floatier. ~20 lands around a 0.14s
//  slide. The drop always eases towards the target lane, it never snaps.
export const LANE_CHANGE_SPEED = 20;

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

/**
 * How far out a swapping gate starts trading its colours, and how long it takes.
 *
 * The start is deliberately the same distance at which a doorway begins
 * brightening for the lane the drop is in: the gate answers your choice, and
 * then changes its mind. Anything earlier and the swap happens before the
 * player has committed to anything, which makes it decoration.
 *
 * What is left after the span is the road there is to react in, and it is
 * enormous compared with what a lane change actually costs - crossing the whole
 * track takes under a hundred pixels even on the fastest level. That is on
 * purpose. A twist should cost attention rather than reflexes, and the guard in
 * test/gates.test.ts measures it against the real levels rather than trusting
 * these two numbers to stay sensible.
 */
export const GATE_SWAP_START = 900;
export const GATE_SWAP_SPAN = 200;

/**
 * How much white the doorways wash through as the colours change hands.
 *
 * Nearly all the way. At half this the swap read as the doorways going pale
 * for a moment, which is not an event - a player watching the road would see
 * the colours were different afterwards and never see them change. The whole
 * job of the flash is to be the thing that makes them look back up.
 */
export const GATE_SWAP_FLASH_ALPHA = 0.85;

/**
 * The second frame a swapping gate carries, so it can be told apart before it
 * does anything.
 *
 * A twist that gives no warning at all is a trick. This is the warning: the
 * doorway is drawn twice, and the player learns what a double frame means the
 * first time one of them swaps.
 */
/**
 * The grille across a barred doorway.
 *
 * Drawn in the doorway's own colour: the point of a sealed gate is that it is
 * still a gate. It says what colour it would have given and it still gives it,
 * so going through is a decision rather than an accident. Heavy enough to read
 * as shut from as far off as the doorway reads as a doorway.
 */
export const GATE_BARS = 5;
export const GATE_BAR_THICKNESS = 5;
export const GATE_BAR_ALPHA = 0.85;

export const GATE_SWAP_FRAME_INSET = 7;
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
//  The jump
//
//  Measured in track distance, not seconds. A jump timed in seconds would clear
//  a different length of road on every level, so an obstacle that could be
//  cleared on level 1 might be unclearable on level 10 purely because the road
//  is moving faster. In distance, a jump clears the same ground everywhere.
// ---------------------------------------------------------------------------

/**
 * How much road one jump covers.
 *
 * At the base pace this is a shade over a second in the air. Longer than that
 * and the drop hangs: the player has already decided what the jump was for
 * before it lands, and the wait reads as the game being slow rather than as
 * weight.
 */
export const JUMP_SPAN = 460;

/** How far up the screen the drop rises at the top of the arc. */
export const JUMP_LIFT = 96;

/**
 * How long before landing a jump can be asked for and still be honoured.
 *
 * A swipe made just before touching down used to be thrown away, and the
 * player who needs it most is the one it failed: two groups of hurdles sit a
 * span apart, so a drop that left the ground as late as it could lands with
 * about forty pixels of road left to ask for the next one. Forty pixels is a
 * tenth of a second. Missing that window is not a mistake worth punishing -
 * the player read the road correctly and swiped, and the game dropped it.
 *
 * Short on purpose. The argument against queueing a jump is a real one - a
 * request honoured long after it was made fires at a moment the player has
 * forgotten asking for - and it applies to an unbounded queue, not to a window
 * this size. At the base pace this is under a fifth of a second.
 *
 * A distance rather than a duration, like the arc it belongs to, so it means
 * the same thing on the slowest level and the fastest.
 */
export const JUMP_BUFFER = 80;

/**
 * How high the drop must be to clear a low obstacle, 0 to 1.
 *
 * Well inside the arc at both ends, so clearing one is a matter of jumping at
 * roughly the right time rather than exactly the right frame.
 */
export const JUMP_CLEAR_HEIGHT = 0.34;

/** The squash going up and the squash landing, and how long each lasts. */
export const JUMP_TAKEOFF_SQUASH = 0.26;
export const JUMP_LANDING_SQUASH = 0.3;

/** The shadow shrinks and fades as the drop climbs, which is how height reads. */
export const JUMP_SHADOW_SHRINK = 0.55;
export const JUMP_SHADOW_FADE = 0.6;

/**
 * How tall a low barrier stands, against a full one.
 *
 * Low enough that it reads as something to go over at a glance, without being
 * so low it stops reading as a barrier at all.
 */
export const HURDLE_HEIGHT_SCALE = 0.4;

/** How far along the road a hole runs, and how dark its floor is. */
export const GAP_DEPTH = 190;
export const GAP_FLOOR_ALPHA = 0.9;

/** The lit lip along the near edge, which is what stops a hole reading as paint. */
export const GAP_LIP_THICKNESS = 4;
export const GAP_LIP_ALPHA = 0.85;

/** Hatched warning bars across the near lip. */
export const GAP_WARN_BARS = 4;
export const GAP_WARN_ALPHA = 0.75;

/** Chevrons on a hurdle's face, which say "over" without saying anything. */
export const HURDLE_CHEVRONS = 3;
export const HURDLE_CHEVRON_ALPHA = 0.9;

/**
 * How quickly the road takes up a new pace.
 *
 * Eased rather than snapped. A step change in speed on a screen where the only
 * cue is how fast the ground moves reads as a dropped frame - the player sees
 * a glitch, not an event. Fast enough to arrive within the first row of the
 * section, slow enough to be felt happening.
 */
export const PACE_SMOOTHING = 3.2;

/** How far the camera pulls back at full boost, and how fast it follows. */
export const BOOST_ZOOM = 0.965;
export const BOOST_ZOOM_SMOOTHING = 2.4;

/** An upward flick this long, and this much more vertical than sideways, jumps. */
export const SWIPE_UP_THRESHOLD = 34;

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

/**
 * The alpha of the outermost ring, which is the strength of the whole effect.
 *
 * Stated as the edge rather than as a total divided between the rings, because
 * only one ring covers any given pixel - so the total was never a number
 * anything could see, and reading it as one made the low-score vignette an
 * order of magnitude fainter than intended.
 */
export const VIGNETTE_ALPHA = 0.2 / VIGNETTE_BANDS;

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
//  Running out
//
//  What happens when the bank empties. Deliberately slower and heavier than
//  the finish: crossing the line is a full stop, and this is the road being
//  taken away, which should not feel like the same event in a different colour.
// ---------------------------------------------------------------------------

/**
 * How long the road takes to stop once the run is over.
 *
 * Two and a half times the finish. The extra is the whole effect - it is long
 * enough to watch, which is what makes it read as slow motion rather than as a
 * pause, and it gives the player a moment to see what they hit.
 */
export const FAIL_SLOWDOWN_MS = 1300;

/** How far the camera creeps in over that stop. Small, and never released. */
export const FAIL_ZOOM = 1.09;

/** The hit itself: a hard shake, then the colour draining out of the world. */
export const FAIL_SHAKE_MS = 420;
export const FAIL_SHAKE_INTENSITY = 0.022;

/** A flash of the loss colour over everything, at the moment of the hit. */
export const FAIL_FLASH_MS = 340;
export const COLOR_FAIL_FLASH = 0xff5566;

/** How long the world takes to drain to the fail wash, and how dark that is. */
export const FAIL_WASH_MS = 900;
export const FAIL_WASH_ALPHA = 0.42;

/**
 * The edges closing in as the bank runs low.
 *
 * A second vignette in the loss colour, held at zero until the score drops
 * under the warning line and then breathing in and out. The point is that it
 * is visible in the corner of the eye while the player is looking at the road,
 * which a number at the top of the screen is not.
 */
/**
 * How hard the edges press in while the next mistake is fatal.
 *
 * Softer than it was, because what it reports has changed. It used to mark a
 * state a run had to fall into, which was rare and lasted seconds; under the
 * rule that a level starts at nothing, being one mistake from the end is where
 * every level *begins* and can last a third of it. At the old strength that is
 * a game shouting through its whole opening, and an alarm that never stops is
 * an alarm nobody hears.
 *
 * Still several times the ambient darkening, and still the loudest thing on
 * the screen that is not the road.
 */
export const LOW_VIGNETTE_ALPHA = 0.24;

/**
 * Enough rings that the ramp between them is not a ramp anyone can see.
 *
 * Far more than the ambient vignette needs, and for a reason that is easy to
 * get wrong: what makes a step visible is the *absolute* jump in alpha between
 * two neighbouring rings, not the number of rings. The ambient darkening is so
 * faint that fourteen steps are invisible; this one is twenty times stronger,
 * so the same fourteen steps read as fourteen concentric rectangles drawn in
 * the corners. Drawn once at startup, so the count costs nothing per frame.
 */
export const LOW_VIGNETTE_BANDS = 60;
export const LOW_VIGNETTE_FADE_MS = 420;
export const LOW_PULSE_MS = 760;
export const LOW_PULSE_DEPTH = 0.45;

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

/** The fail panel's heading, which is louder than the level-complete one. */
export const OVERLAY_FAIL_TITLE_SIZE = 44;
export const COLOR_FAIL_TITLE = '#ff6b78';
export const OVERLAY_SCORE_SIZE = 76;
export const OVERLAY_DETAIL_SIZE = 20;
export const OVERLAY_BEST_SIZE = 18;
export const COLOR_NEW_BEST = '#ffc857';

/**
 * The completion panel's total counting up rather than appearing.
 *
 * The score is the whole point of the screen and it was being handed over as a
 * finished fact. A number that travels is read as something earned; the same
 * number stamped down is read as a label. Rolled at a rate rather than over a
 * duration, like the in-game readout, so a big score visibly takes longer.
 */
export const OVERLAY_COUNT_RATE = 420;
export const OVERLAY_COUNT_MAX_MS = 1100;

/**
 * How the panel's parts arrive.
 *
 * The same idea as the home screen: fading a whole panel in as one block is
 * what an assembled screen looks like. Staggering it by a few frames a line
 * costs nothing and reads as a result being announced.
 */
export const OVERLAY_STAGGER_MS = 80;
export const OVERLAY_PART_RISE = 14;

export const BUTTON_WIDTH = 220;
export const BUTTON_HEIGHT = 62;
export const BUTTON_LABEL_SIZE = 24;
export const BUTTON_GAP = 14;
export const COLOR_BUTTON = 0x3fa9f5;
export const COLOR_BUTTON_LABEL = '#04101f';
export const COLOR_BUTTON_LOCKED = 0x141d33;
export const COLOR_BUTTON_LOCKED_LABEL = '#4a5675';

// ---------------------------------------------------------------------------
//  Menus
// ---------------------------------------------------------------------------

/** Menu screens scroll the track behind them, at a fraction of play speed. */
export const MENU_SCROLL_SPEED = 90;

export const TITLE_LOGO_Y = GAME_HEIGHT * 0.30;
export const TITLE_DROP_RADIUS = 34;
export const TITLE_SIZE = 46;
export const TITLE_TAGLINE_SIZE = 15;
export const TITLE_BUTTONS_Y = GAME_HEIGHT * 0.60;

export const MENU_HEADING_SIZE = 26;
export const MENU_HEADING_Y = 88;

/** A kicker rule above the heading, the same mark the home screen carries. */
export const MENU_KICKER_Y = 60;
export const MENU_KICKER_WIDTH = 76;

/** How far along the game the player is, set under the heading. */
export const MENU_PROGRESS_Y = 118;
export const MENU_PROGRESS_SIZE = 13;

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

/** The band of screen the route is seen through, between heading and BACK. */
export const ROUTE_VIEW_TOP = 150;
export const ROUTE_VIEW_BOTTOM = 700;

/**
 * How far inside each edge of that band a stop takes to fade out completely.
 *
 * Nothing is clipped: everything on the route fades out over the last stretch
 * of its approach and reaches the edge with nothing left to cut. Wider than a
 * bead, so the fade is read as a fade rather than as a flicker at the edge.
 */
export const ROUTE_FADE_BAND = 76;

/**
 * Where the first stop sits vertically.
 *
 * A whole fade band below the top of the view, so the first stop is at full
 * strength when the route is scrolled to the top rather than half dissolved
 * into the heading. The same clearance is left at the other end, in
 * routeScrollRange - a route whose two ends are the only stops that can never
 * be seen properly has them the wrong way round.
 */
export const ROUTE_FIRST_Y = ROUTE_VIEW_TOP + ROUTE_FADE_BAND;

/**
 * How far apart two stops sit down the route.
 *
 * The route no longer fits on a screen. Twenty stops at a spacing that keeps
 * two beads from touching is longer than a phone is tall, so the whole thing
 * scrolls - which is the honest answer, and a better one than shrinking every
 * stop until the numbers stop being readable.
 */
export const ROUTE_STEP_Y = 64;

export const ROUTE_LAST_Y = ROUTE_FIRST_Y + (ROUTE_STEP_Y * 19);


/** How far a drag has to travel before it counts as a scroll and not a tap. */
export const ROUTE_DRAG_SLOP = 8;

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
/**
 * How many times the route waves from side to side over its whole length.
 *
 * Searched rather than chosen, for the value that maximises the smallest
 * sideways step between two neighbouring stops - two stops at the same x with
 * a curve between them read as a straight line with beads threaded on it. At
 * twenty stops this puts every neighbour a full swing apart, which is as far
 * as the shape allows.
 */
export const ROUTE_CYCLES = 4.75;
export const ROUTE_PHASE = 0;

/** The stop itself, and the ring drawn around the one you would play next. */
export const ROUTE_NODE_RADIUS = 26;
export const ROUTE_NODE_RING = 4;
export const ROUTE_NEXT_PULSE = 6;
export const ROUTE_NEXT_PULSE_MS = 1100;

/** Type sizes on a stop: the number, and the line under it. */
export const ROUTE_NUMBER_SIZE = 22;
export const ROUTE_DETAIL_SIZE = 12;

/** How far the detail line sits from the node's centre, out to its own side. */
/**
 * How far out from a stop its score sits.
 *
 * Far enough to clear the route on its way out of the bead. At the old
 * forty-four the line and the first stop's label crossed each other, which
 * reads as a collision however cleanly the label is drawn on top.
 */
export const ROUTE_DETAIL_OFFSET = 56;

/** The path between stops: how thick, and how much of it is glow. */
export const ROUTE_LINE_WIDTH = 7;
export const ROUTE_LINE_GLOW = 5;
export const ROUTE_LINE_STEPS = 14;

/**
 * Light travelling along the part of the route already walked.
 *
 * The one piece of ambient movement this screen has, and it is the right one:
 * the game is named after flow, so the path the player has flowed along is the
 * thing that should be moving. Nothing ahead of the furthest level moves at
 * all, which makes the boundary between reached and not visible without a
 * single label.
 */
export const ROUTE_MOTES = 5;
export const ROUTE_MOTE_RADIUS = 3.2;
export const ROUTE_MOTE_ALPHA = 0.9;
export const ROUTE_MOTE_SECONDS = 7.5;

/** How the stops arrive: staggered down the route, in the order they are walked. */
export const ROUTE_ENTER_MS = 420;
export const ROUTE_ENTER_STAGGER = 26;
export const ROUTE_ENTER_FROM = 0.55;

/** The dip a stop takes when it is pressed, before the screen washes out. */
export const ROUTE_PRESS_SCALE = 0.88;
export const ROUTE_PRESS_MS = 110;

// ---------------------------------------------------------------------------
//  The bead a stop is drawn as
//
//  Each one is a window onto the world its level is played in: that world's own
//  sky over that world's own ground, with a horizon between them. Ten of them
//  down the route is a preview of the whole game.
// ---------------------------------------------------------------------------

/** Bands the sky inside a bead is laid in. Enough that no step shows. */
export const BEAD_BANDS = 26;

/** Where the ground starts, as a fraction of the radius from the centre. */
export const BEAD_GROUND_LINE = 0.22;

export const BEAD_RING_WIDTH = 2.5;
export const BEAD_SHEEN_ALPHA = 0.22;

export const BEAD_HALO_LAYERS = 5;
export const BEAD_HALO_SPREAD = 9;
export const BEAD_HALO_ALPHA = 0.055;

/** How far a locked bead is washed towards the menu's own sky. */
export const BEAD_LOCKED_MUTE = 0.8;

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
/** The pause control's own slab. Chrome, not one of the button family. */
export const COLOR_PAUSE_BUTTON = 0x243352;

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

//  How far past the drop a missed orb keeps being drawn, in track pixels.
//  Behind the player there is no depth left to show and the perspective only
//  spreads things outwards, which reads as the orb sliding sideways. Fading it
//  out over a short stretch keeps the miss visible without the drift.
export const ORB_PASS_FADE = 70;

export const SCORE_PER_ORB = 10;

/**
 * A wrong colour costs double what a right one pays.
 *
 * The penalty has to be felt, and the score is where it lands. Nothing is
 * hidden or floored part-way: a bad run reads as a bad run.
 */
export const WRONG_COLOR_MULTIPLIER = 2;
export const SCORE_PENALTY = SCORE_PER_ORB * WRONG_COLOR_MULTIPLIER;

/**
 * What a run starts with.
 *
 * Nothing. The score is the performance figure and the survival condition at
 * once: everything correct adds to it, everything wrong takes from it, and the
 * run ends the moment it goes below zero.
 *
 * Starting at zero is what makes that rule bite from the first second. There is
 * no cushion to spend, so the opening of a level stops being a formality -
 * points have to be earned before a mistake can be afforded, and the first
 * stretch of a level is the stretch that buys the rest of it.
 *
 * Raise this to hand the player a cushion. The rule below does not change.
 */
export const SCORE_START = 0;

/**
 * The score a run ends *below*.
 *
 * Strictly below, not at. Zero is alive: a player who has spent exactly what
 * they earned is on the edge rather than over it, and the difference between
 * "nothing left" and "gone" is most of the tension of a bad run's last few
 * seconds.
 */
export const SCORE_DEATH_BELOW = 0;

/**
 * The score at or below which the run is visibly in trouble.
 *
 * One mistake's worth. At or under this, the next wrong colour ends the run -
 * so the warning is not "you are getting low", it is "the next one is fatal",
 * which is worth interrupting the screen for.
 */
export const SCORE_WARNING = SCORE_PENALTY;

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

/**
 * Rotating bars: how far the bar reaches from its pivot, and over what stretch.
 *
 * A bar turning about its lane is seen from above as a width that opens and
 * closes: broadside it reaches its full length across the road, edge-on it is
 * barely there. That is the whole obstacle - not a thing to steer around, a
 * thing to arrive at while it is turned away.
 *
 * The reach is deliberately less than two lanes. A bar that could cover its own
 * lane and both neighbours at once would leave a three-lane road with no way
 * through at all at the top of its sweep, and there is a test holding rotors to
 * leaving a lane free through the whole turn rather than only where the row
 * happens to land - the same rule the paired sliders had to learn.
 */
export const ROTOR_REACH = 150;
export const ROTOR_PERIOD = 540;

/**
 * How a rotating bar is drawn: a beam on a post, not a wall.
 *
 * A wall of changing width reads as a pulse with a wide setting, and a player
 * who reads it that way stands in the next lane and is swept off the road. The
 * height is where the beam sweeps, as a fraction of how tall a barrier stands.
 */
export const ROTOR_BAR_HEIGHT = 0.62;
export const ROTOR_BAR_THICKNESS = 13;
export const ROTOR_POST_WIDTH = 9;

/**
 * Disappearing floor: how much of its cycle the hole is open, and how long.
 *
 * A hole that is not always there. Colour has never saved anyone from a hole,
 * and neither does a lane change if every lane on the row is one - it is a
 * question of arriving while the road is back.
 *
 * Open for less than half the cycle, so the road is solid more often than not.
 * A floor that is missing most of the time is a hole with interruptions, which
 * is a different and much worse obstacle.
 */
export const BLINK_PERIOD = 480;
export const BLINK_OPEN = 0.42;

/**
 * How faintly a closed disappearing floor is still drawn.
 *
 * Not nothing. A hole that vanished without a trace would be one the player
 * could only learn about by falling into it, and the rhythm is the whole
 * obstacle - it has to be visible while it is shut, or there is nothing to
 * read. Faint enough that open and closed are never confused at a glance.
 */
export const BLINK_GHOST_ALPHA = 0.22;

/**
 * How a drain zone is drawn.
 *
 * A drain the player cannot see is not a hazard but a bug they will report as
 * one. The wash is the ground being tinted; the bands are bars across it, held
 * at fixed points along the course so they sit still on the road rather than
 * crawling with the camera; the edges are where it starts and stops.
 *
 * Faint. A zone covers a long stretch of road and everything that matters -
 * orbs, gates, barriers - still has to be read through it.
 */
export const HAZARD_WASH_ALPHA = 0.17;
export const HAZARD_BAND_ALPHA = 0.13;
export const HAZARD_BAND_SPACING = 130;
export const HAZARD_EDGE_ALPHA = 0.75;
export const HAZARD_EDGE_THICKNESS = 3;

/**
 * Marks leaning against the direction of travel, across each band.
 *
 * The part of a zone that means "do not" without relying on hue. A coloured
 * hazard has to say which colour it objects to, so its wash is that colour -
 * and a green zone washed green would otherwise read as a place to go.
 */
export const HAZARD_SLASHES = 6;
export const HAZARD_SLASH_ALPHA = 0.3;
export const HAZARD_SLASH_THICKNESS = 2;

/**
 * What a zone with no colour of its own is drawn in: a hostile amber.
 *
 * Also the colour of every zone's edges, coloured or not, so the frame always
 * means hazard even when the fill inside it is inviting.
 */
export const HAZARD_PLAIN_COLOR = 0xff9b3d;

/**
 * Where the chances left are drawn, in an endless run.
 *
 * Top left, opposite the pause button, and beside the score rather than under
 * it - the score and the lives are the two things that say how a run is going,
 * and a player checking one should see the other without moving their eyes.
 */
/**
 * How many endless runs the table keeps.
 *
 * Five stored, three shown. Keeping more than are shown means a run that drops
 * off the visible table has not been forgotten - beat the third-best twice and
 * the fourth is still there underneath.
 */
/**
 * Where a colour's mark hangs in its doorway, and how strongly.
 *
 * High in the arch rather than centred, so it sits above the orbs seen through
 * the gate rather than among them. Faint, because it is a second way of reading
 * something the colour has already said - a player who does not need it should
 * barely notice it is there.
 */
export const PORTAL_GLYPH_HEIGHT = 0.3;
export const PORTAL_GLYPH_ALPHA = 0.5;

/**
 * Where the game tells a player what to do, and how loudly.
 *
 * Low, just above the drop, because that is where the eye already is - a prompt
 * at the top would be read after the row it was about had gone past. Pale,
 * because it is help rather than an alarm and the player is trying to read the
 * road behind it.
 */
export const COACH_Y = GAME_HEIGHT * 0.64;
export const COACH_SIZE = '20px';
export const COACH_ALPHA = 0.82;

/** The sound toggle: a corner label rather than a button. */
export const MUTE_MARGIN = 18;

/**
 * Line spacing for the switches stacked in the corner.
 *
 * Set by the size of a thumb rather than by the size of the type. At 20 these
 * two sat six pixels apart, which on a phone is one target: a player reaching
 * for the sound had a real chance of turning the shape marks off instead, and
 * those marks are the thing some players cannot play without.
 */
export const MUTE_LINE = 46;
export const MUTE_SIZE = '13px';
export const MUTE_ALPHA = 0.55;

/**
 * What a corner switch is worth touching, as opposed to what it is worth
 * looking at.
 *
 * The label is thirteen pixels of type and its glyph box is fourteen tall,
 * which was also, until this existed, the entire area that responded to a
 * finger. Apple asks for 44 points and Android for 48; fourteen game pixels is
 * about twelve of either. It was measured rather than noticed - the buttons on
 * the same screen are 246 by 62, so nothing about the screen looked wrong.
 *
 * These are game pixels, and the canvas is letterboxed into whatever the phone
 * has: 46 lands near 41 CSS pixels on a 430-wide screen and near 36 on a
 * 375-wide one. Short of the guideline, and three times what was there. Taller
 * would collide with the drop, which is the composition rather than furniture,
 * so the height is what the corner has to give and the width - far more
 * generous than the words need - is where the rest of the forgiveness comes
 * from.
 */
//  The switches in the corner, and the one in the pause overlay.
//
//  They were two dim words with an invisible hit area behind them, which reads
//  as a caption rather than as a control - and a setting a player cannot find
//  is a setting that is not there. As a pill they are the same shape as every
//  other thing in this game that answers to a finger.
export const CHIP_WIDTH = 132;
export const CHIP_HEIGHT = 34;
export const CHIP_PAD = 12;
export const CHIP_ICON = 15;
export const CHIP_GAP = 8;
export const CHIP_LABEL_SIZE = '12px';
export const CHIP_FILL_ALPHA = 0.16;
export const CHIP_EDGE_ALPHA = 0.4;
export const CHIP_GLYPH_WIDTH = 1.6;

/**
 * How far back a switch is drawn when it is off.
 *
 * Back rather than out. A switch that vanishes when it is off is a switch a
 * player cannot find in order to turn it on again.
 */
export const CHIP_OFF_ALPHA = 0.62;

export const MUTE_TOUCH_HEIGHT = 46;
export const MUTE_TOUCH_WIDTH = 150;

export const SURVIVAL_TABLE = 5;
export const SURVIVAL_TABLE_SHOWN = 3;

export const HUD_LIVES_X = 30;
export const HUD_LIVES_Y = 44;
export const HUD_LIVES_STEP = 26;
export const HUD_LIVES_RADIUS = 6;

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
/**
 * The bank meter under the score: one segment per mistake it can still absorb.
 *
 * Narrower than the score above it on purpose. It is a footnote to that number
 * rather than a second readout competing with it, and the eye should land on
 * the total first and only then on how much room is left.
 */
export const BANK_METER_WIDTH = 118;
export const BANK_METER_HEIGHT = 5;
export const BANK_METER_GAP = 3;
export const BANK_METER_TRACK_ALPHA = 0.22;
export const BANK_METER_FADE_MS = 260;

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
/**
 * Corner radius, which at half the height is a pill.
 *
 * One shape everywhere. The home screen was reworked into pills and the panels
 * kept their softer rectangle, which meant the game had two button languages
 * one tap apart - and the difference read as two builds rather than as a
 * deliberate distinction. What separates the home screen's PLAY now is that it
 * is the only gradient in the game, which is a stronger signal than a corner.
 */
export const BUTTON_RADIUS = BUTTON_HEIGHT / 2;

/** How much lighter the top of a button is than its foot. */
export const BUTTON_SHEEN = 0.24;

/** Bands the sheen is stepped through. One step reads as a seam, not a curve. */
/**
 * Enough bands that the ramp is not visible as bands.
 *
 * Seven of them stepped the alpha by about 0.034 each, which is nearly three
 * times the point at which a step across a flat surface becomes a line - and
 * on a pill, where the eye is already following a curve, it read as stripes.
 * Drawn once per button, so the count costs nothing.
 */
export const BUTTON_SHEEN_BANDS = 26;

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

// ---------------------------------------------------------------------------
//  Sound
// ---------------------------------------------------------------------------
//  Every sound the game makes is built from oscillators at the moment it
//  plays: no files, the same way every picture in it is drawn rather than
//  loaded.
//
//  The instrument is a cabinet in an arcade in 1987: square waves, a triangle
//  under the bass, noise for the drums, and nothing held longer than a beat.
//  There is almost no reverb, because an arcade machine has none - and because
//  a game whose sound has no depth in it cannot sound muddy however much is
//  happening.
//
//  The division of labour is the other half of it. The music carries the
//  rhythm and the tune; the game only ticks along on top. What the player does
//  is not narrated by the sound - it is on the screen.

/** Everything the game plays passes through this. */
export const SOUND_MASTER = 0.9;

/**
 * How long the master takes to fall silent when the sound is turned off.
 *
 * Short enough to read as immediate and long enough not to click. A gain cut
 * to zero between one sample and the next is a step in the waveform, and a
 * step is a click - which would be a strange thing to hear as the last sound
 * before silence.
 */
export const MUTE_FADE = 0.04;

/**
 * How long the soundtrack takes to go when it is stopped.
 *
 * Longer than the mute, because this one happens while the player is listening
 * to something else - a pause overlay opening, or the phrase that ends a run -
 * and a backing that disappears between two samples is heard as a fault rather
 * than as a decision. Still short enough to be gone before the thing it is
 * making room for has finished.
 */
export const MUSIC_FADE = 0.12;

//  The limiter across the master. Notes are triggered by how the player is
//  doing rather than by an arrangement, so a good run overlaps half a dozen of
//  them - which without this adds up past what the speaker can give and is
//  heard as a crackle.
export const SOUND_COMPRESSOR_THRESHOLD = -14;
export const SOUND_COMPRESSOR_KNEE = 12;
export const SOUND_COMPRESSOR_RATIO = 6;
export const SOUND_COMPRESSOR_ATTACK = 0.004;
export const SOUND_COMPRESSOR_RELEASE = 0.25;

/**
 * G below middle C. Every note in the game is a number of semitones from here.
 *
 * The written music is in G minor and this is where it sits, so every number in
 * `config/score` is the note that was written rather than the note transposed
 * to wherever the game's root happened to be.
 */
export const SOUND_ROOT_HZ = 196.00;

/**
 * The note a collected orb plays. Always this one.
 *
 * It used to climb with the streak, and that was wrong twice over: it was the
 * sound heard most often in the game, and it was the one that changed most.
 *
 * Nineteen semitones over G is the D two octaves up: the fifth of the key,
 * which is in three of the four chords the backing turns on and consonant with
 * the fourth. It can land at any moment of any bar without ever being wrong,
 * which is the only thing that matters about a note played hundreds of times a
 * run at moments nobody is arranging.
 */
export const ORB_SEMITONES = 19;

//  How the two filtered voices are shaped, as harmonic strengths: the first
//  number is the note itself and each one after it is the next harmonic up.
//
//  A square wave is every odd harmonic at full strength forever, which is why
//  one sounds like a buzzer and a dozen at once sound like an alarm. These roll
//  off instead. The first handful of harmonics is what makes a note sound like
//  an instrument; the twentieth is only what makes it sting.
//  The tune is a wind instrument, so it is nearly a sine with a little on top.
//  A flute is almost only its fundamental; a recorder and a soft horn have a
//  second and a third and very little after that. Everything above the fourth
//  is what would make it a reed, and a reed is what "not too sharp" rules out.
export const LEAD_PARTIALS = [ 1, 0.34, 0.16, 0.06, 0.025, 0.01 ];
export const BASS_PARTIALS = [ 1, 0.72, 0.38, 0.22, 0.12, 0.06, 0.03 ];

//  The bass: that shape with a sine an octave below it. The sine is what gives
//  it a body on a phone, where the top half alone is a buzz.
export const BASS_ATTACK = 0.004;
export const BASS_HOLD = 0.05;
export const BASS_DECAY = 0.16;

//  And the filter over it, in multiples of the note being played rather than
//  in hertz - so a note two octaves up is filtered the same distance above
//  itself as one two octaves down. Open at the strike, shut by the end: that
//  fall is the difference between a plucked string and a tone generator.
export const BASS_FILTER_FROM = 9;
export const BASS_FILTER_TO = 1.6;
export const BASS_FILTER_Q = 4;

//  The channel that plays the tune. A shade longer than the bass notes so it
//  sings over them rather than clicking along with them.
//  A moment to speak rather than an instant. That delay is the single thing
//  that separates something blown from something struck, and it is worth more
//  than any waveform: an instant attack is a key, a slow one is a breath.
export const LEAD_ATTACK = 0.03;
export const LEAD_HOLD = 0.06;
export const LEAD_DECAY = 0.16;

//  Soft above, and low resonance. This is the one voice that plays for minutes
//  on end, and a resonant filter is what makes a sound sharp - it is the peak
//  at the corner, not the harmonics, that an ear calls shrill.
export const LEAD_FILTER_FROM = 6;
export const LEAD_FILTER_TO = 2.2;
export const LEAD_FILTER_Q = 0.9;

//  The air at the front of the note: a short hiss around the note's own pitch,
//  gone before it has properly started. Without it a note simply exists; with
//  it, somebody started it.
export const LEAD_BREATH = 0.3;
export const LEAD_BREATH_DECAY = 0.07;

//  And vibrato, on the notes long enough to want it. A wind player does not
//  vibrato a passing eighth, and one that did would sound seasick - so it only
//  arrives on notes written to be held, and only after they have spoken.
export const LEAD_VIBRATO_HZ = 5.1;
export const LEAD_VIBRATO_CENTS = 13;
export const LEAD_VIBRATO_FROM = 0.12;

/**
 * How much more of the room the tune gets than everything else.
 *
 * A wind instrument is the one voice here that belongs in a space rather than
 * in front of one: it is a held sound, and a held sound with no room around it
 * is a test tone. Everything else in the game is struck and wants to stay dry,
 * so this is extra send on one voice rather than a wetter mix for all of them.
 */
export const LEAD_ROOM = 2.6;

/**
 * The most of a written long note the tune will actually hold, in seconds.
 *
 * The tune has notes written six beats long. Six beats of square wave is a
 * test tone, not a held note, so a long one rings for about this much and is
 * then let go - long enough to read as held, short enough that the phrase
 * underneath it stays audible.
 */
export const LEAD_MAX_RING = 0.75;

//  The backing: an electric piano, which is one sine bending another and
//  nothing else. Quiet and short, because four of these sound at once under the
//  tune and there are eight of them to a bar - anything with a tail on it turns
//  the whole thing to mud, which is exactly what happened the first time.
export const CHORD_ATTACK = 0.004;
export const CHORD_HOLD = 0.03;
export const CHORD_DECAY = 0.13;

//  A whole-number ratio, so what comes out is still the note that went in. The
//  depth collapses in a fortieth of a second: bright at the strike, a plain
//  sine by the time the next eighth arrives. That collapse is the hammer.
/**
 * The bell: the same two oscillators, at a ratio belonging to no scale.
 *
 * A whole-number ratio gives a note; this one gives a struck bar - the partials
 * land between the harmonics rather than on them, which is what an ear files
 * under metal. Longer than anything else here, because a bell that stops when
 * it is struck is a click, and the ring is the whole ornament.
 */
export const PLUCK_ATTACK = 0.002;
export const PLUCK_DECAY = 0.85;
/**
 * A whole number, so every partial lands on a harmonic.
 *
 * It was 2.76 - the ratio a real bell has, and the reason a real bell is never
 * played a melody on. Measured on a single note, the partials sat at 1.76 and
 * 3.76 times the fundamental: between the harmonics, and dissonant against the
 * chords underneath even though the root itself was dead on pitch. That is
 * what an ear calls out of tune. At three, the sidebands fall on the second,
 * fourth and fifth harmonics and the same strike is a plucked string.
 */
export const PLUCK_FM_RATIO = 3;

//  Struck harder and left bright for longer than the electric piano is. The
//  sidebands are the whole ring of a bell: collapse them in a fortieth of a
//  second and what is left is a sine, which is a tone rather than a strike.
export const PLUCK_FM_INDEX = 2.4;
export const PLUCK_FM_FALL = 0.26;

export const CHORD_FM_RATIO = 2;
export const CHORD_FM_INDEX = 2.6;
export const CHORD_FM_FALL = 0.025;

/**
 * The tick a collected orb makes: a struck bar rather than a beep.
 *
 * One sine bending another at a ratio that is deliberately not a whole number,
 * which is what files a sound under 'struck metal' instead of 'note'. Heard
 * hundreds of times a run, so it is kept to two oscillators and a short tail.
 */
export const TICK_ATTACK = 0.003;
export const TICK_DECAY = 0.07;
export const TICK_TAIL = 0.06;
export const TICK_FM_RATIO = 3.7;
export const TICK_FM_INDEX = 1.4;

//  The kit, each built the way the machine that made it famous built it,
//  because those recipes are what an ear recognises as drums.

//  A kick is a pitch falling off a cliff, and that fall *is* the drum. The
//  click on the front is what makes it audible on a phone, where everything
//  below about two hundred hertz simply is not there - without it, a kick on a
//  handset is a gap in the bar rather than a beat in it.
export const KICK_FROM = 180;
export const KICK_TO = 48;
export const KICK_FALL = 0.06;
export const KICK_DECAY = 0.14;
export const KICK_CLICK = 0.3;

//  A snare is two bands at once: a body around two kilohertz, which is the
//  wood and the skin, and a snap much higher and much shorter, which is the
//  wires underneath. One without the other is a box or a hiss.
export const SNARE_BAND = 1900;
export const SNARE_SNAP = 0.22;
export const SNARE_TONE = 210;

//  Short, because the fill that closes a section is four of them on the
//  sixteenths - and at a hundred and fifty that is a tenth of a second apart.
//  Anything longer is not a drum roll, it is one long noise.
export const SNARE_DECAY = 0.09;

/**
 * The hat, which is not noise at all: squares at ratios belonging to no scale.
 *
 * Noise has no pitch and metal has too many at once, so a hat made of noise
 * hisses where a real one rings. The ratios are chosen so no two are a whole
 * number apart - the moment two are, the ear hears a note.
 */
export const HAT_RATIOS = [ 2, 3, 4.16, 5.43, 6.79, 8.21 ];
export const HAT_TOP = 40;

//  Six kilohertz rather than the seven a drum machine would use. Up there a
//  phone speaker is all edge and no body, and eight of these to a bar is the
//  quickest way to a game people play with the sound off.
export const HAT_BAND = 6000;
export const HAT_DECAY = 0.035;

/** Headroom every note is played at, so a busy moment has somewhere to go. */
export const SOUND_GAIN = 0.85;

//  The room. Long and wide - the tail is most of the sound, and a note landing
//  in it is what makes a streak feel like one phrase rather than a row of beeps.
export const REVERB_SECONDS = 0.55;

/** How sharply the tail falls away. Higher is a smaller, deader room. */
export const REVERB_DECAY = 3.5;

/** Silence between the note and its room, in seconds. */
export const REVERB_PREDELAY = 0.005;

//  Less than it was. A big room under single bright notes is atmosphere; the
//  same room under chords that are already holding is a smear, and the two
//  together were most of why the game sounded busy.
export const REVERB_WET = 0.09;
export const REVERB_DRY = 0.95;

//  A short echo, quiet and dark. Water in a space repeats before it blurs -
//  a single reflection is the difference between a room and a cave, and it is
//  what fills the gaps between collects without adding anything to play.
//  A single quiet repeat, an eighth note behind. Any more than this and
//  the cabinet starts to sound like a cathedral.
export const ECHO_SECONDS = 0.234;
export const ECHO_FEEDBACK = 0.12;
export const ECHO_WET = 0.07;
export const ECHO_DAMP = 3000;

/** Seed for the room's noise, so the reverb is identical on every device. */
export const REVERB_SEED = 8317;

//  The music under the run.
//
//  One tempo for the whole game, and it does not follow the road.
//
//  It was derived from each level's own row spacing for a while, so that a
//  collected orb landed on a beat. That is a lovely idea and it is not what
//  this game wants: it put the early levels at sixty beats a minute, and an
//  arcade cabinet does not play at sixty. A soundtrack that keeps its own time
//  is what every game of this kind has always done - none of them ever
//  synchronised the music to the enemies.
//
//  A hundred and fifty because that is what the music was written at. Playing
//  somebody's tune at another tempo is not a tuning decision, it is a different
//  tune - the phrasing of the topline only works at the speed it was phrased.
export const MUSIC_BPM = 150;
export const MUSIC_BEATS_PER_BAR = 4;

/**
 * How loud the backing is against the game's own sounds.
 *
 * Well under them. The tune is there to keep the run company, not to be
 * listened to - and everything that matters to the player is a cue over the
 * top of it.
 */
//  Under the game's own tick even at the loudest point of the run-in. The
//  soundtrack carries the run; it never competes with the thing the player
//  did.
export const MUSIC_GAIN = 0.42;

/**
 * And how loud the level select is, where there is nothing to compete with.
 *
 * Louder than the run, because on that screen the music is the only thing
 * happening - but still well down: it plays while somebody is reading a map of
 * twenty levels, and a menu that insists on being heard is a menu people
 * silence before they ever reach the game.
 */
export const MUSIC_SELECT_GAIN = 0.85;

/**
 * And how loud the tune is within that, against the chords under it.
 *
 * It came down from half when the tune was blown, because a wind instrument
 * holds every note at full for as long as it lasts and that put the melody in
 * front of everything. Plucked it is a strike and a tail, gone before the next
 * chord, so the same number is a much smaller presence - and at a fifth of the
 * mix the bell had simply disappeared under eight chord notes a bar.
 */
export const MENU_TUNE_GAIN = 0.45;

/**
 * The highest the tune is allowed to sit, in semitones over the root.
 *
 * As written it climbs an octave and a half above the verse, which put the
 * chorus up where a phone speaker is at its most piercing. Anything over this
 * drops an octave - the one transposition that leaves a melody inside its own
 * harmony - so the phrase keeps its shape and simply happens lower down.
 */
export const MENU_TUNE_CEILING = 15;


/**
 * How quiet the first note of a jingle is against its last.
 *
 * The written velocities climb by about a fifth. That is a shade on a piano
 * and nothing at all on a phone, so the range is opened out: a phrase that
 * ends a level has one job, which is to arrive, and an ear reads arriving as
 * getting louder towards the last note. Starting this far down is what gives
 * the last note somewhere to get to.
 */
export const JINGLE_FROM = 0.28;

//  And the two voices under the tune, as fractions of it. A section of winds
//  is the same phrase in parallel at different heights - one instrument is a
//  signal, three are an ending.
export const JINGLE_HARMONY = 0.6;
export const JINGLE_UNDER = 0.45;

/**
 * A fourth voice an octave over the tune, and how far in it starts.
 *
 * Growing louder is half of a phrase arriving; the other half is growing
 * *wider*, and an octave above is the widest a phrase can get without anybody
 * hearing a new note in it. It fades in over the second half rather than
 * being there from the start, so the last note is the one that opens out -
 * which is the whole shape of an ending.
 */
export const JINGLE_OVER = 0.5;
export const JINGLE_OPEN_FROM = 0.35;

//  Scheduled a little ahead of the sound card and topped up on a timer, which
//  is the only way to get music in time out of a browser: notes are handed to
//  the audio clock before they are due, so a busy frame cannot delay one.
export const MUSIC_LOOKAHEAD = 1.5;

//  The run-in to the finish.
//
//  For the last stretch of a level the backing changes chord twice as often
//  and puts more notes in each one. Doubling the harmonic rhythm is how music
//  has said "this is the end of it" since long before anybody wrote it down,
//  and it works here for the same reason it works in a song: the player hears
//  something coming before anything on screen has told them.
export const FINALE_SECONDS = 10;

/** Extra volume on the backing by the time the finish arrives. */
export const FINALE_LIFT = 0.35;

/**
 * And how much of the chord is doubled an octave down by then.
 *
 * The other half of the run-in, and the half an ear reads as weight rather
 * than as volume. Approaching the line the same chords acquire a bottom
 * octave, easing in - nothing new is played and nothing gets faster, so it is
 * heard as the music filling out instead of as the music changing.
 */
export const BODY_TOP = 0.3;
export const BODY_INNER = 0.24;
export const MUSIC_TICK_MS = 250;
