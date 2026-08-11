import { Scene } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HORIZON_Y } from '../config/constants';
import { LayerSpec, SpeckSpec, WorldSpec } from '../config/worlds';
import { seeded } from './noise';
import { drawSilhouette } from './silhouettes';

const SKY_BANDS = 40;
const SKY_DEPTH = -100;
const STAR_DEPTH = -99;
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
        this.drawStars();
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

    /**
     * A scatter of stars across the sky, in the worlds dark enough to show them.
     *
     * Drawn once into their own Graphics and never touched again: they are the
     * furthest thing in the world, and anything that far away does not move.
     */
    private drawStars (): void
    {
        const spec = this.world.stars;

        if (spec === undefined) { return; }

        const gfx = this.scene.add.graphics();

        gfx.setDepth(STAR_DEPTH);
        gfx.fillStyle(spec.color, spec.alpha);

        const random = seeded(61);

        for (let i = 0; i < spec.count; i++)
        {
            //  Kept off the horizon, where the haze would swallow them anyway.
            const y = random() * HORIZON_Y * 0.86;

            //  Smaller ones are commoner, which is what a real sky looks like.
            gfx.fillCircle(random() * GAME_WIDTH, y, 0.7 + (random() * random() * 1.6));
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

        //  Centred on the horizon and fading both ways, so the ground meets the
        //  sky in air rather than on a hard line.
        const bands = 22;
        const height = GAME_HEIGHT * 0.30;
        const top = HORIZON_Y - (height / 2);

        for (let i = 0; i < bands; i++)
        {
            const t = i / (bands - 1);
            const fade = 1 - Math.abs((t * 2) - 1);

            gfx.fillStyle(this.world.hazeColor, this.world.hazeAlpha * fade);
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

        //  Three tiles side by side: one on screen, one either side, so the
        //  layer can scroll a full tile before wrapping without a seam showing.
        for (let tile = -1; tile <= 1; tile++)
        {
            drawSilhouette(gfx, layer, tile * layer.wrap);
        }

        gfx.setData('wrap', layer.wrap);
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
            const wrap = layer.getData('wrap') as number;
            const parallax = layer.getData('parallax') as number;

            //  Sideways, in the direction the road leans, so the world turns
            //  past the camera as the drop travels along it.
            layer.x = -((distance * parallax) % wrap);
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
