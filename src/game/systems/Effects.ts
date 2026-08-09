import { Scene } from 'phaser';
import {
    BURST_DURATION,
    BURST_PARTICLES,
    BURST_PARTICLE_RADIUS,
    BURST_SPEED_MAX,
    BURST_SPEED_MIN,
    DEPTH_FX
} from '../config/constants';

const TAU = Math.PI * 2;

/**
 * Short-lived feedback: particle bursts and haptics.
 *
 * The burst is built from plain circles and tweens rather than Phaser's
 * particle emitter, which would need a texture - and this game ships no image
 * assets.
 */
export class Effects
{
    private readonly scene: Scene;

    constructor (scene: Scene)
    {
        this.scene = scene;
    }

    /**
     * A ring of particles thrown outwards from a point, fading as they go.
     */
    burst (x: number, y: number, color: number): void
    {
        for (let i = 0; i < BURST_PARTICLES; i++)
        {
            const particle = this.scene.add.circle(x, y, BURST_PARTICLE_RADIUS, color);

            particle.setDepth(DEPTH_FX);

            //  Even spread with a little jitter, so bursts do not look stamped.
            const angle = ((i / BURST_PARTICLES) * TAU) + (Math.random() - 0.5) * 0.4;
            const speed = BURST_SPEED_MIN + (Math.random() * (BURST_SPEED_MAX - BURST_SPEED_MIN));

            this.scene.tweens.add({
                targets: particle,
                x: x + (Math.cos(angle) * speed),
                y: y + (Math.sin(angle) * speed),
                alpha: 0,
                scale: 0.2,
                duration: BURST_DURATION,
                ease: 'Cubic.Out',
                onComplete: () => particle.destroy()
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
