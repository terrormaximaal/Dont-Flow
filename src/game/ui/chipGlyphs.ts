//  Display and GameObjects come in by name rather than through the Phaser
//  global: the types are ambient, so a global reference typechecks and then
//  fails at run time under the ESM build.
import { Display, GameObjects } from 'phaser';
import { CHIP_GLYPH_WIDTH } from '../config/constants';

//  The two drawings on the switches, in numbers rather than in a font.
//
//  A glyph carries the state further than a word does: ON and OFF are four
//  letters apart at thirteen pixels, and a struck-through speaker is legible
//  from across a table. Both are drawn inside a box `size` across, centred on
//  the y given, so a caller never has to know how either is built.

/**
 * A speaker, with two arcs when it is on and a stroke through it when it is not.
 *
 * The struck-through form rather than a plain cone: silence has to be a state
 * the eye can name, and an icon that only loses detail reads as the same icon
 * seen badly.
 */
export function drawSpeaker (
    g: GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    on: boolean,
    tint: string
): void
{
    const colour = Display.Color.HexStringToColor(tint).color;
    const body = size * 0.34;
    const cone = size * 0.3;

    g.fillStyle(colour, 1);

    //  The box against the cabinet, and the cone opening out of it.
    g.fillRect(x, y - (body / 2), cone * 0.55, body);
    g.fillTriangle(x + (cone * 0.55), y, x + cone + (cone * 0.55), y - size * 0.36, x + cone + (cone * 0.55), y + size * 0.36);

    g.lineStyle(CHIP_GLYPH_WIDTH, colour, 1);

    if (on)
    {
        //  Two arcs rather than three: at this size the third is a smudge.
        for (const radius of [ size * 0.24, size * 0.4 ])
        {
            g.beginPath();
            g.arc(x + (cone * 1.5), y, radius, -0.9, 0.9);
            g.strokePath();
        }

        return;
    }

    //  Through the whole glyph, corner to corner, so it cannot be mistaken for
    //  part of the speaker.
    g.beginPath();
    g.moveTo(x + (size * 0.08), y - (size * 0.42));
    g.lineTo(x + (size * 0.92), y + (size * 0.42));
    g.strokePath();
}

/**
 * The shape marks: a triangle and a disc, which is what the switch turns on.
 *
 * Drawn as two of the marks the orbs actually carry rather than as an eye or a
 * pair of glasses. The switch is named for what it does rather than for who it
 * is for, and the drawing should say the same thing.
 */
export function drawShapes (
    g: GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    on: boolean,
    tint: string
): void
{
    const colour = Display.Color.HexStringToColor(tint).color;
    const r = size * 0.26;

    if (on)
    {
        g.fillStyle(colour, 1);
        g.fillTriangle(x + r, y - size * 0.42, x, y + (r * 0.8), x + (r * 2), y + (r * 0.8));
        g.fillCircle(x + size * 0.72, y + size * 0.12, r * 0.85);

        return;
    }

    //  Outlined when off: the same two marks, not filled in.
    g.lineStyle(CHIP_GLYPH_WIDTH, colour, 1);
    g.strokeTriangle(x + r, y - size * 0.42, x, y + (r * 0.8), x + (r * 2), y + (r * 0.8));
    g.strokeCircle(x + size * 0.72, y + size * 0.12, r * 0.85);
}
