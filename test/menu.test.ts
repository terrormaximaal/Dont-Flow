import { describe, expect, it } from 'vitest';
import {
    BUTTON_GAP,
    BUTTON_HEIGHT,
    GAME_HEIGHT,
    MUTE_LINE,
    MUTE_MARGIN,
    CHIP_HEIGHT,
    CHIP_LABEL_SIZE,
    CHIP_WIDTH,
    TITLE_DROP_RADIUS,
    TITLE_TAGLINE_SIZE
} from '../src/game/config/constants';
import {
    ENTER_BUTTON_MS,
    ENTER_BUTTON_STAGGER,
    ENTER_DROP_MS,
    ENTER_MARK_MS,
    ENTER_MARK_STAGGER,
    ENTER_TOTAL_MS,
    LEAVE_FADE_MS,
    TITLE_MAIN_SIZE,
    TITLE_TOP_SIZE
} from '../src/game/config/menuTheme';
import { bandsOf, MENU_LAYOUT, MENU_WATERLINE } from '../src/game/ui/menuLayout';
import { MENU_DROP_CYCLE, MENU_DROP_DWELL, menuDropColor } from '../src/game/ui/menuDrop';
import { TAGLINE } from '../src/game/ui/taglines';

/**
 * What each element covers, using the sizes the theme asks for.
 *
 * Text renders a little taller than its point size, so these are deliberate
 * over-estimates: a layout that clears at 1.3x the nominal height clears at the
 * real height too.
 */
const BANDS = bandsOf({
    drop: TITLE_DROP_RADIUS * 2.6,
    markTop: TITLE_TOP_SIZE * 1.3,
    markMain: TITLE_MAIN_SIZE * 1.3,
    tagline: TITLE_TAGLINE_SIZE * 1.3
});

describe('the home screen composition', () => {

    it('keeps every element on the screen', () => {

        for (const band of BANDS)
        {
            expect(band.top, `${band.name} off the top`).toBeGreaterThan(0);
            expect(band.bottom, `${band.name} off the bottom`).toBeLessThan(GAME_HEIGHT);
        }

    });

    it('never lets two elements overlap', () => {

        const ordered = [ ...BANDS ].sort((a, b) => a.top - b.top);

        for (let i = 1; i < ordered.length; i++)
        {
            expect(ordered[i].top, `${ordered[i].name} into ${ordered[i - 1].name}`)
                .toBeGreaterThanOrEqual(ordered[i - 1].bottom);
        }

    });

    //  Everything that is the game's identity lives above the waterline, and
    //  the pool below it is the picture's floor. A button dipping into the
    //  reflection reads as a mistake rather than as a composition.
    it('keeps the whole arrangement above the waterline', () => {

        for (const band of BANDS)
        {
            expect(band.bottom, `${band.name} in the water`).toBeLessThanOrEqual(MENU_WATERLINE);
        }

    });

    //  The energy meter is the exception, on purpose: it is furniture rather
    //  than identity, and sitting it in the reflection is what keeps the
    //  bottom of the screen from being empty.
    it('sits the energy meter in the pool, below everything else', () => {

        expect(MENU_LAYOUT.meterY).toBeGreaterThan(MENU_WATERLINE);
        expect(MENU_LAYOUT.meterY).toBeLessThan(GAME_HEIGHT - 20);

    });

    it('reads top to bottom in the order it should', () => {

        const order = [
            MENU_LAYOUT.dropY,
            MENU_LAYOUT.markTopY,
            MENU_LAYOUT.markMainY,
            MENU_LAYOUT.taglineY,
            MENU_LAYOUT.playY,
            MENU_LAYOUT.levelsY,
            MENU_LAYOUT.meterY
        ];

        for (let i = 1; i < order.length; i++)
        {
            expect(order[i], `element ${i}`).toBeGreaterThan(order[i - 1]);
        }

    });

    //  A phone is held in one hand and pressed with one thumb. Two targets
    //  closer together than a finger is wide is how a player ends up in the
    //  level select when they meant to play.
    it('leaves a thumb\'s worth of space between the two buttons', () => {

        expect(MENU_LAYOUT.levelsY - MENU_LAYOUT.playY).toBeGreaterThanOrEqual(BUTTON_HEIGHT + BUTTON_GAP);
        expect(BUTTON_HEIGHT).toBeGreaterThanOrEqual(44);

    });

    //  The drop is the subject. The old screen sat it directly on top of the
    //  title with no gap, which read as an icon with a caption underneath.
    it('gives the drop air of its own under it', () => {

        const drop = BANDS.find((b) => b.name === 'drop');
        const mark = BANDS.find((b) => b.name === 'mark top');

        expect(mark!.top - drop!.bottom).toBeGreaterThan(24);

    });

    //  Two lines at the same size are two lines; the size difference is what
    //  makes it a lockup rather than a sentence that wrapped.
    it('sets the two words of the mark at clearly different sizes', () => {

        expect(TITLE_MAIN_SIZE).toBeGreaterThan(TITLE_TOP_SIZE * 2);

    });

});

