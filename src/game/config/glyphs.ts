import { ColorId } from './constants';

//  A second way to tell the colours apart.
//
//  This game is *entirely* about matching hue: carry this colour, take that orb,
//  avoid the other one. That makes it unplayable rather than merely awkward for
//  a player without full colour vision, and it is not a theoretical worry - the
//  palette was measured under simulated dichromacy and the numbers are bad.
//
//  Under deuteranopia, the commonest form, this game's red and green come out
//  0.8 apart in CIE76. Twenty is roughly the point where two colours stop being
//  confusable at a glance, so 0.8 is not "hard to tell apart", it is the same
//  colour twice. Levels seven and seventeen both carry red and green. Under
//  protanopia orange and green collapse; under tritanopia red, orange and
//  magenta all run together. Eight of the twenty levels hold at least one pair
//  that some player cannot separate.
//
//  Repainting the palette does not fix it. Five colours on screen at once will
//  always collapse somewhere for someone, and the fix has to work for every kind
//  of colour vision at once rather than for whichever one was tested against.
//  So each colour also carries a mark, and matching becomes a question of shape
//  as well as hue - which is a question everybody can answer.

/**
 * The mark a colour wears.
 *
 * Silhouettes rather than counts. A player has a fraction of a second to read an
 * orb coming at them, and telling two pips from three in that time is not
 * reading, it is arithmetic - whereas a circle is not a bar however briefly it
 * is seen.
 *
 * Deliberately few and deliberately crude. These are drawn a handful of pixels
 * across on a far orb, so anything with detail in it becomes a smudge, and a
 * smudge is worse than nothing: it says "there is a mark here" without saying
 * which.
 */
export type Glyph =
    /** A solid dot. */
    | 'dot'
    /** A hollow ring. */
    | 'ring'
    /** A horizontal bar. */
    | 'bar'
    /** A plus. */
    | 'cross'
    /** A triangle, pointing up. */
    | 'wedge'
    /** A square standing on its side. */
    | 'block'
    /** A diamond - a square on its corner. */
    | 'gem'
    /** Two horizontal bars. */
    | 'twin';

/**
 * Which mark each colour carries.
 *
 * Fixed per colour rather than per position in a level's palette, so a colour
 * means the same thing everywhere in the game. A mark that moved between levels
 * would be a second thing to learn every time, which is worse than the problem
 * it solves.
 *
 * The pairs that collapse under some form of colour blindness are given the
 * marks least like each other: red and green are a dot and a bar, orange and
 * green a cross and a bar, red and magenta a dot and a gem.
 */
export const GLYPHS: Record<ColorId, Glyph> = {
    red: 'dot',
    green: 'bar',
    orange: 'cross',
    magenta: 'gem',
    blue: 'ring',
    yellow: 'wedge',
    cyan: 'block',
    purple: 'twin',

    //  Pink is not in any shipped palette, and shares with magenta because the
    //  two are near neighbours: if they ever appear together the level has a
    //  colour problem that no mark is going to fix.
    pink: 'gem'
};
