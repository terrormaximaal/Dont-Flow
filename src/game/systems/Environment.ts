import { Scene } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { LayerShape, LayerSpec, SpeckSpec, WorldSpec } from '../config/worlds';

const SKY_BANDS = 40;
const SKY_DEPTH = -100;
const HAZE_DEPTH = -95;
const CELESTIAL_DEPTH = -94;
const LAYER_DEPTH = -90;
const SPECK_DEPTH = -20;
const FLASH_DEPTH = -10;

/** Drawn wider than the screen so a layer's ends are never visible. */
const BLEED = 80;

const LIGHTNING_MIN_MS = 4200;
const LIGHTNING_MAX_MS = 11000;
const LIGHTNING_ALPHA = 0.22;
const LIGHTNING_FADE_MS = 240;

/**
 * A small deterministic generator, so a world looks the same every time it is
 * played without any of it being stored.
 */
function seeded (seed: number): () => number
{
    let state = (seed * 1103515245 + 12345) & 0x7fffffff;

    return () => {

        state = (state * 1103515245 + 12345) & 0x7fffffff;

        return state / 0x7fffffff;

    };
}

/**
 * The world behind the corridor: a sky, silhouette layers that scroll at their
 * own rates, drifting particles and, in one world, lightning.
 *
 * Each layer's silhouette is drawn once into its own Graphics as a tall strip
 * and then only moved, so a frame costs one y assignment per layer rather than
 * a redraw. Nothing here is an image asset.
 *
 * Everything sits behind the track's depth and is deliberately low contrast:
 * the environment gives a level its identity, and must never make an orb or a
 * barrier harder to read.
 */
export class Environment
{
    private readonly scene: Scene;
    private readonly world: WorldSpec;

    private readonly layers: Phaser.GameObjects.Graphics[] = [];
    private readonly specks: Phaser.GameObjects.Graphics | null = null;
    private readonly flash: Phaser.GameObjects.Rectangle | null = null;

    private readonly speckSeeds: Array<{ x: number; y: number; speed: number }> = [];

    private nextLightning = 0;

    constructor (scene: Scene, world: WorldSpec)
    {
        this.scene = scene;
        this.world = world;

        this.drawSky();
        this.drawCelestial();
        this.drawHaze();

        for (const layer of world.layers)
        {
            this.layers.push(this.buildLayer(layer));
        }

        if (world.specks)
        {
            this.specks = scene.add.graphics();
            this.specks.setDepth(SPECK_DEPTH);

            this.seedSpecks(world.specks);
        }

        if (world.lightning)
        {
            this.flash = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0);
            this.flash.setDepth(FLASH_DEPTH);

            this.nextLightning = LIGHTNING_MIN_MS;
        }
    }

    /** A banded vertical gradient - Graphics has no gradient fill of its own. */
    private drawSky (): void
    {
        const gfx = this.scene.add.graphics();

        gfx.setDepth(SKY_DEPTH);

        const top = this.world.skyTop;
        const bottom = this.world.skyBottom;
        const bandHeight = Math.ceil(GAME_HEIGHT / SKY_BANDS);

        for (let i = 0; i < SKY_BANDS; i++)
        {
            const t = i / (SKY_BANDS - 1);

            gfx.fillStyle(blend(top, bottom, t), 1);
            gfx.fillRect(0, i * bandHeight, GAME_WIDTH, bandHeight + 1);
        }
    }

    private drawCelestial (): void
    {
        const { orbColor, orbRadius, orbX, orbY, orbAlpha } = this.world;

        if (orbColor === undefined || orbRadius === undefined) { return; }

        const disc = this.scene.add.circle(orbX ?? GAME_WIDTH / 2, orbY ?? 200, orbRadius, orbColor, orbAlpha ?? 0.6);

        disc.setDepth(CELESTIAL_DEPTH);
    }

    /** A soft band where the layers meet the sky, which reads as distance. */
    private drawHaze (): void
    {
        const gfx = this.scene.add.graphics();

        gfx.setDepth(HAZE_DEPTH);

        const bands = 14;
        const height = GAME_HEIGHT * 0.42;
        const top = GAME_HEIGHT * 0.18;

        for (let i = 0; i < bands; i++)
        {
            const t = i / (bands - 1);

            gfx.fillStyle(this.world.hazeColor, this.world.hazeAlpha * (1 - t));
            gfx.fillRect(0, top + (t * height), GAME_WIDTH, (height / bands) + 1);
        }
    }

    /**
     * One silhouette layer, drawn as a strip tall enough to wrap: the profile
     * is repeated down the strip so scrolling it never reveals an end.
     */
    private buildLayer (layer: LayerSpec): Phaser.GameObjects.Graphics
    {
        const gfx = this.scene.add.graphics();

        gfx.setDepth(LAYER_DEPTH + layer.parallax);

        const copies = Math.ceil((GAME_HEIGHT + layer.repeat) / layer.repeat) + 1;

        for (let copy = 0; copy < copies; copy++)
        {
            drawSilhouette(gfx, layer, copy * layer.repeat);
        }

        gfx.setData('repeat', layer.repeat);
        gfx.setData('parallax', layer.parallax);

        return gfx;
    }

    private seedSpecks (spec: SpeckSpec): void
    {
        const random = seeded(97);

        for (let i = 0; i < spec.count; i++)
        {
            this.speckSeeds.push({
                x: random() * (GAME_WIDTH + BLEED * 2) - BLEED,
                y: random() * GAME_HEIGHT,
                speed: 0.6 + (random() * 0.8)
            });
        }
    }

    /**
     * @param distance Track distance travelled, which drives the parallax.
     * @param delta    Frame time in ms, for effects on their own clock.
     */
    update (distance: number, delta: number): void
    {
        for (const layer of this.layers)
        {
            const repeat = layer.getData('repeat') as number;
            const parallax = layer.getData('parallax') as number;

            //  Positive so the scenery falls past as the drop travels forward.
            layer.y = ((distance * parallax) % repeat) - repeat;
        }

        if (this.specks && this.world.specks)
        {
            this.drawSpecks(this.world.specks, distance);
        }

        if (this.flash)
        {
            this.updateLightning(delta);
        }
    }

    private drawSpecks (spec: SpeckSpec, distance: number): void
    {
        const gfx = this.specks!;
        const span = GAME_HEIGHT + BLEED * 2;

        gfx.clear();
        gfx.fillStyle(spec.color, spec.alpha);
        gfx.lineStyle(spec.radius, spec.color, spec.alpha);

        for (const speck of this.speckSeeds)
        {
            //  Driven by distance travelled rather than wall-clock, so particles
            //  stop when the run is paused and stay with the world's motion.
            const fall = (distance * (spec.fall / 100) * speck.speed) + speck.y;
            const y = ((fall % span) + span) % span - BLEED;
            const x = speck.x + (Math.sin((y + speck.x) * 0.01) * spec.drift * 0.4);

            if (spec.streak)
            {
                gfx.lineBetween(x, y, x - (spec.drift * 0.06 * spec.streak), y + spec.streak);
            }
            else
            {
                gfx.fillCircle(x, y, spec.radius * speck.speed);
            }
        }
    }

    private updateLightning (delta: number): void
    {
        this.nextLightning -= delta;

        if (this.nextLightning > 0) { return; }

        const flash = this.flash!;

        this.nextLightning = LIGHTNING_MIN_MS + (Math.random() * (LIGHTNING_MAX_MS - LIGHTNING_MIN_MS));

        flash.setAlpha(LIGHTNING_ALPHA);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: LIGHTNING_FADE_MS,
            ease: 'Quad.Out'
        });
    }
}