describe('the switches in the corner', () => {

    //  These were laid out as type and never as controls: a 13px label whose
    //  hit area was its own glyph box, fourteen pixels tall, with six pixels
    //  between it and a switch that does something entirely different. Nothing
    //  looked wrong, because the buttons on the same screen are 246 by 62. It
    //  took measuring the hit areas to see it.
    //
    //  They are drawn pills now rather than words with an invisible area behind
    //  them, so these read the pill - which is also what the player sees, and
    //  the only version of this guard that cannot be orphaned by a redraw. It
    //  was: the switches became chips and these went on measuring two constants
    //  nothing had read since.
    it('answer to a finger rather than to the size of their own type', () => {

        const type = Number.parseInt(CHIP_LABEL_SIZE, 10);

        expect(CHIP_HEIGHT, 'touch height against type size').toBeGreaterThan(type * 3);
        expect(CHIP_WIDTH, 'touch width').toBeGreaterThan(CHIP_HEIGHT * 2);

    });

    //  The reason the line spacing is what it is. Two adjacent switches whose
    //  areas overlap are worse than two small ones: the player does not get the
    //  thing they aimed at, and one of these two is the setting that some
    //  players cannot read the game without.
    it('are spaced so that neither can be hit by aiming at the other', () => {

        expect(MUTE_LINE, 'line spacing against touch height').toBeGreaterThanOrEqual(CHIP_HEIGHT);

    });

    //  And the pair still has to stay out of the composition. This is the
    //  ceiling on how big they can be: the drop is the first thing the eye
    //  lands on and a switch reaching into it would be a worse trade.
    it('stay clear of the drop above the wordmark', () => {

        //  The bottom of the lower pill, which hangs one line below the margin.
        const lowest = MUTE_MARGIN + MUTE_LINE + CHIP_HEIGHT;

        expect(lowest, 'bottom of the lower switch').toBeLessThan(MENU_LAYOUT.dropY - TITLE_DROP_RADIUS);

    });

});

describe('the tagline', () => {

    it('is short enough to read at a glance', () => {

        expect(TAGLINE.length).toBeLessThanOrEqual(28);

    });

    //  It sets as two balanced halves under a two-line wordmark. One long
    //  clause would fight the mark above it.
    it('breaks into two halves of roughly equal weight', () => {

        const halves = TAGLINE.split('.').filter((part) => part.trim().length > 0);

        expect(halves).toHaveLength(2);

        const [ first, second ] = halves.map((part) => part.trim().length);

        expect(Math.abs(first - second)).toBeLessThanOrEqual(6);

    });

    //  It should promise a feeling, not explain a rule. The old one named a
    //  mechanic the player has not met yet.
    it('does not lean on words that only mean something after playing', () => {

        expect(TAGLINE.toUpperCase()).not.toContain('COMBO');
        expect(TAGLINE.toUpperCase()).not.toContain('LANE');

    });

});

describe('the drop\'s colour on the home screen', () => {

    it('has an answer at any moment, including before it started', () => {

        for (let t = -40; t < 400; t += 0.37)
        {
            const color = menuDropColor(t);

            expect(Number.isInteger(color), `at ${t}`).toBe(true);
            expect(color, `at ${t}`).toBeGreaterThanOrEqual(0);
            expect(color, `at ${t}`).toBeLessThanOrEqual(0xffffff);
        }

    });

    it('sits exactly on a palette colour at the start of each dwell', () => {

        for (let i = 0; i < MENU_DROP_CYCLE.length; i++)
        {
            expect(menuDropColor(i * MENU_DROP_DWELL)).toBe(MENU_DROP_CYCLE[i]);
        }

    });

    it('comes back round rather than running out', () => {

        expect(menuDropColor(0)).toBe(menuDropColor(MENU_DROP_CYCLE.length * MENU_DROP_DWELL));

    });

    //  Smoothstep rather than linear: each colour is held for a moment at both
    //  ends of its span instead of being passed straight through, because the
    //  muddle between two colours is where a palette looks worst.
    it('lingers on each colour rather than crossing at a constant rate', () => {

        const from = MENU_DROP_CYCLE[0];

        const early = distance(menuDropColor(MENU_DROP_DWELL * 0.15), from);
        const middle = distance(menuDropColor(MENU_DROP_DWELL * 0.5), from);

        //  A linear blend would put the 15% sample at 15% of the way across.
        expect(early).toBeLessThan(middle * 0.25);

    });

    it('never jumps a long way between one frame and the next', () => {

        //  A cycle ordered around the wheel travels; one in palette order
        //  flickers. Sampled at 60fps, no step may be a visible cut.
        for (let t = 0; t < MENU_DROP_CYCLE.length * MENU_DROP_DWELL; t += 1 / 60)
        {
            expect(distance(menuDropColor(t), menuDropColor(t + (1 / 60))), `at ${t.toFixed(2)}`)
                .toBeLessThan(12);
        }

    });

});

describe('arriving and leaving', () => {

    //  A home screen that takes a second and a half to assemble itself is a
    //  screen the player waits through on every single launch.
    it('finishes arriving before anyone could get bored', () => {

        const lastMark = (ENTER_DROP_MS * 0.55) + (2 * ENTER_MARK_STAGGER) + ENTER_MARK_MS;
        const lastButton = (ENTER_DROP_MS * 0.7) + 180 + ENTER_BUTTON_STAGGER + ENTER_BUTTON_MS;

        expect(Math.max(lastMark, lastButton)).toBeLessThanOrEqual(ENTER_TOTAL_MS);

    });

    //  Long enough to be a transition, short enough that nobody waiting to
    //  play notices they waited.
    it('leaves on a wash rather than a cut, and a brief one', () => {

        expect(LEAVE_FADE_MS).toBeGreaterThanOrEqual(150);
        expect(LEAVE_FADE_MS).toBeLessThanOrEqual(400);

    });

});

/** How far apart two colours are, as the largest channel difference. */
function distance (a: number, b: number): number
{
    return Math.max(
        Math.abs(((a >> 16) & 0xff) - ((b >> 16) & 0xff)),
        Math.abs(((a >> 8) & 0xff) - ((b >> 8) & 0xff)),
        Math.abs((a & 0xff) - (b & 0xff))
    );
}
