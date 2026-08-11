import { HORIZON_Y } from '../config/constants';
import { LayerShape, LayerSpec } from '../config/worlds';
import { seeded } from './noise';

//  Windows: how far apart they sit, how big they are, how far in from a tower's
//  edge the grid starts, and what share of them are lit.
const WINDOW_PITCH = 11;
const WINDOW_SIZE = 4;
const WINDOW_INSET = 4;
const WINDOW_LIT = 0.45;

/** How much of a peak's height the snow covers. */
const CAP_SHARE = 0.34;

//  The silhouettes a world is built from.
//
//  Every shape is the same idea - a baseline with something standing on it - so
//  a world's character comes from its profile rather than from anything
//  expensive. A layer may also carry a `detail` colour, which is what turns a
//  flat cut-out into somewhere: windows in the towers, snow on the peaks.
//
//  Detail is opt-in per layer rather than automatic. A world earns its dressing
//  where it helps, and the nearest layers deliberately go without - clutter
//  close to the road is exactly what must not compete with an orb.

/**
 * Draws one repeat of a layer's profile at a vertical offset.
 *
 * Every shape is built from the same idea - a baseline with something standing
 * on it - so a world's character comes from the silhouette rather than from
 * anything expensive.
 */
export function drawSilhouette (gfx: Phaser.GameObjects.Graphics, layer: LayerSpec, offset: number): void
{
    //  The same seed for every tile, so the three copies are identical and the
    //  wrap is invisible.
    const random = seeded(layer.seed);
    const base = HORIZON_Y + layer.baseline;

    gfx.fillStyle(layer.color, layer.alpha);

    const shape: LayerShape = layer.shape;

    if (shape === 'blobs')
    {
        for (let x = offset; x < offset + layer.wrap; x += layer.period * (0.5 + random() * 0.5))
        {
            const r = layer.height * (0.45 + random() * 0.65);
            const y = base - (random() * layer.height * 0.6);

            gfx.fillCircle(x, y, r);
            gfx.fillCircle(x + r * 0.8, y + r * 0.25, r * 0.72);
            gfx.fillCircle(x - r * 0.75, y + r * 0.3, r * 0.6);
        }

        return;
    }

    if (shape === 'buildings')
    {
        for (let x = offset; x < offset + layer.wrap; x += layer.period)
        {
            const w = layer.period * (0.55 + random() * 0.35);
            const h = layer.height * (0.35 + random() * 0.75);

            gfx.fillStyle(layer.color, layer.alpha);
            gfx.fillRect(x, base - h, w, h);

            if (layer.detail === undefined) { continue; }

            //  Lit windows, on a grid rather than scattered: a tower reads as
            //  built when its lights line up, and as static when they do not.
            const columns = Math.max(1, Math.floor(w / WINDOW_PITCH));
            const rows = Math.max(1, Math.floor(h / WINDOW_PITCH));

            gfx.fillStyle(layer.detail, layer.detailAlpha ?? 0.5);

            for (let column = 0; column < columns; column++)
            {
                for (let row = 0; row < rows; row++)
                {
                    if (random() > WINDOW_LIT) { continue; }

                    gfx.fillRect(
                        x + WINDOW_INSET + (column * WINDOW_PITCH),
                        base - h + WINDOW_INSET + (row * WINDOW_PITCH),
                        WINDOW_SIZE,
                        WINDOW_SIZE
                    );
                }
            }
        }

        return;
    }

    if (shape === 'trees')
    {
        for (let x = offset; x < offset + layer.wrap; x += layer.period * (0.6 + random() * 0.6))
        {
            const h = layer.height * (0.6 + random() * 0.6);
            const w = layer.period * (0.5 + random() * 0.3);

            gfx.fillTriangle(x, base, x + w / 2, base - h, x + w, base);
            gfx.fillTriangle(x + w * 0.1, base - h * 0.35, x + w / 2, base - h * 1.25, x + w * 0.9, base - h * 0.35);
        }

        return;
    }

    if (shape === 'mesa')
    {
        for (let x = offset; x < offset + layer.wrap; x += layer.period)
        {
            const w = layer.period * (0.6 + random() * 0.5);
            const h = layer.height * (0.4 + random() * 0.7);
            const inset = w * 0.12;

            gfx.fillTriangle(x, base, x + inset, base - h, x + w - inset, base - h);
            gfx.fillTriangle(x, base, x + w - inset, base - h, x + w, base);
        }

        return;
    }

    if (shape === 'shards')
    {
        for (let x = offset; x < offset + layer.wrap; x += layer.period * (0.6 + random() * 0.7))
        {
            const w = layer.period * (0.3 + random() * 0.4);
            const h = layer.height * (0.5 + random() * 0.9);
            const lean = (random() - 0.5) * w;

            gfx.fillTriangle(x, base, x + lean + w / 2, base - h, x + w, base);
        }

        return;
    }

    //  'peaks', 'hills' and 'dunes' are all a run of humps; only their sharpness
    //  differs.
    const sharpness = shape === 'peaks' ? 1 : shape === 'hills' ? 0.55 : 0.3;

    for (let x = offset; x < offset + layer.wrap; x += layer.period)
    {
        const w = layer.period * (0.85 + random() * 0.5);
        const h = layer.height * (0.45 + random() * 0.8);
        const peak = x + (w / 2) + ((random() - 0.5) * w * 0.3 * sharpness);

        if (sharpness > 0.8)
        {
            gfx.fillStyle(layer.color, layer.alpha);
            gfx.fillTriangle(x, base, peak, base - h, x + w, base);

            //  Snow on the top third, drawn as the same triangle cut short - so
            //  it sits on the peak rather than floating near it, whatever the
            //  peak's lean.
            if (layer.detail !== undefined)
            {
                const t = CAP_SHARE;

                gfx.fillStyle(layer.detail, layer.detailAlpha ?? 0.5);
                gfx.fillTriangle(
                    peak + ((x - peak) * t), base - (h * (1 - t)),
                    peak, base - h,
                    peak + ((x + w - peak) * t), base - (h * (1 - t))
                );
            }
        }
        else
        {
            //  Rounded: a wide arc sitting on the baseline.
            gfx.fillEllipse(peak, base, w * (1 + (1 - sharpness)), h * 2);
            gfx.fillRect(x, base - 1, w, 2);
        }
    }
}
