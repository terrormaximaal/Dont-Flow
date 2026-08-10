import { describe, expect, it } from 'vitest';
import { SWIPE_DOMINANCE, SWIPE_REANCHOR_DISTANCE, SWIPE_THRESHOLD } from '../src/game/config/constants';
import { DragAnchor, evaluateDrag } from '../src/game/systems/swipe';

const from = (x = 100, y = 400): DragAnchor => ({ x, y });

describe('a horizontal drag', () => {

    it('does nothing until it passes the threshold', () => {

        const result = evaluateDrag(from(), 100 + SWIPE_THRESHOLD - 1, 400);

        expect(result.intent).toBe(0);

    });

    it('asks for the lane it moved towards', () => {

        expect(evaluateDrag(from(), 100 + SWIPE_THRESHOLD, 400).intent).toBe(1);
        expect(evaluateDrag(from(), 100 - SWIPE_THRESHOLD, 400).intent).toBe(-1);

    });

    it('re-anchors where it fired, so one drag can cross two lanes', () => {

        const first = evaluateDrag(from(), 140, 400);

        expect(first.intent).toBe(1);
        expect(first.anchor).toEqual({ x: 140, y: 400 });

        //  The second lane comes from moving another threshold's worth, not
        //  from the total distance since the finger landed.
        const second = evaluateDrag(first.anchor, 140 + SWIPE_THRESHOLD, 400);

        expect(second.intent).toBe(1);

    });

});

describe('a vertical drag', () => {

    it('does not steer', () => {

        //  Well past the threshold sideways, but much further down.
        const dy = SWIPE_THRESHOLD * 10;
        const dx = SWIPE_THRESHOLD + 2;

        expect(dx).toBeLessThan(dy * SWIPE_DOMINANCE);
        expect(evaluateDrag(from(), 100 + dx, 400 + dy).intent).toBe(0);

    });

    it('is measured afresh once it has wandered far enough', () => {

        const result = evaluateDrag(from(), 100, 400 + SWIPE_REANCHOR_DISTANCE);

        expect(result.intent).toBe(0);
        expect(result.anchor).toEqual({ x: 100, y: 400 + SWIPE_REANCHOR_DISTANCE });

    });

    it('keeps its anchor while the wander is still small', () => {

        const anchor = from();
        const result = evaluateDrag(anchor, 100, 400 + SWIPE_REANCHOR_DISTANCE - 1);

        expect(result.anchor).toBe(anchor);

    });

});

describe('a drag that starts downwards and then goes sideways', () => {

    //  The reason re-anchoring exists. Thumbs move in arcs: a swipe that begins
    //  with a downward drift used to be disqualified for the rest of the
    //  gesture, however far sideways it went, and the input simply died.
    it('still steers', () => {

        let anchor = from();

        //  The finger's real position, tracked independently of the anchor -
        //  the whole point is that the two come apart while dragging.
        let fingerX = 100;
        let fingerY = 400;

        //  Drag down the screen in steps, as a thumb would.
        for (let i = 0; i < 6; i++)
        {
            fingerY += 20;
            anchor = evaluateDrag(anchor, fingerX, fingerY).anchor;
        }

        //  Now sideways, from where the finger actually is.
        fingerX += SWIPE_THRESHOLD;

        const result = evaluateDrag(anchor, fingerX, fingerY);

        expect(result.intent).toBe(1);

    });

    it('does not steer mid-way through the downward part', () => {

        let anchor = from();
        const intents: number[] = [];

        for (let i = 1; i <= 6; i++)
        {
            const result = evaluateDrag(anchor, 100 + (i % 2), 400 + (i * 20));

            intents.push(result.intent);
            anchor = result.anchor;
        }

        expect(intents.every((intent) => intent === 0)).toBe(true);

    });

});
