import { MENU_BELL_GAIN, MENU_TUNE_CEILING, MENU_TUNE_GAIN } from './constants';
import { Beat } from './music';
import { SELECT, TOPLINE } from './score';

//  The music the menus play.
//
//  Both menu screens play this and neither stops it, so it begins on the tune's
//  opening call the first time the game is touched and carries on from there.
//  There was a separate title sting for a while; it played the same five notes
//  as the first bars of this, which meant the announcement and the music were
//  two things saying the same thing over each other.
//
//  `config/music` is what plays while somebody is steering, and
//  `config/jingles` the two phrases that end a level.

/**
 * One bar of the level select: the four chords held, with the tune over them.
 *
 * This is where the tune goes. Under a run it is a melody asking to be
 * followed by somebody who has a road to read; here there is nothing to do but
 * choose a level, and something to listen to while choosing is the whole
 * reason menu music exists.
 *
 * No drums. A screen where nothing is moving does not want a beat telling it
 * to hurry up.
 */
export function selectBar (bar: number): Beat[]
{
    const step = ((bar % MENU_BARS) + MENU_BARS) % MENU_BARS;
    const shape = SELECT[step % SELECT.length];
    const notes: Beat[] = [];

    for (const beat of [ 0, 3 ])
    {
        for (const semitones of shape.full)
        {
            notes.push({ semitones, beat, gain: 0.4, timbre: 'chord' });
        }
    }

    for (const beat of [ 0.5, 1, 1.5, 2, 2.5, 3.5 ])
    {
        for (const semitones of shape.inner)
        {
            notes.push({ semitones, beat, gain: 0.26, timbre: 'chord' });
        }
    }

    //  Well down under the chords. It is the only melody in the game and it
    //  plays for as long as somebody takes to choose, so it wants to be the
    //  thing they notice on the second listen rather than the first.
    for (const [ beat, semitones, held ] of TOPLINE[step])
    {
        notes.push({ semitones: folded(semitones), beat, gain: MENU_TUNE_GAIN, timbre: 'lead', held });
    }

    //  And a bell on the turn of every other bar, an octave over the chord.
    //
    //  One note every three seconds or so, which is the most a decoration can
    //  be before it becomes a part. It rings for the better part of a second
    //  and has nothing else up there to argue with, so it reads as a highlight
    //  on the chord rather than as another line to follow.
    if (step % 2 === 0)
    {
        notes.push({ semitones: shape.full[shape.full.length - 1] + 12, beat: 0, gain: MENU_BELL_GAIN, timbre: 'pluck' });
    }

    return notes;
}

/**
 * The tune brought down into one register.
 *
 * As written it climbs a long way: the verse sits around the root and the
 * chorus is an octave and a half over it, which put the high half up where a
 * phone speaker is at its most piercing and made the tune the loudest thing on
 * a screen where it is meant to be company.
 *
 * Anything above the ceiling drops an octave, which is the one transposition
 * that leaves a melody in its own harmony. The shape of the phrase survives
 * exactly - the chorus is still the higher half, still rises and falls in the
 * same places - it simply happens lower down.
 */
function folded (semitones: number): number
{
    return semitones > MENU_TUNE_CEILING ? semitones - 12 : semitones;
}

/**
 * How many bars before the level select comes round.
 *
 * The tune, which is four times the length of the chords under it - so the same
 * eight bars of chords land under a different phrase each time and thirty-two
 * bars pass before anything repeats.
 */
export const MENU_BARS = TOPLINE.length;

/** How many bars of chords before those come round, which is a quarter of it. */
export const SELECT_BARS = SELECT.length;
