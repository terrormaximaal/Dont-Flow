import { LevelSpec } from './level';

//  The game's ten levels, in order.
//
//  Row characters, one per lane:
//    '.'      empty
//    '1'-'5'  an orb of that palette colour
//    'a'-'e'  a barrier of that palette colour
//
//  Three rules every row must keep, all enforced by the tests:
//    - one character per lane, so a two-lane level's rows are two long;
//    - never completely full, so there is always somewhere to dodge to;
//    - never barriers all the way across, which has no way through at all.
//
//  The first two levels are two lanes wide. The road is the same road, so the
//  lanes are half again as wide and there is only one direction to go: the
//  player learns what the colours mean before being asked to choose a lane as
//  well. The third opens the middle lane, and from there the ramp is in the
//  five dials - how fast the track flows, how tightly rows are packed, how many
//  colours are in play, how much a colour moves about, and which barrier kinds
//  are present. Each barrier kind is introduced on its own before being
//  combined with anything else.
//
//  Levels are authored as sequences of movements rather than as a list of
//  similar stretches, and they get longer as they get harder: thirty to forty
//  seconds for the first three, forty to fifty for the next three, fifty to
//  sixty for the three after that. `test/pacing.test.ts` holds every level to
//  its band and guards the ramp - a later level must never be shorter than the
//  one before it.
//
//  Every level opens the same way, and it is not decoration. A run starts at
//  nothing and ends below zero, so the first wrong colour a player touches is
//  fatal - which means the opening cannot be a test of anything. It is the
//  stretch that buys the rest of the level.
//
//  The construction is always this: each lane carries only the colour of the
//  portal it sits behind. Whichever side of the gate the player took, every
//  orb in front of them is theirs, the colour they are not carrying is never in
//  a lane they are standing in, and there is no hazard of any kind. A player
//  who does nothing but hold still comes out of it with three mistakes' worth
//  banked. `test/opening.test.ts` holds all of that.

