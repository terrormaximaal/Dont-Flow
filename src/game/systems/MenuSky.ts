import { Scene } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import {
    BlobSpec,
    MENU_BLOB_LAYERS,
    MENU_BLOBS,
    MENU_DROPLET_ALPHA,
    MENU_DROPLET_RISE,
    MENU_DROPLETS,
    MENU_POOL_ALPHA,
    MENU_POOL_SQUASH,
    MENU_POOL_Y,
    MENU_RIPPLE_ALPHA,
    MENU_RIPPLE_THICKNESS,
    MENU_RIPPLES,
    MENU_SKY_BANDS,
    MENU_SKY_LOW,
    MENU_SKY_MID,
    MENU_SKY_TOP,
    MENU_STAR_ALPHA,
    MENU_STARS
} from '../config/menuTheme';
import { mixColor } from '../utils/color';

const SKY_DEPTH = -100;
const STAR_DEPTH = -98;
const BLOB_DEPTH = -96;
const POOL_DEPTH = -94;
const DROPLET_DEPTH = -92;

/**
 * The menu's backdrop: a liquid cosmos with a reflecting surface under it.
 *
 * Everything here is drawn from shapes, like the rest of the game - no images.
 * The masses are stacks of circles at very low alpha rather than blurred
 * sprites, which gives a soft edge for the cost of a few dozen fills and lets
 * them overlap into colours neither one has on its own.
 *
 * Driven by a clock rather than by distance travelled, unlike everything in a
 * level. Nothing is travelling here: the menu is a place the drop is floating
 * in, and it should breathe whether or not anyone touches it.
 */
export class MenuSky
{
    private readonly blobs: Phaser.GameObjects.Graphics;
    private readonly pool: Phaser.GameObjects.Graphics;
    private readonly droplets: Phaser.GameObjects.Graphics;

    /** Seeded once so the field is identical on every visit. */
    private readonly starSeeds: Array<{ x: number; y: number; r: number }> = [];
    private readonly dropletSeeds: Array<{ x: number; size: number; phase: number; drift: number }> = [];

    private elapsed = 0;

    constructor (scene: Scene)
    {
        this.drawSky(scene);
        this.seed();
        this.drawStars(scene);

        this.blobs = scene.add.graphics();
        this.blobs.setDepth(BLOB_DEPTH);

        this.pool = scene.add.graphics();
        this.pool.setDepth(POOL_DEPTH);

        this.droplets = scene.add.graphics();
        this.droplets.setDepth(DROPLET_DEPTH);
    }

    /** A three-stop gradient, laid down once as bands. */
    private drawSky (scene: Scene): void
    {
        const gfx = scene.add.graphics();

        gfx.setDepth(SKY_DEPTH);

        const height = GAME_HEIGHT / MENU_SKY_BANDS;

        for (let band = 0; band < MENU_SKY_BANDS; band++)
        {
            const t = band / (MENU_SKY_BANDS - 1);

            //  Two halves, so the ramp can bend through the middle stop rather
            //  than running straight from top to bottom.
            const color = t < 0.5
                ? mixColor(MENU_SKY_TOP, MENU_SKY_MID, t * 2)
                : mixColor(MENU_SKY_MID, MENU_SKY_LOW, (t - 0.5) * 2);

            gfx.fillStyle(color, 1);
            gfx.fillRect(0, band * height, GAME_WIDTH, height + 1);
        }
    }

    private seed (): void
    {
        for (let i = 0; i < MENU_STARS; i++)
        {
            this.starSeeds.push({
                x: fraction(i * 3.1) * GAME_WIDTH,
                //  Kept above the pool: a star in the water is a reflection, and
                //  the pool draws its own.
                y: fraction(i * 7.7) * MENU_POOL_Y,
                r: 0.6 + (fraction(i * 11.3) * 1.1)
            });
        }

        for (let i = 0; i < MENU_DROPLETS; i++)
        {
            this.dropletSeeds.push({
                x: fraction(i * 5.9) * GAME_WIDTH,
                size: 3 + (fraction(i * 13.1) * 7),
                phase: fraction(i * 2.3),
                drift: (fraction(i * 17.9) - 0.5) * 26
            });
        }
    }

    private drawStars (scene: Scene): void
    {
        const gfx = scene.add.graphics();

        gfx.setDepth(STAR_DEPTH);
        gfx.fillStyle(0xffffff, MENU_STAR_ALPHA);

        for (const star of this.starSeeds)
        {
            gfx.fillCircle(star.x, star.y, star.r);
        }
    }

