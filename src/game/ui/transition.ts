import { Scene } from 'phaser';
import { DEPTH_OVERLAY, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { LEAVE_FADE_MS } from '../config/menuTheme';

/**
 * Moving between screens without cutting.
 *
 * Every screen change in the game used to be a hard cut, and a cut between two
 * completely different pictures does not read as a transition - it reads as the
 * game restarting. A pair of short washes fixes it: the screen being left fades
 * down to black and the screen being arrived at fades up from it, so the two
 * halves join into one move.
 *
 * The two halves are separate calls on purpose. They happen in different scenes
 * and the second one has no idea the first one occurred, which is exactly the
 * situation a shared helper is for - the alternative is every scene owning its
 * own rectangle and its own timing, which is how the timings drift apart.
 *
 * @see LEAVE_FADE_MS for how long a wash lasts, and why it is short.
 */

/**
 * A depth above everything, including the overlays.
 *
 * The pause overlay and the completion panel both sit at DEPTH_OVERLAY, and a
 * transition has to cover them too - a fade that leaves the panel it was
 * started from floating on top is worse than no fade at all.
 */
const WASH_DEPTH = DEPTH_OVERLAY + 100;

/** Guards, one per scene, so two presses cannot start two transitions. */
const leaving = new WeakSet<Scene>();

/**
 * Fades the screen down and then does the thing.
 *
 * Guarded: the scene keeps taking input while the wash runs, so without this a
 * second tap during those few hundred milliseconds starts a second scene. The
 * guard is held against the scene rather than in it, so every caller gets it
 * without having to remember a flag.
 *
 * Idempotent from the caller's side - a second call while one is running is
 * simply ignored, which is the behaviour every button wants.
 */
export function leaveTo (scene: Scene, go: () => void): void
{
    if (leaving.has(scene))
    {
        return;
    }

    leaving.add(scene);

    const wash = scene.add.rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        0
    );

    wash.setDepth(WASH_DEPTH);

    scene.tweens.add({
        targets: wash,
        fillAlpha: 1,
        duration: LEAVE_FADE_MS,
        ease: 'Quad.In',
        onComplete: () => {

            //  Released before leaving, because a restarted scene is the same
            //  object: without this, a level retried once could never be
            //  retried again.
            leaving.delete(scene);

            go();

        }
    });
}

/**
 * Fades the screen up from black.
 *
 * Called at the end of a scene's create, once everything it draws exists. The
 * rectangle starts opaque and covers the first frame, so whatever the scene
 * does on its way up - laying out a level, seeding a sky - is never seen
 * half-finished.
 *
 * Slightly quicker than the wash out. Arriving should feel like the screen
 * catching up with the player rather than the player waiting for it.
 */
export function arrive (scene: Scene): void
{
    //  A fresh scene has no business inheriting a guard from the last time it
    //  ran, and a scene that is restarted rather than started never gets a
    //  chance to clear one otherwise.
    leaving.delete(scene);

    const wash = scene.add.rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        1
    );

    wash.setDepth(WASH_DEPTH);

    scene.tweens.add({
        targets: wash,
        fillAlpha: 0,
        duration: LEAVE_FADE_MS * 0.8,
        ease: 'Quad.Out',
        onComplete: () => wash.destroy()
    });
}