export const LEVELS: LevelSpec[] = [
    {
        name: '1',
        world: 'sky',
        lanes: 2,
        palette: [ 'red', 'blue' ],
        forwardSpeed: 380,
        rowSpacing: 190,
        //  Authored as a sequence rather than as a list of similar stretches.
        //  Six movements, each with one job, and each one different enough from
        //  its neighbours that the level has a shape you could describe:
        //
        //    1  intro       - nothing to get wrong. Learn what an orb is.
        //    2  the choice  - the gate starts to matter. Both colours, spaced.
        //    3  rhythm      - a pattern to fall into, and the pleasure of it.
        //    4  the break   - the pattern breaks. Same idea, harder to read.
        //    5  the gift    - a rainbow, and a dense run to spend it on.
        //    6  the finale  - everything at once, tighter, and then the line.
        sections: [
            //  1. Intro. The opening every level now has: one colour per lane,
            //  matching the portal in front of it, so the first thing a player
            //  learns is that the colour they took is the colour that pays -
            //  and they learn it while it is impossible to get wrong.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '12', '1.', '.2', '12', '1.', '.2', '12', '12' ]
            },
            //  2. The choice. Same pace, but the colours now alternate faster
            //  than a single gate can serve - so which side of the gate you
            //  took starts to be a decision rather than a formality.
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '.2', '1.', '..', '.1', '2.', '..', '.2', '1.', '2.', '.1' ]
            },
            //  3. Rhythm. A repeating left-right figure, held long enough to
            //  fall into. This is the part that should feel good rather than
            //  test anything.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.', '.1', '1.', '.1', '1.', '.1', '2.', '.2', '2.', '.2' ]
            },
            //  4. The break. The same figure with a beat missing here and
            //  there, so the hands that learned it have to start watching
            //  again. Nothing new is introduced - the difficulty is entirely
            //  in the reading.
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '.1', '2.', '.2', '1.', '.1', '..', '2.', '.2', '1.', '.1' ]
            },
            //  5. The gift. Dense, and generous to both colours at once: every
            //  row offers red on the left or blue on the right, so whichever
            //  side of the gate was taken there is a lane to sit in that pays
            //  on almost every row - and the colour you are not carrying is
            //  always in the *other* lane, so it can never be hit by accident.
            //
            //  A feast rather than a test. Three things were tried and rejected
            //  for it: a rainbow, which belongs to level four once the basics
            //  are taught; a gate with the same colour on both sides, which is
            //  not a gate at all; and rows mixing both colours in one lane,
            //  which is the hardest thing in the game rather than the kindest.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '..', '1.', '.2', '12', '1.', '.2', '12', '.2' ]
            },
            //  6. The finale. Rows packed tighter than anywhere else in the
            //  level and the colours changing on almost every one, ending on a
            //  clean run at the line so it finishes on a good note rather than
            //  on a mistake.
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rowSpacing: 152,
                rows: [ '.2', '1.', '.1', '2.', '.2', '1.', '.1', '2.', '1.', '.2', '2.', '.1' ]
            }
        ]
    },
    {
        name: '2',
        world: 'mountains',
        lanes: 2,
        palette: [ 'red', 'blue' ],
        forwardSpeed: 400,
        rowSpacing: 180,
        //  The same two lanes, with the gaps taken out and the colours changing
        //  sides more often. Still nothing to hit - level two is about reading
        //  speed, not about hazards.
        //
        //    1  pick up    - where level one left off, straight in.
        //    2  the switch - the colour changes side on almost every row.
        //    3  rhythm     - a longer figure than level one's, and a faster one.
        //    4  the squeeze- the same figure with the rows packed tighter.
        //    5  the gift   - a feast, generous to whichever colour is carried.
        //    6  the finale - tightest rows in the level, then the line.
        sections: [
            //  1. Straight in, but still safe. The gate is the other way round
            //  from level one's, so the lane that pays has swapped sides - the
            //  same lesson asked again with the answer moved.
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '21', '2.', '.1', '21', '2.', '.1', '21', '21', '2.', '.1' ]
            },
            //  2. The switch. The colour that pays moves side on nearly every
            //  row, which is the whole skill of this level introduced on its
            //  own before anything is asked on top of it.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1.', '.1', '2.', '.2', '1.', '.1', '2.', '.2', '1.', '.1', '2.', '.2' ]
            },
            //  3. Rhythm. Four beats to the figure rather than level one's two,
            //  so it takes longer to learn and pays better once it is.
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '.2', '.2', '1.', '1.', '.2', '.2', '1.', '1.', '.1', '.1', '2.', '2.' ]
            },
            //  4. The squeeze. The same idea with the rows closer together -
            //  nothing new to read, just less time to read it in.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rowSpacing: 152,
                rows: [ '1.', '.2', '1.', '.2', '2.', '.1', '2.', '.1', '1.', '.2', '1.', '.1' ]
            },
            //  5. The gift. Both colours served at once, each on its own side.
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                rows: [ '..', '.2', '1.', '12', '.2', '1.', '12', '.2', '1.', '12' ]
            },
            //  6. The finale. Tighter than the squeeze, and switching sides on
            //  every row.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rowSpacing: 138,
                rows: [ '1.', '.2', '1.', '.2', '1.', '.2', '2.', '.1', '2.', '.1', '1.', '.2', '1.', '.1' ]
            }
        ]
    },
    {
        name: '3',
        world: 'canyon',
        palette: [ 'orange', 'purple' ],
        forwardSpeed: 420,
        rowSpacing: 172,
        //  The middle lane opens. Same two colours, so the only new thing to
        //  learn is that there are now three places to be.
        //
        //    1  the middle - orbs down the centre, which is the new lane.
        //    2  the edges  - out to the sides, so all three get used.
        //    3  rhythm     - a figure that crosses the whole road.
        //    4  the sweep  - one long crossing, left to right and back.
        //    5  the gift   - a feast down the middle and both shoulders.
        //    6  the finale - the full width, tightly packed, then the line.
        sections: [
            //  1. The opening. Three lanes now, and the split still falls after
            //  the first - so one lane carries the left portal's colour and two
            //  carry the right's, and whichever was taken there is somewhere to
            //  stand that pays every time.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '1..', '.22' ]
            },
            //  2. The edges. Out to the sides and back, so all three lanes are
            //  used before any of them is asked for quickly.
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                rows: [ '2..', '..2', '1..', '..1', '.2.', '2..', '..2', '.1.', '1..', '..1', '.2.', '2..', '..1', '1..', '..1' ]
            },
            //  3. Rhythm. A figure that crosses the whole road and repeats -
            //  three lanes make a longer pattern than two, which is most of
            //  what the extra lane is for.
            {
                splitAfterLane: 1,
                gate: [ 0, 1 ],
                rows: [ '1..', '.1.', '..1', '.1.', '1..', '.1.', '..1', '.1.', '2..', '.2.', '..2', '.2.', '2..', '.2.' ]
            },
            //  4. The sweep. One continuous crossing rather than a repeating
            //  figure: the road asks for a single long movement, which is a
            //  different thing to do with the same controls.
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                rows: [ '2..', '.2.', '..2', '..2', '.2.', '2..', '1..', '.1.', '..1', '..1', '.1.', '1..', '.1.', '..1' ]
            },
            //  5. The gift. Three lanes fed at once - wherever the player is,
            //  something pays, and the colour they are not carrying is never in
            //  the lane they are standing in.
            {
                splitAfterLane: 1,
                gate: [ 0, 1 ],
                rows: [ '...', '1..', '.1.', '..2', '1.2', '.1.', '..2', '1.2', '.1.' ]
            },
            //  6. The finale. Full width, packed tighter than anything before
            //  it, finishing on a clean run at the line.
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                rowSpacing: 146,
                rows: [ '2..', '..1', '.2.', '1..', '..2', '.1.', '2..', '..1', '.2.', '1..', '..2', '.1.', '2..' ]
            }
        ]
    },
    {
        name: '4',
        world: 'forest',
        palette: [ 'green', 'yellow', 'purple' ],
        forwardSpeed: 440,
        rowSpacing: 165,
        //  A third colour, and still nothing to hit. Two colours on a row now,
        //  so a row can be a real choice rather than a yes or no.
        //
        //    1  meet purple - the new colour alone, so it is learned as itself.
        //    2  two on a row- the first real choice: both colours, one lane each.
        //    3  rhythm      - a three-colour figure, longer than any so far.
        //    4  the decoy   - the wrong colour sits where the hand wants to go.
        //    5  the gift    - all three fed at once, none of them a trap.
        //    6  the finale  - three colours, full width, packed tight.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                rows: [ '133', '1..', '.33', '133', '1..', '.33', '133', '133', '1..', '.33', '133', '133' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 1 ],
                rows: [ '1.3', '3.1', '.1.', '1.3', '3.1', '.3.', '1.3', '3.1', '.1.', '3.1', '1.3', '.3.', '1.3', '3.1', '.1.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                rows: [ '1..', '.2.', '..3', '.2.', '1..', '.2.', '..3', '.2.', '1..', '.2.', '..3', '.2.', '1..', '.2.', '..3', '.2.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                rows: [ '1.2', '.3.', '2.1', '.1.', '3.2', '.2.', '1.3', '.1.', '2.3', '.3.', '1.2', '.2.', '3.1', '.1.', '2.3', '.2.', '1.3', '.3.', '2.1', '.1.', '3.2', '.2.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 1 ],
                rows: [ '...', '1..', '.2.', '..3', '123', '1..', '.2.', '..3', '123', '1..', '.2.', '..3', '123', '.2.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                rowSpacing: 142,
                rows: [ '1..', '.3.', '..2', '3..', '.1.', '..3', '2..', '.2.', '..1', '1..', '.3.', '..2', '3..', '.1.', '..3', '2..', '.2.', '..1', '3..', '.2.', '..3', '1..', '.1.', '..2' ]
            }
        ]
    },
    {
        name: '5',
        world: 'ice',
        palette: [ 'cyan', 'blue', 'pink' ],
        forwardSpeed: 460,
        rowSpacing: 158,
        //  The first barriers. Static, one at a time, and always with two lanes
        //  open beside them - a barrier in your own colour is passed straight
        //  through, which is the whole reason to notice what colour you are.
        //
        //    1  clean       - no barriers at all, so the level starts familiar.
        //    2  the first   - one barrier, alone, with room either side of it.
        //    3  the pass    - a barrier in your own colour. Straight through.
        //    4  rhythm      - barriers on a beat, orbs between them.
        //    5  the gift    - no barriers again, and a feast. A breath.
        //    6  the finale  - barriers and orbs together, packed tight.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '1..', '.22', '122', '122' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'static',
                rows: [ '...', '.1.', '...', 'a..', '..2', '.3.', 'a..', '.1.', '..3', 'a..', '.2.', '..1', 'a..', '.3.', '..2' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '.2.', 'c..', '..1', 'c..', '.3.', 'c..', '..2', 'c..', '.1.', 'c..', '..3', 'c..', '.2.', '..1', 'c..', '.3.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ 'a..', '.1.', '..b', '.2.', 'a..', '.3.', '..b', '.1.', 'a..', '.2.', '..b', '.3.', 'a..', '.1.', '..b', '.2.', 'c..', '.3.', '..a', '.1.', 'b..', '.2.', '..c', '.3.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 1 ],
                rows: [ '...', '1..', '.2.', '..3', '1.3', '.2.', '1..', '..3', '.2.', '1.3', '..1', '.3.', '2..', '.2.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                obstacles: 'slider',
                //  6. The sweep. The first wall in the game that moves, and it
                //  arrives here rather than two levels later because a moving
                //  blocker is what the middle of the game is for: the answer is
                //  still "be somewhere else", but where else is no longer
                //  standing still while you decide.
                //
                //  One slider to a row, never two. Every slider runs off the
                //  same clock and so sways the same way at the same moment,
                //  which means a pair does not leave a moving gap between them -
                //  it leaves one that closes.
                rows: [ '.2.', '..1', 'a..', '.3.', '..2', '..c', '.1.', '..3', 'a..', '.2.', '..1', '..c', '.3.', '..2', 'a..', '.1.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rowSpacing: 136,
                //  7. The finale. Everything the level taught, packed tighter
                //  than any of it was taught at.
                rows: [ 'a.1', '.2.', 'b..', '..3', '.a.', '1..', '..b', '.3.', 'c..', '.1.', '..2', 'a..', '.3.', '..1', '.b.', '2..', '..3', '.1.', 'a..', '..2' ]
            }
        ]
    },
    {
        name: '6',
        world: 'desert',
        palette: [ 'yellow', 'orange', 'blue' ],
        forwardSpeed: 480,
        rowSpacing: 152,
        //  Static barriers, now regularly, and orbs tucked in beside them.
        //
        //  And the first barrier that moves without going anywhere. A pulsing
        //  wall never reaches the lane next door, so what it costs is nerve
        //  rather than room - which makes it the gentlest timing question the
        //  game has, and the right one for the level where a player is learning
        //  to control the road rather than to survive it.
        //
        //    1  settle      - the safe opening every level has.
        //    2  the breath  - a wall that swells and shrinks, alone.
        //    3  walls       - the static ones, on a beat.
        //    4  which is it - both kinds together for the first time.
        //    5  the gift    - nothing to hit. A breath of the other sort.
        //    6  pairs       - two walls a row leaving one lane, not two.
        //    7  the finale  - everything, packed tighter than it was taught at.
        sections: [
            //  1. Settle. The safe opening, and this level needs it more than
            //  most: the jump arrives a movement later, and meeting a wall you
            //  cannot steer round with nothing banked is not a lesson.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '1..', '.22', '122', '122' ]
            },
            //  2. The breath. A pulsing wall, alone, with the road open either
            //  side of it. It never reaches the next lane along, so a player
            //  who simply moves over is safe - the question it asks is whether
            //  they trust that, which is the whole of what a timing hazard is
            //  before anything is asked on top of it.
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                obstacles: 'pulse',
                rows: [ '.2.', '..2', 'a..', '.2.', '..1', 'a..', '.1.', '..2', 'c..', '.2.', '..1', 'c..', '.1.', '..2', 'a..', '.2.', '..1', 'c..' ]
            },
            //  3. Walls. The static ones the last level ended on, on a beat, so
            //  the two kinds are met one at a time before they are met
            //  together.
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'static',
                rows: [ '.3.', '..3', '...', '...', '...', '.2.', '3..', '..3', '...', '...', '...', '.3.', '2..', '..2', '...', '...', '...', '.3.' ]
            },
            //  4. Which is it. A wall that holds still and one that breathes
            //  look alike at a distance and want different amounts of nerve.
            //  Alternated here so the two have to be told apart rather than
            //  answered the same way.
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '..3', '.a.', '1..', '...', '..1', 'c..', '.3.', '.*.', '...', '1..', '.1.', '..c', '3..', '...', '.a.', '..3', '1..', '.c.', '...', '..1', '.3.', 'a..' ]
            },
            //  5. The gift. No barriers of any kind, and every row paying.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                rows: [ '...', '1..', '.2.', '..3', '1.3', '.2.', '..3', '1.3', '.2.', '1..', '..3', '.2.', '1.3', '.2.', '..3' ]
            },
            //  6. Pairs. Two walls on a row leaves one lane rather than two, so
            //  the sideways answer stops being a choice and starts being a
            //  place you have to be.
            {
                splitAfterLane: 1,
                gate: [ 1, 0 ],
                obstacles: 'static',
                rows: [ '.2.', 'a.a', '..1', 'b.b', '.3.', '...', '1..', 'c.c', '..2', 'a.a', '...', '.1.', 'b.b', '..3', 'c.c', '...', '.2.', '..1' ]
            },
            //  7. The finale. Walls and pairs at the level's tightest spacing,
            //  finishing on a clean run at the line.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rowSpacing: 136,
                rows: [ 'a.1', '.2.', 'b..', '..3', '.a.', '...', '1..', '..b', '.3.', 'c..', '...', '.1.', '..2', 'a..', '.3.', '...', '..1', '.b.', '2..', '..3', '...', '.1.', '..2', 'c..', '.3.' ]
            }
        ]
    },
    {
        name: '7',
        world: 'storm',
        palette: [ 'blue', 'red', 'green', 'yellow' ],
        forwardSpeed: 505,
        rowSpacing: 147,
        //  Where the jump is taught, and the first level that asks for
        //  pressure rather than control.
        //
        //  A hurdle spans the whole road, so there is no lane to steer into and
        //  the only way through is over - which is the lesson, and it is taught
        //  by a wall the player cannot misread rather than by a line of text.
        //  It arrives here rather than a level earlier because jumping is a
        //  second verb, and a player still learning where the lanes are does not
        //  need one.
        //
        //    1  the opening  - four colours, clean road.
        //    2  the slider   - a moving wall, at this level's pace.
        //    3  the read     - sliders with orbs beside them.
        //    4  the hurdle   - a wall across the whole road. The jump, alone.
        //    5  over the sweep - a sliding hurdle. Dodge it, or go over it.
        //    6  the gift     - no barriers, and a feast. A breath.
        //    7  the squeeze  - full-width hurdles among walls.
        //    8  the finale   - sliding hurdles at the tightest spacing.
        //
        //  Hurdle rows are spaced deliberately: a jump covers a fixed length of
        //  road, so two full-width rows are either close enough to take in one
        //  arc or far enough apart to land and go again. The band between those
        //  two is unclearable, and `test/hurdles.test.ts` keeps every level out
        //  of it.
        sections: [
            //  1. The opening. A fourth colour arrives and nothing is in the
            //  way, because two new things at once is a spike rather than a
            //  lesson.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '1..', '.22', '122', '122' ]
            },
            //  2. The slider. Alone, and slowly: a wall that moves is read
            //  differently from one that does not, and the difference is the
            //  whole level.
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'slider',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '.*.', 'a..', '.3.', '..2', 'd..', '.3.', '..2', 'a..', '.3.', '..2', 'd..', '.3.' ]
            },
            //  3. The read. Orbs beside the sliders now, so leaving early costs
            //  something and the movement has to actually be timed rather than
            //  waited out at the far edge of the road.
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'slider',
                rows: [ '..3', '.4.', 'b..', '3.4', '.3.', '..b', '4..', '.4.', 'a..', '..3', '.b.', '4..', '3.4', '.3.', 'b..', '..4', '.a.', '3..', '..4' ]
            },
            //  4. The hurdle. A clear run at each one, with the road empty
            //  either side, so the first thing a player ever does with the jump
            //  is a jump they cannot get wrong. Then orbs beside the later ones,
            //  so it becomes worth timing rather than merely surviving.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'static',
                rows: [ '...', '.2.', '...', 'AAA', '...', '.1.', '...', '2.2', 'AAA', '...', '.1.', '...', '2.2', 'AAA', '...', '.4.', '...', '.2.', '...', 'AAA' ]
            },
            //  5. Over the sweep. A hurdle that slides: the first hazard with
            //  two right answers at once, because it can be dodged like a
            //  slider or cleared like a hurdle, and which is easier depends on
            //  where it happens to be when it arrives.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'slider',
                rows: [ '.3.', 'A..', '..1', '.3.', '..A', '1..', '.C.', '..3', '1..', '.1.', 'A..', '..3', '.C.', '1..', '..1', '.3.', 'C..', '..3', '.1.' ]
            },
            //  6. The gift.
            {
                splitAfterLane: 1,
                gate: [ 1, 3 ],
                rows: [ '...', '2..', '.4.', '..1', '2.1', '.4.', '.*.', '..1', '2.4', '.1.', '..4', '2..', '.4.', '2.1', '..4', '.1.', '2..', '..4', '.2.' ]
            },
            //  7. The squeeze. Full-width hurdles again, but now with walls
            //  between them - so the road asks for a lane and then takes the
            //  choice away, one after the other, with no quiet rows to reset in.
            {
                splitAfterLane: 1,
                gate: [ 3, 1 ],
                obstacles: 'static',
                rows: [ '4..', '..2', '.b.', '4..', 'BBB', '..4', 'c..', '.2.', '..2', 'BBB', '4..', '.c.', '..4', '2..', 'DDD', '.4.', '..2', 'b..', '.2.', 'DDD' ]
            },
            //  8. The finale. Sliding hurdles at the tightest spacing in the
            //  level, and a clean run at the line.
            {
                splitAfterLane: 0,
                gate: [ 2, 0 ],
                obstacles: 'slider',
                rowSpacing: 134,
                rows: [ '1..', '..4', '.c.', '2..', 'AAA', '..1', 'd..', '.4.', '..2', 'AAA', '1..', '.d.', '..4', '2..', 'CCC', '.1.', '..4', 'c..', '.2.', 'CCC', '..1', '.4.', '2..', '..1' ]
            }
        ]
    },
    {
        name: '8',
        world: 'city',
        palette: [ 'cyan', 'magenta', 'yellow', 'green' ],
        forwardSpeed: 530,
        rowSpacing: 142,
        //  Pulsing barriers, again alone before they are mixed. They never
        //  reach the next lane along, so what they cost is nerve, not room.
        //
        //  The first level built past a minute, and so the first one that has
        //  to earn the length rather than just have it: ten movements, no two
        //  of them asking the same question twice in a row.
        //
        //     1  the opening      - four colours, clean road.
        //     2  the hole         - a hazard colour cannot answer.
        //     3  the pulse        - a wall that breathes. Nerve, not room.
        //     4  breathing room   - pulses with orbs beside them.
        //     5  the crossing     - one long sweep, walls setting the line.
        //     6  the gift         - nothing to hit. A breath.
        //     7  holes and walls  - steer for one, jump the other.
        //     8  the drum         - full-width holes on a beat.
        //     9  pulse and pair   - two breathing walls, one lane between.
        //    10  the finale       - everything, at the level's tightest spacing.
        sections: [
            //  1. The opening. A level this long can afford to start quietly,
            //  and needs to: everything after this is a hazard.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '1..', '.22', '122', '122' ]
            },
            //  2. The hole, introduced the way the hurdle was: one at a time,
            //  in a lane you can simply not be in, before any of them asks to
            //  be jumped. The row that spans the road is the one that does, and
            //  by then the player has seen three and knows what they are.
            //  Colour is no help here and never will be, which is the whole
            //  reason this hazard exists.
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                rows: [ '.2.', '0..', '..3', '.0.', '2..', '..0', '.3.', '000', '..2', '.3.', '00.', '..2', '.0.', '3..', '000', '.2.', '..3', '0..', '.3.' ]
            },
            //  3. The pulse. A wall that breathes never reaches the lane next
            //  door, so it takes nothing away except the nerve to stay put.
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'pulse',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '..3', 'a..', '.3.' ]
            },
            //  4. Breathing room. Orbs beside the pulses, so sitting at the far
            //  edge of the road until it passes costs something.
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'pulse',
                rows: [ '..3', '.4.', 'b..', '3.4', '.3.', '..b', '4..', '.4.', 'a..', '..3', '.b.', '4..', '3.4', '.3.', 'b..', '..4', '.a.', '3..' ]
            },
            //  5. The crossing. One continuous movement across the road rather
            //  than a figure that repeats, with walls placed to set the line
            //  rather than to be dodged individually.
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '..3', '.3.', '1..', 'b..', '.1.', '..3', '..b', '.3.', '1..', 'd..', '.1.', '..1', '.d.', '3..', '..3', 'b..', '.3.', '..1', '.b.' ]
            },
            //  6. The gift.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                rows: [ '...', '4..', '.1.', '..3', '4.3', '.1.', '.*.', '..3', '4.1', '.3.', '..1', '4..', '.3.', '4.1', '..3', '.1.', '4..', '..1' ]
            },
            //  7. Holes and walls. The two hazards that look nothing alike and
            //  want opposite answers - a wall is a lane to leave, a hole is a
            //  lane to leave the ground in - taken alternately so neither can
            //  be answered on reflex.
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1..', '..3', '.b.', '0..', '..1', 'd..', '.0.', '..3', '1..', '.d.', '..0', '3..', '.1.', 'b..', '..0', '.3.', '0..', '..1' ]
            },
            //  8. The drum. Full-width holes on a beat, evenly enough that the
            //  jumps become a rhythm rather than four separate reactions.
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '.3.', '..1', '000', '.3.', '1..', '..3', '.1.', '000', '..3', '1..', '.3.', '..1', '000', '.1.', '3..', '..3', '.1.', '000', '..1' ]
            },
            //  9. Pulse and pair. Two breathing walls on a row, so the lane
            //  between them is the only one there is and it keeps narrowing.
            {
                splitAfterLane: 1,
                gate: [ 1, 3 ],
                obstacles: 'pulse',
                rows: [ '.2.', 'a.a', '..4', '.2.', 'd.d', '..2', '.4.', 'b.b', '2..', '..4', 'a.a', '.2.', '..4', 'd.d', '.4.', '2..', 'b.b', '..2' ]
            },
            //  10. The finale.
            {
                splitAfterLane: 0,
                gate: [ 3, 1 ],
                obstacles: 'static',
                rowSpacing: 128,
                rows: [ '4..', '..2', '.b.', '4..', '000', '..4', 'd..', '.2.', '..2', 'b..', '000', '4..', '.d.', '..4', '2..', '.b.', '000', '.4.', '..2', 'd..', '.2.', '..4' ]
            }
        ]
    },
    {
        name: '9',
        world: 'space',
        palette: [ 'magenta', 'cyan', 'orange', 'green' ],
        forwardSpeed: 560,
        rowSpacing: 138,
        //  Everything met so far, in the same level but still a kind to a
        //  section, so each stretch reads as one idea.
        //
        //     1  the opening  - clean road, four colours.
        //     2  the run      - the same, a third again as fast.
        //     3  the sliders  - moving walls, on their own.
        //     4  the pulses   - breathing walls, on their own.
        //     5  the walls    - statics in pairs. One lane, not two.
        //     6  the hurdles  - full-width, on a beat. The jump, on a clock.
        //     7  the gift     - a breath, and a rainbow.
        //     8  the sweep    - a wall that moves into the crossing.
        //     9  holes and hurdles - both answered by leaving the ground.
        //    10  the switch   - a gate that changes its mind. Clean road.
        //    11  the gauntlet - pulses in pairs, no quiet rows.
        //    12  the finale   - all of it, at the level's tightest spacing.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '1..', '.22', '122', '122' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 1, 0 ],
                //  A run. Nothing in the way but the colour question, taken at
                //  a third again the pace - a level needs somewhere it opens
                //  up, or the whole of it reads at one tempo however varied the
                //  obstacles are. Clean road on purpose: speed is the thing
                //  being asked about here, and asking two things at once would
                //  make it a difficulty spike rather than a change of gear.
                speed: 1.34,
                rows: [ '.1.', '..2', '.2.', '1..', '.1.', '..1', '.2.', '2..', '.1.', '..2', '.2.', '1..', '.4.', '..1' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'slider',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.3.', '..2' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'pulse',
                rows: [ '..3', '.4.', 'b..', '3.4', '.3.', '..b', '4..', '.4.', 'c..', '..3', '.b.', '4..', '3.4', '.3.' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'static',
                rows: [ '4..', '..1', '.b.', '4..', '..4', 'b.b', '.1.', '..4', 'c.c', '1..', '..1', 'b..', '.4.', '..1' ]
            },
            //  6. The hurdles, evenly spaced for the first time in the game.
            //  Level six taught that the jump exists; this asks for it on a
            //  clock, which is a different thing to be good at.
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1..', '..3', '.1.', 'AAA', '..1', '3..', '.3.', '..1', 'CCC', '1..', '.3.', '..3', '1..', 'AAA', '.1.', '..3', '3..', '..1', 'CCC', '.3.', '1..', '..3' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 1 ],
                rows: [ '...', '3..', '.2.', '..4', '3.4', '.2.', '.*.', '..4', '3.2', '.4.', '..2', '3..', '.4.', '3.2' ]
            },
            //  8. The sweep. Sliders alternating sides with the orbs placed
            //  across from them, so the road asks for a crossing that the wall
            //  is already moving into.
            //
            //  One slider to a row, never two. Every slider in the game runs
            //  off the same clock and so sways the same way at the same moment,
            //  which means a pair does not leave a moving gap between them - it
            //  leaves a gap that closes completely at the far end of the sway.
            //  `test/barrier.test.ts` holds every level to that.
            {
                splitAfterLane: 1,
                gate: [ 3, 1 ],
                obstacles: 'slider',
                rows: [ '4..', '..2', 'a..', '.4.', '..4', '..d', '2..', '.2.', 'a..', '..4', '.4.', '..b', '2..', '..2', 'a..' ]
            },
            //  9. The two hazards colour cannot answer, alternating - a hole
            //  and a hurdle want the same input and look nothing alike, so this
            //  is the one stretch in the game where reading is easy and timing
            //  is everything.
            {
                splitAfterLane: 1,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rows: [ '.2.', '..4', '000', '.2.', '4..', '..2', '.4.', 'BBB', '..2', '4..', '.2.', '..4', '000', '.4.', '2..', '..2', '.4.', 'BBB', '..4', '.2.', '4..', '..2' ]
            },
            //  10. The switch. The one hazard in the game that is not on the
            //  road: the gate itself changes its mind on the way in, so a lane
            //  taken early stops being a lane taken.
            //
            //  Introduced the way every other kind was - alone, with nothing
            //  else to read. The road behind it is clean on purpose: the only
            //  question in this stretch is which colour you are actually
            //  carrying, and anything else here would make it a spike rather
            //  than a lesson.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                gateSwap: true,
                rows: [ '.2.', '..3', '2..', '.3.', '..2', '3..', '.2.', '..3', '2..', '.3.', '..2', '3..', '.2.', '..3', '2..' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 0, 3 ],
                obstacles: 'pulse',
                rows: [ '1..', '..4', 'a.a', '.1.', '..1', 'd.d', '4..', '.4.', 'a.a', '..1', '.1.', 'd.d', '4..', '..4', 'a.a' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rowSpacing: 124,
                rows: [ '3..', '..1', '.c.', '3..', '..3', '000', 'b..', '.1.', '..1', 'c..', '.3.', 'AAA', '..3', 'b..', '.1.', '..1', 'c..', '000', '.3.', '..1', 'b..', '.1.', '..3', '.3.' ]
            }
        ]
    },
    {
        name: '10',
        world: 'void',
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ],
        forwardSpeed: 590,
        rowSpacing: 134,
        //  Five colours and every kind of barrier. Nothing new is introduced
        //  here - it is the exam, not the lesson.
        //
        //  Twelve movements, one mechanic each, in the order they were taught.
        //  The length is the point: by this stage a player can answer any one
        //  of these, and what is left to ask is whether they can answer all of
        //  them for a minute and a half without the concentration going.
        //
        //     1  the opening        - five colours, clean road.
        //     2  the sliders
        //     3  the pulses
        //     4  the walls          - in pairs.
        //     5  the hurdles        - full width, on a beat.
        //     6  the holes          - full width, on a beat.
        //     7  the gift           - the last breath in the game.
        //     8  the sweep          - a wall that moves into the crossing.
        //     9  pulses and holes   - the two that share no answer.
        //    10  the run home       - clean road, and faster.
        //    11  the gauntlet       - every static hazard at once.
        //    12  the finale         - all of it, tightest spacing in the game.
        sections: [
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '1..', '.22', '122', '122' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 2 ],
                obstacles: 'slider',
                rows: [ '.2.', '..3', 'a..', '.3.', '..2', 'd..', '.2.', '..3', 'a..', '.3.', '..2', 'e..', '.3.', '..2', 'a..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 3 ],
                obstacles: 'pulse',
                rows: [ '..3', '.4.', 'b..', '3.4', '.3.', '..b', '4..', '.4.', 'c..', '..3', '.b.', '4..', '3.4', '.3.', 'b..' ]
            },
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'static',
                rows: [ '4..', '..5', '.c.', '4..', '..4', 'b.b', '.5.', '..4', 'c.c', '5..', '..5', 'b..', '.4.', '..5', 'd.d' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 4, 0 ],
                obstacles: 'static',
                rows: [ '5..', '..1', '.5.', 'AAA', '..5', '1..', '.1.', '..5', 'EEE', '5..', '.1.', '..1', '5..', 'AAA', '.5.', '..1', '1..', '..5', 'CCC', '.1.', '5..', '..1', '.5.', 'AAA', '..5', '.1.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '.3.', '..1', '000', '.3.', '1..', '..3', '.1.', '000', '..3', '1..', '.3.', '..1', '000', '.1.', '3..', '..3', '.1.', '000', '..1', '.3.', '1..', '..3', '000', '.3.', '..1', '1..' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 1 ],
                rows: [ '...', '3..', '.2.', '..4', '3.4', '.2.', '.*.', '..4', '3.2', '.4.', '..2', '3..', '.4.', '3.2', '..4', '.2.' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 1, 3 ],
                obstacles: 'slider',
                //  One slider to a row - see level nine's eighth movement for
                //  why a pair of them is not a narrow gap but a closed one.
                rows: [ '4..', '..2', 'a..', '.4.', '..4', 'd..', '2..', '.2.', '..a', '..4', '.4.', 'b..', '2..', '..2', 'e..', '.4.', '..4' ]
            },
            //  9. The two hazards that share no answer at all: a breathing wall
            //  is a lane to leave, a hole is a lane to leave the ground in, and
            //  neither one helps with the other.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'pulse',
                rows: [ '4..', '..1', '.b.', '0..', '..4', 'd..', '.0.', '..1', '4..', '.d.', '..0', '1..', '.4.', 'b..', '..0', '.1.', '0..' ]
            },
            //  10. The run home. The level opens up one last time before the
            //  two hardest stretches in the game, so the ending has somewhere
            //  to climb from.
            {
                splitAfterLane: 0,
                gate: [ 0, 4 ],
                speed: 1.28,
                rows: [ '.1.', '..5', '.5.', '1..', '.1.', '..1', '.5.', '5..', '.1.', '..5', '.5.', '1..', '.5.', '..1', '.1.', '5..', '.5.' ]
            },
            //  The one place in the game the switch is asked for on top of
            //  something else. It is the exam, and by here it has been met on
            //  its own a whole level ago.
            {
                splitAfterLane: 1,
                gate: [ 4, 2 ],
                gateSwap: true,
                obstacles: 'static',
                rows: [ '5..', '..3', '.c.', '5..', '000', '..5', 'e..', '.3.', 'c.c', 'EEE', '..5', '3..', '.e.', '..3', '000', '5..', '.5.', 'c.c', '..3', 'CCC', '.5.', 'e..', '..5', '.3.', '000', '..5' ]
            },
            {
                splitAfterLane: 1,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rowSpacing: 118,
                rows: [ '3..', '..1', '.c.', '3..', '000', '..3', 'b..', '.1.', 'c.c', '..1', 'AAA', '3..', '.b.', '..3', 'e.e', '.1.', '000', '..3', 'c..', '.1.', 'b.b', '..1', 'CCC', '.3.', '1..', '..3', '.1.', '..1' ]
            }
        ]
    },
    {
        name: '11',
        world: 'sky',
        variant: 'night',
        palette: [ 'cyan', 'magenta', 'yellow', 'purple', 'blue' ],
        forwardSpeed: 610,
        rowSpacing: 131,
        //  Advanced movement. The clouds after dark, and the first level that
        //  asks for two things at once: a lane and a jump.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22' ]
            },
            //  2. The sweep.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                rows: [ '1..', '.2.', '..3', '..3', '.2.', '1..', '1..', '.2.', '..3', '..3', '.2.', '1..', '1..', '.2.', '..3', '..3', '.2.', '1..', '1..', '.2.', '..3' ]
            },
            //  3. Walls.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'static',
                rows: [ '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4' ]
            },
            //  4. The beat.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'static',
                rows: [ '.4.', '..1', '4..', 'AAA', '..4', '...', '.4.', '..1', '4..', 'AAA', '..4', '...', '.4.', '..1', '4..', 'AAA', '..4', '...', '.4.', '..1', '4..', 'AAA' ]
            },
            //  5. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'slider',
                rows: [ '.1.', '..3', 'a..', '.3.', '..1', '..d', '.1.', '..3', 'a..', '.3.', '..1', '..d', '.1.', '..3', 'a..', '.3.', '..1', '..d', '.1.', '..3', 'a..' ]
            },
            //  6. The gift.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                rows: [ '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.' ]
            },
            //  7. Jump and choose.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rows: [ '5..', '..5', '.b.', '5..', 'CCC', '..5', '5..', '..5', '.b.', '5..', 'CCC', '..5', '5..', '..5', '.b.', '5..', 'CCC', '..5', '5..', '..5', '.b.', '5..' ]
            },
            //  8. The run.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                speed: 1.25,
                rows: [ '.2.', '..4', '.4.', '2..', '.2.', '..2', '.2.', '..4', '.4.', '2..', '.2.', '..2', '.2.', '..4', '.4.', '2..', '.2.', '..2', '.2.', '..4', '.4.' ]
            },
            //  9. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 3, 2 ],
                obstacles: 'static',
                rows: [ '.4.', 'a.a', '..4', 'e.e', '4..', '.4.', '.4.', 'a.a', '..4', 'e.e', '4..', '.4.', '.4.', 'a.a', '..4', 'e.e', '4..', '.4.', '.4.', 'a.a', '..4' ]
            },
            //  10. The drum.
            {
                splitAfterLane: 0,
                gate: [ 2, 0 ],
                obstacles: 'static',
                rows: [ '.3.', '..1', '3..', 'BBB', '..3', '...', '.3.', '..1', '3..', 'BBB', '..3', '...', '.3.', '..1', '3..', 'BBB', '..3', '...', '.3.', '..1', '3..', 'BBB' ]
            },
            //  11. Pressure.
            {
                splitAfterLane: 0,
                gate: [ 0, 4 ],
                obstacles: 'pulse',
                rows: [ '.1.', 'c..', '..5', '.1.', '..e', '5..', '.1.', 'c..', '..5', '.1.', '..e', '5..', '.1.', 'c..', '..5', '.1.', '..e', '5..', '.1.', 'c..', '..5' ]
            },
            //  12. The finale.
            {
                splitAfterLane: 0,
                gate: [ 4, 2 ],
                obstacles: 'static',
                rowSpacing: 118,
                rows: [ '5..', '..3', '.a.', '5..', 'AAA', '..3', '.5.', '5..', '..3', '.a.', 'AAA', 'c.c', '..3', '.5.', '5..', '..3', 'AAA', '5..', 'c.c', '..3', '.5.', '5..', 'AAA' ]
            }
        ]
    },
    {
        name: '12',
        world: 'mountains',
        variant: 'night',
        palette: [ 'blue', 'orange', 'cyan', 'purple', 'yellow' ],
        forwardSpeed: 630,
        rowSpacing: 128,
        //  The pass at night. Obstacles arrive straight out of the gates rather
        //  than after a settling stretch.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122' ]
            },
            //  2. Straight in.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                obstacles: 'static',
                rows: [ '.2.', 'b..', '..3', '.2.', '..d', '3..', '.2.', 'b..', '..3', '.2.', '..d', '3..', '.2.', 'b..', '..3', '.2.', '..d', '3..', '.2.', 'b..', '..3', '.2.', '..d', '3..' ]
            },
            //  3. The sweep.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                rows: [ '3..', '.4.', '..1', '..1', '.4.', '3..', '3..', '.4.', '..1', '..1', '.4.', '3..', '3..', '.4.', '..1', '..1', '.4.', '3..', '3..', '.4.', '..1', '..1', '.4.', '3..' ]
            },
            //  4. The beat.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'static',
                rows: [ '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.' ]
            },
            //  5. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'slider',
                rows: [ '.5.', '..1', 'a..', '.1.', '..5', '..e', '.5.', '..1', 'a..', '.1.', '..5', '..e', '.5.', '..1', 'a..', '.1.', '..5', '..e', '.5.', '..1', 'a..', '.1.', '..5', '..e' ]
            },
            //  6. The gift.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                rows: [ '1..', '.3.', '..5', '1.5', '.3.', '1.5', '1..', '.3.', '..5', '1.5', '.3.', '1.5', '1..', '.3.', '..5', '1.5', '.3.', '1.5', '1..', '.3.', '..5', '1.5' ]
            },
            //  7. Holes.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'static',
                rows: [ '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.' ]
            },
            //  8. The run.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                speed: 1.28,
                rows: [ '.5.', '..2', '.2.', '5..', '.5.', '..5', '.5.', '..2', '.2.', '5..', '.5.', '..5', '.5.', '..2', '.2.', '5..', '.5.', '..5', '.5.', '..2', '.2.', '5..', '.5.', '..5' ]
            },
            //  9. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rows: [ '.2.', 'b.b', '..2', 'd.d', '2..', '.2.', '.2.', 'b.b', '..2', 'd.d', '2..', '.2.', '.2.', 'b.b', '..2', 'd.d', '2..', '.2.', '.2.', 'b.b', '..2', 'd.d', '2..', '.2.' ]
            },
            //  10. Breathing.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'pulse',
                rows: [ '.4.', 'c..', '..1', '.4.', '..e', '1..', '.4.', 'c..', '..1', '.4.', '..e', '1..', '.4.', 'c..', '..1', '.4.', '..e', '1..', '.4.', 'c..', '..1', '.4.', '..e', '1..' ]
            },
            //  11. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '1..', '..1', '.a.', '1..', 'DDD', '..1', '1..', '..1', '.a.', '1..', 'DDD', '..1', '1..', '..1', '.a.', '1..', 'DDD', '..1', '1..', '..1', '.a.', '1..', 'DDD', '..1', '1..', '..1' ]
            },
            //  12. The finale.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'static',
                rowSpacing: 116,
                rows: [ '3..', '..5', '.b.', '3..', 'BBB', '..5', '.3.', '3..', '..5', '.b.', 'BBB', 'd.d', '..5', '.3.', '3..', '..5', 'BBB', '3..', 'd.d', '..5', '.3.', '3..', 'BBB', '.b.', '3..', 'd.d' ]
            }
        ]
    },
    {
        name: '13',
        world: 'canyon',
        variant: 'night',
        palette: [ 'orange', 'purple', 'cyan', 'green', 'blue' ],
        forwardSpeed: 650,
        rowSpacing: 125,
        //  Deception begins. The gate changes its mind twice in this level, and
        //  after the first one nothing on the road can be taken on trust.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..' ]
            },
            //  2. The read.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                rows: [ '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.' ]
            },
            //  3. The switch.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                gateSwap: true,
                rows: [ '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4' ]
            },
            //  4. Walls.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'static',
                rows: [ '.4.', 'a..', '..5', '.4.', '..d', '5..', '.4.', 'a..', '..5', '.4.', '..d', '5..', '.4.', 'a..', '..5', '.4.', '..d', '5..', '.4.', 'a..', '..5', '.4.', '..d', '5..', '.4.', 'a..' ]
            },
            //  5. The beat.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'static',
                rows: [ '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..' ]
            },
            //  6. The gift.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '1..', '.2.', '..3', '1.3', '.2.', '1.3', '1..', '.2.', '..3', '1.3', '.2.', '1.3', '1..', '.2.', '..3', '1.3', '.2.', '1.3', '1..', '.2.', '..3', '1.3', '.2.', '1.3' ]
            },
            //  7. The second switch.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                gateSwap: true,
                obstacles: 'static',
                rows: [ '.2.', 'c..', '..4', '.2.', '..e', '4..', '.2.', 'c..', '..4', '.2.', '..e', '4..', '.2.', 'c..', '..4', '.2.', '..e', '4..', '.2.', 'c..', '..4', '.2.', '..e', '4..', '.2.', 'c..' ]
            },
            //  8. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'slider',
                rows: [ '.4.', '..1', 'b..', '.1.', '..4', '..d', '.4.', '..1', 'b..', '.1.', '..4', '..d', '.4.', '..1', 'b..', '.1.', '..4', '..d', '.4.', '..1', 'b..', '.1.', '..4', '..d', '.4.', '..1' ]
            },
            //  9. Holes.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '.1.', '..3', '1..', '000', '..1', '...', '.1.', '..3', '1..', '000', '..1', '...', '.1.', '..3', '1..', '000', '..1', '...', '.1.', '..3', '1..', '000', '..1', '...', '.1.', '..3', '1..' ]
            },
            //  10. The run.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                speed: 1.3,
                rows: [ '.3.', '..5', '.5.', '3..', '.3.', '..3', '.3.', '..5', '.5.', '3..', '.3.', '..3', '.3.', '..5', '.5.', '3..', '.3.', '..3', '.3.', '..5', '.5.', '3..', '.3.', '..3', '.3.', '..5' ]
            },
            //  11. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'pulse',
                rows: [ '5..', '..5', '.a.', '5..', 'CCC', '..5', '5..', '..5', '.a.', '5..', 'CCC', '..5', '5..', '..5', '.a.', '5..', 'CCC', '..5', '5..', '..5', '.a.', '5..', 'CCC', '..5', '5..', '..5', '.a.', '5..' ]
            },
            //  12. The finale.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rowSpacing: 114,
                rows: [ '2..', '..4', '.b.', '2..', 'AAA', '..4', '.2.', '2..', '..4', '.b.', 'AAA', 'd.d', '..4', '.2.', '2..', '..4', 'AAA', '2..', 'd.d', '..4', '.2.', '2..', 'AAA', '.b.', '2..', 'd.d', '..4', '.2.' ]
            }
        ]
    },
    {
        name: '14',
        world: 'forest',
        variant: 'night',
        palette: [ 'green', 'yellow', 'purple', 'cyan', 'magenta' ],
        forwardSpeed: 670,
        rowSpacing: 123,
        //  The wood at night, where a lane that looks open is the one being
        //  closed. Sliders and pulses together for most of the level.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..', '.22' ]
            },
            //  2. The sweep.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                rows: [ '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4' ]
            },
            //  3. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'slider',
                rows: [ '.3.', '..4', 'b..', '.4.', '..3', '..e', '.3.', '..4', 'b..', '.4.', '..3', '..e', '.3.', '..4', 'b..', '.4.', '..3', '..e', '.3.', '..4', 'b..', '.4.', '..3', '..e', '.3.', '..4', 'b..', '.4.' ]
            },
            //  4. The switch.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                gateSwap: true,
                obstacles: 'static',
                rows: [ '.4.', 'a..', '..5', '.4.', '..c', '5..', '.4.', 'a..', '..5', '.4.', '..c', '5..', '.4.', 'a..', '..5', '.4.', '..c', '5..', '.4.', 'a..', '..5', '.4.', '..c', '5..', '.4.', 'a..', '..5', '.4.' ]
            },
            //  5. Breathing.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'pulse',
                rows: [ '.5.', 'd..', '..1', '.5.', '..e', '1..', '.5.', 'd..', '..1', '.5.', '..e', '1..', '.5.', 'd..', '..1', '.5.', '..e', '1..', '.5.', 'd..', '..1', '.5.', '..e', '1..', '.5.', 'd..', '..1', '.5.' ]
            },
            //  6. The beat.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1' ]
            },
            //  7. The gift.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                rows: [ '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.' ]
            },
            //  8. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'pulse',
                rows: [ '.5.', 'a.a', '..5', 'c.c', '5..', '.5.', '.5.', 'a.a', '..5', 'c.c', '5..', '.5.', '.5.', 'a.a', '..5', 'c.c', '5..', '.5.', '.5.', 'a.a', '..5', 'c.c', '5..', '.5.', '.5.', 'a.a', '..5', 'c.c' ]
            },
            //  9. Holes.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rows: [ '.2.', '..4', '2..', '000', '..2', '...', '.2.', '..4', '2..', '000', '..2', '...', '.2.', '..4', '2..', '000', '..2', '...', '.2.', '..4', '2..', '000', '..2', '...', '.2.', '..4', '2..', '000', '..2' ]
            },
            //  10. The run.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                speed: 1.28,
                rows: [ '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..' ]
            },
            //  11. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'slider',
                rows: [ '1..', '..1', '.b.', '1..', 'EEE', '..1', '1..', '..1', '.b.', '1..', 'EEE', '..1', '1..', '..1', '.b.', '1..', 'EEE', '..1', '1..', '..1', '.b.', '1..', 'EEE', '..1', '1..', '..1', '.b.', '1..', 'EEE', '..1' ]
            },
            //  12. The finale.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'static',
                rowSpacing: 112,
                rows: [ '3..', '..5', '.a.', '3..', 'BBB', '..5', '.3.', '3..', '..5', '.a.', 'BBB', 'e.e', '..5', '.3.', '3..', '..5', 'BBB', '3..', 'e.e', '..5', '.3.', '3..', 'BBB', '.a.', '3..', 'e.e', '..5', '.3.', 'BBB', '..5' ]
            }
        ]
    },
    {
        name: '15',
        world: 'ice',
        variant: 'night',
        palette: [ 'cyan', 'blue', 'purple', 'magenta', 'yellow' ],
        forwardSpeed: 690,
        rowSpacing: 121,
        //  The sheet after dark. Nothing here is new; what is new is that three
        //  things arrive at once and the road never opens up.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..', '.22', '122' ]
            },
            //  2. Walls.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                obstacles: 'static',
                rows: [ '.2.', 'c..', '..3', '.2.', '..e', '3..', '.2.', 'c..', '..3', '.2.', '..e', '3..', '.2.', 'c..', '..3', '.2.', '..e', '3..', '.2.', 'c..', '..3', '.2.', '..e', '3..', '.2.', 'c..', '..3', '.2.', '..e', '3..', '.2.' ]
            },
            //  3. The beat.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'static',
                rows: [ '.3.', '..4', '3..', 'AAA', '..3', '...', '.3.', '..4', '3..', 'AAA', '..3', '...', '.3.', '..4', '3..', 'AAA', '..3', '...', '.3.', '..4', '3..', 'AAA', '..3', '...', '.3.', '..4', '3..', 'AAA', '..3', '...', '.3.', '..4' ]
            },
            //  4. The switch.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                gateSwap: true,
                obstacles: 'slider',
                rows: [ '.4.', '..5', 'a..', '.5.', '..4', '..d', '.4.', '..5', 'a..', '.5.', '..4', '..d', '.4.', '..5', 'a..', '.5.', '..4', '..d', '.4.', '..5', 'a..', '.5.', '..4', '..d', '.4.', '..5', 'a..', '.5.', '..4', '..d', '.4.' ]
            },
            //  5. Breathing.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'pulse',
                rows: [ '.5.', 'b..', '..1', '.5.', '..e', '1..', '.5.', 'b..', '..1', '.5.', '..e', '1..', '.5.', 'b..', '..1', '.5.', '..e', '1..', '.5.', 'b..', '..1', '.5.', '..e', '1..', '.5.', 'b..', '..1', '.5.', '..e', '1..', '.5.' ]
            },
            //  6. Holes.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                obstacles: 'static',
                rows: [ '.1.', '..2', '1..', '000', '..1', '...', '.1.', '..2', '1..', '000', '..1', '...', '.1.', '..2', '1..', '000', '..1', '...', '.1.', '..2', '1..', '000', '..1', '...', '.1.', '..2', '1..', '000', '..1', '...', '.1.', '..2' ]
            },
            //  7. The gift.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                rows: [ '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5' ]
            },
            //  8. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 3, 2 ],
                obstacles: 'static',
                rows: [ '.4.', 'c.c', '..4', 'd.d', '4..', '.4.', '.4.', 'c.c', '..4', 'd.d', '4..', '.4.', '.4.', 'c.c', '..4', 'd.d', '4..', '.4.', '.4.', 'c.c', '..4', 'd.d', '4..', '.4.', '.4.', 'c.c', '..4', 'd.d', '4..', '.4.', '.4.' ]
            },
            //  9. The drum.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'static',
                rows: [ '.3.', '..5', '3..', 'EEE', '..3', '...', '.3.', '..5', '3..', 'EEE', '..3', '...', '.3.', '..5', '3..', 'EEE', '..3', '...', '.3.', '..5', '3..', 'EEE', '..3', '...', '.3.', '..5', '3..', 'EEE', '..3', '...', '.3.', '..5' ]
            },
            //  10. The run.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                speed: 1.26,
                rows: [ '.5.', '..1', '.1.', '5..', '.5.', '..5', '.5.', '..1', '.1.', '5..', '.5.', '..5', '.5.', '..1', '.1.', '5..', '.5.', '..5', '.5.', '..1', '.1.', '5..', '.5.', '..5', '.5.', '..1', '.1.', '5..', '.5.', '..5', '.5.' ]
            },
            //  11. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 0, 3 ],
                obstacles: 'pulse',
                rows: [ '1..', '..1', '.a.', '1..', 'BBB', '..1', '1..', '..1', '.a.', '1..', 'BBB', '..1', '1..', '..1', '.a.', '1..', 'BBB', '..1', '1..', '..1', '.a.', '1..', 'BBB', '..1', '1..', '..1', '.a.', '1..', 'BBB', '..1', '1..', '..1', '.a.' ]
            },
            //  12. The finale.
            {
                splitAfterLane: 0,
                gate: [ 3, 1 ],
                obstacles: 'static',
                rowSpacing: 110,
                rows: [ '4..', '..2', '.b.', '4..', 'DDD', '..2', '.4.', '4..', '..2', '.b.', 'DDD', 'e.e', '..2', '.4.', '4..', '..2', 'DDD', '4..', 'e.e', '..2', '.4.', '4..', 'DDD', '.b.', '4..', 'e.e', '..2', '.4.', 'DDD', '..2', '.b.', '4..', 'e.e', '..2' ]
            }
        ]
    },
    {
        name: '16',
        world: 'desert',
        variant: 'night',
        palette: [ 'yellow', 'orange', 'blue', 'purple', 'green' ],
        forwardSpeed: 710,
        rowSpacing: 119,
        //  Mastery. From here every level runs past a minute and combines what
        //  the previous fifteen taught, one pairing at a time.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..', '.22', '122' ]
            },
            //  2. The sweep.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                rows: [ '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.' ]
            },
            //  3. Walls.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'static',
                rows: [ '.3.', 'a..', '..4', '.3.', '..d', '4..', '.3.', 'a..', '..4', '.3.', '..d', '4..', '.3.', 'a..', '..4', '.3.', '..d', '4..', '.3.', 'a..', '..4', '.3.', '..d', '4..', '.3.', 'a..', '..4', '.3.', '..d', '4..', '.3.', 'a..' ]
            },
            //  4. The beat.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'static',
                rows: [ '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5', '4..', 'CCC', '..4', '...', '.4.', '..5' ]
            },
            //  5. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'slider',
                rows: [ '.5.', '..1', 'b..', '.1.', '..5', '..e', '.5.', '..1', 'b..', '.1.', '..5', '..e', '.5.', '..1', 'b..', '.1.', '..5', '..e', '.5.', '..1', 'b..', '.1.', '..5', '..e', '.5.', '..1', 'b..', '.1.', '..5', '..e', '.5.', '..1' ]
            },
            //  6. The switch.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                gateSwap: true,
                obstacles: 'pulse',
                rows: [ '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..' ]
            },
            //  7. The gift.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                rows: [ '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.' ]
            },
            //  8. Holes.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rows: [ '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2' ]
            },
            //  9. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rows: [ '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a' ]
            },
            //  10. The run.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                speed: 1.24,
                rows: [ '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1' ]
            },
            //  11. The drum.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3' ]
            },
            //  12. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'pulse',
                rows: [ '3..', '..3', '.b.', '3..', 'DDD', '..3', '3..', '..3', '.b.', '3..', 'DDD', '..3', '3..', '..3', '.b.', '3..', 'DDD', '..3', '3..', '..3', '.b.', '3..', 'DDD', '..3', '3..', '..3', '.b.', '3..', 'DDD', '..3', '3..', '..3', '.b.' ]
            },
            //  13. The finale.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rowSpacing: 108,
                rows: [ '5..', '..2', '.a.', '5..', 'EEE', '..2', '.5.', '5..', '..2', '.a.', 'EEE', 'c.c', '..2', '.5.', '5..', '..2', 'EEE', '5..', 'c.c', '..2', '.5.', '5..', 'EEE', '.a.', '5..', 'c.c', '..2', '.5.', 'EEE', '..2', '.a.', '5..', 'c.c', '..2' ]
            }
        ]
    },
    {
        name: '17',
        world: 'storm',
        variant: 'night',
        palette: [ 'blue', 'red', 'green', 'yellow', 'purple' ],
        forwardSpeed: 730,
        rowSpacing: 117,
        //  The storm at night. Two switching gates, and the stretch between
        //  them is the hardest reading in the game so far.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..', '.22', '122', '122' ]
            },
            //  2. The read.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                rows: [ '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..', '.3.', '2..', '.2.', '..2', '.3.', '3..' ]
            },
            //  3. The switch.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                gateSwap: true,
                obstacles: 'static',
                rows: [ '.3.', 'b..', '..4', '.3.', '..d', '4..', '.3.', 'b..', '..4', '.3.', '..d', '4..', '.3.', 'b..', '..4', '.3.', '..d', '4..', '.3.', 'b..', '..4', '.3.', '..d', '4..', '.3.', 'b..', '..4', '.3.', '..d', '4..', '.3.', 'b..', '..4', '.3.', '..d' ]
            },
            //  4. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'slider',
                rows: [ '.4.', '..5', 'a..', '.5.', '..4', '..e', '.4.', '..5', 'a..', '.5.', '..4', '..e', '.4.', '..5', 'a..', '.5.', '..4', '..e', '.4.', '..5', 'a..', '.5.', '..4', '..e', '.4.', '..5', 'a..', '.5.', '..4', '..e', '.4.', '..5', 'a..', '.5.', '..4' ]
            },
            //  5. The beat.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'static',
                rows: [ '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5', '...', '.5.', '..1', '5..', 'BBB', '..5' ]
            },
            //  6. Breathing.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'pulse',
                rows: [ '.1.', 'c..', '..3', '.1.', '..d', '3..', '.1.', 'c..', '..3', '.1.', '..d', '3..', '.1.', 'c..', '..3', '.1.', '..d', '3..', '.1.', 'c..', '..3', '.1.', '..d', '3..', '.1.', 'c..', '..3', '.1.', '..d', '3..', '.1.', 'c..', '..3', '.1.', '..d' ]
            },
            //  7. The gift.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                rows: [ '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1' ]
            },
            //  8. The second switch.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                gateSwap: true,
                obstacles: 'static',
                rows: [ '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5' ]
            },
            //  9. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'pulse',
                rows: [ '.2.', 'a.a', '..2', 'c.c', '2..', '.2.', '.2.', 'a.a', '..2', 'c.c', '2..', '.2.', '.2.', 'a.a', '..2', 'c.c', '2..', '.2.', '.2.', 'a.a', '..2', 'c.c', '2..', '.2.', '.2.', 'a.a', '..2', 'c.c', '2..', '.2.', '.2.', 'a.a', '..2', 'c.c', '2..' ]
            },
            //  10. The run.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                speed: 1.22,
                rows: [ '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.' ]
            },
            //  11. The drum.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1', '...', '.1.', '..3', '1..', 'DDD', '..1' ]
            },
            //  12. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'slider',
                rows: [ '3..', '..3', '.b.', '3..', 'AAA', '..3', '3..', '..3', '.b.', '3..', 'AAA', '..3', '3..', '..3', '.b.', '3..', 'AAA', '..3', '3..', '..3', '.b.', '3..', 'AAA', '..3', '3..', '..3', '.b.', '3..', 'AAA', '..3', '3..', '..3', '.b.', '3..', 'AAA', '..3', '3..' ]
            },
            //  13. The finale.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rowSpacing: 106,
                rows: [ '5..', '..2', '.c.', '5..', 'CCC', '..2', '.5.', '5..', '..2', '.c.', 'CCC', 'd.d', '..2', '.5.', '5..', '..2', 'CCC', '5..', 'd.d', '..2', '.5.', '5..', 'CCC', '.c.', '5..', 'd.d', '..2', '.5.', 'CCC', '..2', '.c.', '5..', 'd.d', '..2', 'CCC', '5..', '..2', '.c.' ]
            }
        ]
    },
    {
        name: '18',
        world: 'city',
        variant: 'night',
        palette: [ 'cyan', 'magenta', 'yellow', 'green', 'purple' ],
        forwardSpeed: 750,
        rowSpacing: 115,
        //  The towers at night, and the level with the most holes in it. Colour
        //  cannot answer a hole, so this is the level where reading the road
        //  matters more than reading the gate.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..' ]
            },
            //  2. Holes.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                obstacles: 'static',
                rows: [ '.2.', '..3', '2..', '000', '..2', '...', '.2.', '..3', '2..', '000', '..2', '...', '.2.', '..3', '2..', '000', '..2', '...', '.2.', '..3', '2..', '000', '..2', '...', '.2.', '..3', '2..', '000', '..2', '...', '.2.', '..3', '2..', '000', '..2', '...', '.2.', '..3' ]
            },
            //  3. Walls.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'static',
                rows: [ '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..' ]
            },
            //  4. The beat.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'static',
                rows: [ '.4.', '..5', '4..', 'EEE', '..4', '...', '.4.', '..5', '4..', 'EEE', '..4', '...', '.4.', '..5', '4..', 'EEE', '..4', '...', '.4.', '..5', '4..', 'EEE', '..4', '...', '.4.', '..5', '4..', 'EEE', '..4', '...', '.4.', '..5', '4..', 'EEE', '..4', '...', '.4.', '..5' ]
            },
            //  5. The switch.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                gateSwap: true,
                obstacles: 'slider',
                rows: [ '.5.', '..1', 'b..', '.1.', '..5', '..d', '.5.', '..1', 'b..', '.1.', '..5', '..d', '.5.', '..1', 'b..', '.1.', '..5', '..d', '.5.', '..1', 'b..', '.1.', '..5', '..d', '.5.', '..1', 'b..', '.1.', '..5', '..d', '.5.', '..1', 'b..', '.1.', '..5', '..d', '.5.', '..1' ]
            },
            //  6. Breathing.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'pulse',
                rows: [ '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..', '..3', '.1.', '..e', '3..', '.1.', 'c..' ]
            },
            //  7. The gift.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                rows: [ '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.' ]
            },
            //  8. The drum.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rows: [ '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2' ]
            },
            //  9. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rows: [ '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a', '..2', 'd.d', '2..', '.2.', '.2.', 'a.a' ]
            },
            //  10. The run.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                speed: 1.18,
                rows: [ '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1', '.1.', '4..', '.4.', '..4', '.4.', '..1' ]
            },
            //  11. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'slider',
                rows: [ '.1.', '..3', 'b..', '.3.', '..1', '..e', '.1.', '..3', 'b..', '.3.', '..1', '..e', '.1.', '..3', 'b..', '.3.', '..1', '..e', '.1.', '..3', 'b..', '.3.', '..1', '..e', '.1.', '..3', 'b..', '.3.', '..1', '..e', '.1.', '..3', 'b..', '.3.', '..1', '..e', '.1.', '..3' ]
            },
            //  12. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'pulse',
                rows: [ '3..', '..3', '.a.', '3..', 'BBB', '..3', '3..', '..3', '.a.', '3..', 'BBB', '..3', '3..', '..3', '.a.', '3..', 'BBB', '..3', '3..', '..3', '.a.', '3..', 'BBB', '..3', '3..', '..3', '.a.', '3..', 'BBB', '..3', '3..', '..3', '.a.', '3..', 'BBB', '..3', '3..', '..3', '.a.', '3..' ]
            },
            //  13. The finale.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rowSpacing: 104,
                rows: [ '5..', '..2', '.d.', '5..', 'DDD', '..2', '.5.', '5..', '..2', '.d.', 'DDD', 'e.e', '..2', '.5.', '5..', '..2', 'DDD', '5..', 'e.e', '..2', '.5.', '5..', 'DDD', '.d.', '5..', 'e.e', '..2', '.5.', 'DDD', '..2', '.d.', '5..', 'e.e', '..2', 'DDD', '5..', '..2', '.d.', '5..', 'e.e', 'DDD' ]
            }
        ]
    },
    {
        name: '19',
        world: 'space',
        variant: 'night',
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ],
        forwardSpeed: 770,
        rowSpacing: 113,
        //  Deep space. The longest run of jumps in the game, and two speed
        //  sections rather than one.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22' ]
            },
            //  2. The sweep.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                rows: [ '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..' ]
            },
            //  3. The first run.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                speed: 1.14,
                rows: [ '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3', '.3.', '..4', '.4.', '3..', '.3.', '..3' ]
            },
            //  4. The beat.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'static',
                rows: [ '.4.', '..5', '4..', 'AAA', '..4', '...', '.4.', '..5', '4..', 'AAA', '..4', '...', '.4.', '..5', '4..', 'AAA', '..4', '...', '.4.', '..5', '4..', 'AAA', '..4', '...', '.4.', '..5', '4..', 'AAA', '..4', '...', '.4.', '..5', '4..', 'AAA', '..4', '...', '.4.', '..5', '4..', 'AAA', '..4', '...' ]
            },
            //  5. Walls.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'static',
                rows: [ '.5.', 'b..', '..1', '.5.', '..d', '1..', '.5.', 'b..', '..1', '.5.', '..d', '1..', '.5.', 'b..', '..1', '.5.', '..d', '1..', '.5.', 'b..', '..1', '.5.', '..d', '1..', '.5.', 'b..', '..1', '.5.', '..d', '1..', '.5.', 'b..', '..1', '.5.', '..d', '1..', '.5.', 'b..', '..1', '.5.', '..d', '1..' ]
            },
            //  6. The switch.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                gateSwap: true,
                obstacles: 'slider',
                rows: [ '.1.', '..3', 'a..', '.3.', '..1', '..e', '.1.', '..3', 'a..', '.3.', '..1', '..e', '.1.', '..3', 'a..', '.3.', '..1', '..e', '.1.', '..3', 'a..', '.3.', '..1', '..e', '.1.', '..3', 'a..', '.3.', '..1', '..e', '.1.', '..3', 'a..', '.3.', '..1', '..e', '.1.', '..3', 'a..', '.3.', '..1', '..e' ]
            },
            //  7. The gift.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                rows: [ '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1', '3.1', '.5.', '3.1', '3..', '.5.', '..1' ]
            },
            //  8. Holes.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rows: [ '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...', '.5.', '..2', '5..', '000', '..5', '...' ]
            },
            //  9. The drum.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rows: [ '.2.', '..4', '2..', 'CCC', '..2', '...', '.2.', '..4', '2..', 'CCC', '..2', '...', '.2.', '..4', '2..', 'CCC', '..2', '...', '.2.', '..4', '2..', 'CCC', '..2', '...', '.2.', '..4', '2..', 'CCC', '..2', '...', '.2.', '..4', '2..', 'CCC', '..2', '...', '.2.', '..4', '2..', 'CCC', '..2', '...' ]
            },
            //  10. Breathing.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'pulse',
                rows: [ '.4.', 'c..', '..1', '.4.', '..d', '1..', '.4.', 'c..', '..1', '.4.', '..d', '1..', '.4.', 'c..', '..1', '.4.', '..d', '1..', '.4.', 'c..', '..1', '.4.', '..d', '1..', '.4.', 'c..', '..1', '.4.', '..d', '1..', '.4.', 'c..', '..1', '.4.', '..d', '1..', '.4.', 'c..', '..1', '.4.', '..d', '1..' ]
            },
            //  11. The second run.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                speed: 1.14,
                rows: [ '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1' ]
            },
            //  12. The gauntlet.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'slider',
                rows: [ '3..', '..3', '.b.', '3..', 'EEE', '..3', '3..', '..3', '.b.', '3..', 'EEE', '..3', '3..', '..3', '.b.', '3..', 'EEE', '..3', '3..', '..3', '.b.', '3..', 'EEE', '..3', '3..', '..3', '.b.', '3..', 'EEE', '..3', '3..', '..3', '.b.', '3..', 'EEE', '..3', '3..', '..3', '.b.', '3..', 'EEE', '..3', '3..', '..3' ]
            },
            //  13. The finale.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                obstacles: 'static',
                rowSpacing: 102,
                rows: [ '5..', '..2', '.a.', '5..', 'BBB', '..2', '.5.', '5..', '..2', '.a.', 'BBB', 'c.c', '..2', '.5.', '5..', '..2', 'BBB', '5..', 'c.c', '..2', '.5.', '5..', 'BBB', '.a.', '5..', 'c.c', '..2', '.5.', 'BBB', '..2', '.a.', '5..', 'c.c', '..2', 'BBB', '5..', '..2', '.a.', '5..', 'c.c', 'BBB', '.5.', '5..', '..2', '.a.' ]
            }
        ]
    },
    {
        name: '20',
        world: 'void',
        variant: 'night',
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ],
        forwardSpeed: 790,
        rowSpacing: 111,
        //  The last one. Nothing new is introduced - every mechanic the game
        //  has, in the order it was taught, at the tightest spacing and the
        //  highest speed in the game.
        sections: [
            //  1. The opening.
            {
                splitAfterLane: 0,
                gate: [ 0, 1 ],
                rows: [ '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22', '122', '1..', '.22', '122', '122', '122', '1..', '.22' ]
            },
            //  2. The sweep.
            {
                splitAfterLane: 0,
                gate: [ 1, 2 ],
                rows: [ '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.', '2..', '2..', '.3.', '..4', '..4', '.3.' ]
            },
            //  3. Walls.
            {
                splitAfterLane: 0,
                gate: [ 2, 3 ],
                obstacles: 'static',
                rows: [ '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c', '4..', '.3.', 'a..', '..4', '.3.', '..c' ]
            },
            //  4. Sliders.
            {
                splitAfterLane: 0,
                gate: [ 3, 4 ],
                obstacles: 'slider',
                rows: [ '.4.', '..5', 'b..', '.5.', '..4', '..d', '.4.', '..5', 'b..', '.5.', '..4', '..d', '.4.', '..5', 'b..', '.5.', '..4', '..d', '.4.', '..5', 'b..', '.5.', '..4', '..d', '.4.', '..5', 'b..', '.5.', '..4', '..d', '.4.', '..5', 'b..', '.5.', '..4', '..d', '.4.', '..5', 'b..', '.5.', '..4' ]
            },
            //  5. Breathing.
            {
                splitAfterLane: 0,
                gate: [ 4, 0 ],
                obstacles: 'pulse',
                rows: [ '.5.', 'c..', '..1', '.5.', '..e', '1..', '.5.', 'c..', '..1', '.5.', '..e', '1..', '.5.', 'c..', '..1', '.5.', '..e', '1..', '.5.', 'c..', '..1', '.5.', '..e', '1..', '.5.', 'c..', '..1', '.5.', '..e', '1..', '.5.', 'c..', '..1', '.5.', '..e', '1..', '.5.', 'c..', '..1', '.5.', '..e' ]
            },
            //  6. The beat.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                obstacles: 'static',
                rows: [ '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1', '...', '.1.', '..3', '1..', 'AAA', '..1' ]
            },
            //  7. Holes.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'static',
                rows: [ '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3', '...', '.3.', '..5', '3..', '000', '..3' ]
            },
            //  8. The switch.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                gateSwap: true,
                obstacles: 'static',
                rows: [ '.5.', 'a..', '..2', '.5.', '..d', '2..', '.5.', 'a..', '..2', '.5.', '..d', '2..', '.5.', 'a..', '..2', '.5.', '..d', '2..', '.5.', 'a..', '..2', '.5.', '..d', '2..', '.5.', 'a..', '..2', '.5.', '..d', '2..', '.5.', 'a..', '..2', '.5.', '..d', '2..', '.5.', 'a..', '..2', '.5.', '..d' ]
            },
            //  9. The gift.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                rows: [ '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.', '..5', '2.5', '.4.', '2.5', '2..', '.4.' ]
            },
            //  10. Pairs.
            {
                splitAfterLane: 0,
                gate: [ 3, 0 ],
                obstacles: 'static',
                rows: [ '.4.', 'b.b', '..4', 'e.e', '4..', '.4.', '.4.', 'b.b', '..4', 'e.e', '4..', '.4.', '.4.', 'b.b', '..4', 'e.e', '4..', '.4.', '.4.', 'b.b', '..4', 'e.e', '4..', '.4.', '.4.', 'b.b', '..4', 'e.e', '4..', '.4.', '.4.', 'b.b', '..4', 'e.e', '4..', '.4.', '.4.', 'b.b', '..4', 'e.e', '4..' ]
            },
            //  11. The run.
            {
                splitAfterLane: 0,
                gate: [ 0, 2 ],
                speed: 1.1,
                rows: [ '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.', '..1', '.1.', '..3', '.3.', '1..', '.1.' ]
            },
            //  12. The drum.
            {
                splitAfterLane: 0,
                gate: [ 2, 4 ],
                obstacles: 'static',
                rows: [ '.3.', '..5', '3..', 'DDD', '..3', '...', '.3.', '..5', '3..', 'DDD', '..3', '...', '.3.', '..5', '3..', 'DDD', '..3', '...', '.3.', '..5', '3..', 'DDD', '..3', '...', '.3.', '..5', '3..', 'DDD', '..3', '...', '.3.', '..5', '3..', 'DDD', '..3', '...', '.3.', '..5', '3..', 'DDD', '..3' ]
            },
            //  13. The second switch.
            {
                splitAfterLane: 0,
                gate: [ 4, 1 ],
                gateSwap: true,
                obstacles: 'pulse',
                rows: [ '5..', '..5', '.c.', '5..', 'CCC', '..5', '5..', '..5', '.c.', '5..', 'CCC', '..5', '5..', '..5', '.c.', '5..', 'CCC', '..5', '5..', '..5', '.c.', '5..', 'CCC', '..5', '5..', '..5', '.c.', '5..', 'CCC', '..5', '5..', '..5', '.c.', '5..', 'CCC', '..5', '5..', '..5', '.c.', '5..', 'CCC', '..5' ]
            },
            //  14. The finale.
            {
                splitAfterLane: 0,
                gate: [ 1, 3 ],
                obstacles: 'static',
                rowSpacing: 100,
                rows: [ '2..', '..4', '.a.', '2..', 'EEE', '..4', '.2.', '2..', '..4', '.a.', 'EEE', 'e.e', '..4', '.2.', '2..', '..4', 'EEE', '2..', 'e.e', '..4', '.2.', '2..', 'EEE', '.a.', '2..', 'e.e', '..4', '.2.', 'EEE', '..4', '.a.', '2..', 'e.e', '..4', 'EEE', '2..', '..4', '.a.', '2..', 'e.e', 'EEE', '.2.', '2..', '..4', '.a.', '2..', 'EEE' ]
            }
        ]
    }
];

export const LEVEL_COUNT = LEVELS.length;

/** Keeps a level index inside the list, whatever it was read from. */
export function clampLevelIndex (index: number): number
{
    return Math.max(0, Math.min(LEVEL_COUNT - 1, index));
}

/** Whether there is a level after this one. */
export function hasNextLevel (index: number): boolean
{
    return index < LEVEL_COUNT - 1;
}
