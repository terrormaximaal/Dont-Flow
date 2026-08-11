import { Scene } from 'phaser';
import {
    BLOOM_DURATION,
    BLOOM_MOTES,
    BLOOM_SIZE,
    BLOOM_SPREAD,
    DEPTH_FX,
    DROP_SCREEN_Y,
    GAME_HEIGHT,
    GATE_ZOOM,
    GATE_ZOOM_IN_MS,
    GATE_ZOOM_OUT_MS,
    SWALLOW_DURATION,
    SWALLOW_LENGTH,
    SWALLOW_SPREAD,
    SWALLOW_STAGGER,
    SWALLOW_STRANDS,
    SWALLOW_THICKNESS,
    TRACK_LEFT,
    TRACK_WIDTH,
    WAVE_ALPHA,
    WAVE_DURATION,
    WAVE_THICKNESS
} from '../config/constants';
import { depthScale, fillProjectedQuad } from './Projection';

const TAU = Math.PI * 2;

/**
 * Short-lived feedback: the swallow and haptics.
 *
 * Built from plain shapes and tweens rather than Phaser's particle emitter,
 * which would need a texture - and this game ships no image assets.
 */
export class Effects
{
    private readonly scene: Scene;

    constructor (scene: Scene)
    {
        this.scene = scene;
    }

    /**
     * An orb being absorbed: strands of its colour collapse into the point where
     * it met the drop.
     *
     * Inwards rather than outwards on purpose. The drop does not break an orb,
     * it takes it in, and a burst says the opposite. Contact happens once the
     * orb has arrived, so there is no approach to animate - the strands start in
     * a ring around the meeting point instead.
     */
    swallow (x: number, y: number, color: number): void
    {
        for (let i = 0; i < SWALLOW_STRANDS; i++)
        {
            //  Even spread with a little jitter, so it does not look stamped.
            const angle = ((i / SWALLOW_STRANDS) * TAU) + ((Math.random() - 0.5) * 0.5);

            const startX = x + (Math.cos(angle) * SWALLOW_SPREAD);
            const startY = y + (Math.sin(angle) * SWALLOW_SPREAD);

            const strand = this.scene.add.ellipse(startX, startY, SWALLOW_LENGTH, SWALLOW_THICKNESS, color);

            strand.setDepth(DEPTH_FX);

            //  Lying along the way in, so each strand is a streak rather than a
            //  dot sliding sideways.
            strand.setRotation(angle);

            this.scene.tweens.add({
                targets: strand,
                x,
                y,
                scaleX: 0.25,
                scaleY: 0.25,
                alpha: 0,
                //  Away from the ring at once and easing as it merges. Holding
                //  the strands out there first - which is what accelerating in
                //  does - just reads as a spiky crown around the drop, because
                //  that is where they spend most of the frames.
                ease: 'Quad.Out',
                duration: SWALLOW_DURATION + (Math.random() * SWALLOW_STAGGER),
                onComplete: () => strand.destroy()
            });
        }
    }

    /**
     * A puff of colour thrown outwards, for the moment the drop is repainted.
     *
     * Outwards, unlike the swallow: the drop is not taking this colour in, it
     * is shedding the one it was. Small and quick - the gate itself is the
     * event, and this only has to say that the drop noticed.
     */
    bloom (x: number, y: number, color: number): void
    {
        for (let i = 0; i < BLOOM_MOTES; i++)
        {
            const angle = ((i / BLOOM_MOTES) * TAU) + ((Math.random() - 0.5) * 0.6);

            const mote = this.scene.add.circle(x, y, BLOOM_SIZE / 2, color);

            mote.setDepth(DEPTH_FX);

            this.scene.tweens.add({
                targets: mote,
                x: x + (Math.cos(angle) * BLOOM_SPREAD),
                y: y + (Math.sin(angle) * BLOOM_SPREAD),
                scale: 0.2,
                alpha: 0,
                ease: 'Quad.Out',
                duration: BLOOM_DURATION,
                onComplete: () => mote.destroy()
            });
        }
    }

    /**
     * A band of light sweeping down the road, thrown back as a gate is crossed.
     *
     * Widening as it comes, because the road does: a band that kept its width
     * would read as an object flying at the camera rather than as light running
     * along the surface.
     */
    wave (color: number): void
    {
        const gfx = this.scene.add.graphics();

        gfx.setDepth(DEPTH_FX);

        //  Drawn as a projected quad each frame rather than a rectangle being
        //  scaled. A scaled rectangle only matches the road at the width it
        //  started from: tweening it wide enough to cover the near end left it
        //  spilling past both edges on the way down, which reads as a bar
        //  across the screen instead of light running over a surface.
        const sweep = { at: DROP_SCREEN_Y };

        this.scene.tweens.add({
            targets: sweep,
            at: GAME_HEIGHT + WAVE_THICKNESS,
            ease: 'Quad.In',
            duration: WAVE_DURATION,
            onUpdate: (tween) => {

                const near = sweep.at;
                const far = near - (WAVE_THICKNESS * depthScale(near));

                gfx.clear();
                gfx.fillStyle(color, WAVE_ALPHA * (1 - tween.progress));

                fillProjectedQuad(gfx, TRACK_LEFT, TRACK_LEFT + TRACK_WIDTH, far, near);

            },
            onComplete: () => gfx.destroy()
        });
    }

    /**
     * A short punch of the camera. Deliberately a zoom rather than a shake: a
     * shake fights the player for control of a moving target.
     */
    punch (camera: Phaser.Cameras.Scene2D.Camera): void
    {
        //  Tweened rather than handed to camera.zoomTo, for two reasons. The
        //  camera effect resolves its ease differently from a tween - it takes
        //  an exact EaseMap key only, so the 'Quad.Out' that every tween here
        //  accepts leaves its ease undefined and it throws on the first frame.
        //  And starting the second zoom from inside the first one's progress
        //  callback re-enters an effect that is still finishing.
        this.scene.tweens.add({
            targets: camera,
            zoom: GATE_ZOOM,
            ease: 'Quad.Out',
            duration: GATE_ZOOM_IN_MS,
            yoyo: true,
            hold: 0,
            //  Back out more slowly than in, which is what makes it a punch
            //  rather than a bounce.
            onYoyo: (tween) => { tween.duration = GATE_ZOOM_OUT_MS; },
            onComplete: () => { camera.setZoom(1); }
        });
    }

    /**
     * A haptic tap. Unsupported on iOS Safari and on desktop, where it is a
     * silent no-op rather than an error.
     */
    haptic (duration: number): void
    {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
        {
            navigator.vibrate(duration);
        }
    }
}