/** Mixes two packed RGB colours. */
function blend (from: number, to: number, t: number): number
{
    const fr = (from >> 16) & 0xff;
    const fg = (from >> 8) & 0xff;
    const fb = from & 0xff;

    const tr = (to >> 16) & 0xff;
    const tg = (to >> 8) & 0xff;
    const tb = to & 0xff;

    const r = Math.round(fr + ((tr - fr) * t));
    const g = Math.round(fg + ((tg - fg) * t));
    const b = Math.round(fb + ((tb - fb) * t));

    return (r << 16) | (g << 8) | b;
}

/**
 * Draws one repeat of a layer's profile at a vertical offset.
 *
 * Every shape is built from the same idea - a baseline with something standing
 * on it - so a world's character comes from the silhouette rather than from
 * anything expensive.
 */
function drawSilhouette (gfx: Phaser.GameObjects.Graphics, layer: LayerSpec, offset: number): void
{
    const random = seeded(layer.seed + offset);
    const base = layer.baseline + offset;

    gfx.fillStyle(layer.color, layer.alpha);

    const shape: LayerShape = layer.shape;

    if (shape === 'blobs')
    {
        for (let x = -BLEED; x < GAME_WIDTH + BLEED; x += layer.period * (0.5 + random() * 0.5))
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
        for (let x = -BLEED; x < GAME_WIDTH + BLEED; x += layer.period)
        {
            const w = layer.period * (0.55 + random() * 0.35);
            const h = layer.height * (0.35 + random() * 0.75);

            gfx.fillRect(x, base - h, w, h);
        }

        return;
    }

    if (shape === 'trees')
    {
        for (let x = -BLEED; x < GAME_WIDTH + BLEED; x += layer.period * (0.6 + random() * 0.6))
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
        for (let x = -BLEED; x < GAME_WIDTH + BLEED; x += layer.period)
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
        for (let x = -BLEED; x < GAME_WIDTH + BLEED; x += layer.period * (0.6 + random() * 0.7))
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

    for (let x = -BLEED; x < GAME_WIDTH + BLEED; x += layer.period)
    {
        const w = layer.period * (0.85 + random() * 0.5);
        const h = layer.height * (0.45 + random() * 0.8);
        const peak = x + (w / 2) + ((random() - 0.5) * w * 0.3 * sharpness);

        if (sharpness > 0.8)
        {
            gfx.fillTriangle(x, base, peak, base - h, x + w, base);
        }
        else
        {
            //  Rounded: a wide arc sitting on the baseline.
            gfx.fillEllipse(peak, base, w * (1 + (1 - sharpness)), h * 2);
            gfx.fillRect(x, base - 1, w, 2);
        }
    }
}
