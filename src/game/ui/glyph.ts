import { Glyph } from '../config/glyphs';

//  Drawing a colour's mark.
//
//  Everything here is drawn from the centre outwards at a given radius, so the
//  same call works on an orb the size of a thumbnail and on one three hundred
//  pixels down the road. Kept apart from the entities that use it because an
//  orb, a gate and a barrier all have to draw the same mark the same way - a
//  mark that looked different on a gate from on an orb would be a third thing
//  to learn rather than one.

/**
 * Draw one mark, centred, filling roughly `radius`.
 *
 * @param strength 0 to 1, so a mark can fade with whatever it sits on.
 */
export function drawGlyph (
    gfx: Phaser.GameObjects.Graphics,
    glyph: Glyph,
    x: number,
    y: number,
    radius: number,
    color: number,
    strength = 1
): void
{
    //  Below a couple of pixels every one of these is the same grey dot, and a
    //  smudge that says "there is a mark here" without saying which is worse
    //  than no mark at all.
    if (radius < 1.5 || strength <= 0)
    {
        return;
    }

    gfx.fillStyle(color, strength);
    gfx.lineStyle(Math.max(1, radius * 0.34), color, strength);

    const r = radius;

    switch (glyph)
    {
        case 'dot':
            gfx.fillCircle(x, y, r * 0.62);

            return;

        case 'ring':
            gfx.strokeCircle(x, y, r * 0.66);

            return;

        case 'bar':
            gfx.fillRect(x - r, y - (r * 0.28), r * 2, r * 0.56);

            return;

        case 'twin':
            gfx.fillRect(x - r, y - (r * 0.72), r * 2, r * 0.4);
            gfx.fillRect(x - r, y + (r * 0.32), r * 2, r * 0.4);

            return;

        case 'cross':
            gfx.fillRect(x - r, y - (r * 0.26), r * 2, r * 0.52);
            gfx.fillRect(x - (r * 0.26), y - r, r * 0.52, r * 2);

            return;

        case 'wedge':
            gfx.fillTriangle(x, y - r, x + r, y + (r * 0.72), x - r, y + (r * 0.72));

            return;

        case 'block':
            gfx.fillRect(x - (r * 0.74), y - (r * 0.74), r * 1.48, r * 1.48);

            return;

        case 'gem':
            gfx.fillTriangle(x, y - r, x + r, y, x - r, y);
            gfx.fillTriangle(x, y + r, x + r, y, x - r, y);
    }
}
