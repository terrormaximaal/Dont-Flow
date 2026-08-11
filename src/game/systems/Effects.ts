import { Scene } from 'phaser';
import {
    BLOOM_DURATION,
    BLOOM_MOTES,
    BLOOM_SIZE,
    BLOOM_SPREAD,
    DEPTH_FX,
    SWALLOW_DURATION,
    SWALLOW_LENGTH,
    SWALLOW_SPREAD,
    SWALLOW_STAGGER,
    SWALLOW_STRANDS,
    SWALLOW_THICKNESS
} from '../config/constants';

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