    update (delta: number): void
    {
        this.elapsed += delta / 1000;

        this.blobs.clear();
        this.pool.clear();
        this.droplets.clear();

        for (const blob of MENU_BLOBS)
        {
            this.drawBlob(this.blobs, blob, 1, 1);
        }

        this.drawPool();
        this.drawDroplets();
    }

    /**
     * One mass, as a stack of widening circles.
     *
     * @param flip  -1 to draw it mirrored in the pool, 1 for upright.
     * @param fade  Multiplier on its alpha, for the dimmer reflection.
     */
    private drawBlob (
        gfx: Phaser.GameObjects.Graphics,
        spec: BlobSpec,
        flip: number,
        fade: number
    ): void
    {
        const x = spec.x + (Math.sin((this.elapsed / spec.periodX) * Math.PI * 2) * spec.driftX);
        const y = spec.y + (Math.cos((this.elapsed / spec.periodY) * Math.PI * 2) * spec.driftY);

        //  Mirrored about the surface, and squashed, because a reflection in
        //  liquid is never the same height as the thing above it.
        const drawnY = flip < 0
            ? MENU_POOL_Y + ((MENU_POOL_Y - y) * MENU_POOL_SQUASH)
            : y;

        for (let layer = MENU_BLOB_LAYERS; layer > 0; layer--)
        {
            const radius = spec.radius * (layer / MENU_BLOB_LAYERS);

            gfx.fillStyle(spec.color, spec.alpha * fade);
            gfx.fillEllipse(x, drawnY, radius * 2, radius * 2 * (flip < 0 ? MENU_POOL_SQUASH : 1));
        }
    }

    /** The surface, and what it gives back. */
    private drawPool (): void
    {
        const gfx = this.pool;

        //  Darkened first, so the reflection sits *in* something.
        gfx.fillStyle(0x000000, 0.28);
        gfx.fillRect(0, MENU_POOL_Y, GAME_WIDTH, GAME_HEIGHT - MENU_POOL_Y);

        for (const blob of MENU_BLOBS)
        {
            this.drawBlob(gfx, blob, -1, MENU_POOL_ALPHA);
        }

        //  Ripples, which is the whole difference between water and a mirror.
        //  Broad soft bands rather than hairlines: a one-pixel line drawn right
        //  across the screen reads as a scan line, not as water.
        for (let i = 0; i < MENU_RIPPLES; i++)
        {
            const t = i / MENU_RIPPLES;
            const y = MENU_POOL_Y + ((GAME_HEIGHT - MENU_POOL_Y) * t * t);

            //  Each band drifts on its own, and none of them spans the full
            //  width, so the surface never lines up into a grid.
            const sway = Math.sin((this.elapsed * 0.5) + (i * 1.7)) * 30;
            const half = GAME_WIDTH * (0.3 + (fraction(i * 4.3) * 0.3));

            gfx.fillStyle(0xbfe4ff, MENU_RIPPLE_ALPHA * (1 - t));
            gfx.fillEllipse(
                (GAME_WIDTH / 2) + sway,
                y,
                half * 2,
                MENU_RIPPLE_THICKNESS * (1 + t)
            );
        }

        //  A bright line right on the surface, which is what actually says
        //  "this is where one thing ends and another begins".
        gfx.lineStyle(1.5, 0xbfe4ff, 0.22);
        gfx.lineBetween(0, MENU_POOL_Y, GAME_WIDTH, MENU_POOL_Y);
    }

    /** Droplets rising through the field. */
    private drawDroplets (): void
    {
        const gfx = this.droplets;

        for (const seed of this.dropletSeeds)
        {
            //  Each runs its own loop from below the pool to above the top.
            const t = (seed.phase + ((this.elapsed * MENU_DROPLET_RISE) / GAME_HEIGHT)) % 1;
            const y = GAME_HEIGHT - (t * GAME_HEIGHT * 1.1);
            const x = seed.x + (Math.sin((this.elapsed * 0.5) + seed.phase * 9) * seed.drift);

            //  Fading out at both ends of the run, so none of them pops.
            const fade = Math.min(1, Math.min(t, 1 - t) * 6);

            gfx.fillStyle(0xbfe8ff, MENU_DROPLET_ALPHA * fade * 0.5);
            gfx.fillCircle(x, y, seed.size);

            gfx.fillStyle(0xffffff, MENU_DROPLET_ALPHA * fade);
            gfx.fillCircle(x - (seed.size * 0.3), y - (seed.size * 0.35), seed.size * 0.34);
        }
    }
}

/** Deterministic 0..1 from an index. */
function fraction (n: number): number
{
    const value = Math.sin(n * 127.1) * 43758.5453;

    return value - Math.floor(value);
}
