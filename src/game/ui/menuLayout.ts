import { BUTTON_GAP, BUTTON_HEIGHT, GAME_HEIGHT } from '../config/constants';
import { MENU_POOL_Y, TITLE_REFLECT_GAP, TITLE_REFLECT_SQUASH } from '../config/menuTheme';

/**
 * Where everything on the home screen sits.
 *
 * Pure, and separate from the scene that draws it, because "the composition is
 * balanced" is a claim and claims should be checkable. Laid out as fractions of
 * the screen rather than pixels so the whole arrangement scales together, and
 * returned as one object so the relationships between the pieces - the gap
 * under the drop, the space the buttons breathe in - are visible in one place
 * instead of scattered across a create method.
 *
 * The screen reads top to bottom as one sentence: a drop, its name, what it
 * does, and the way in. Everything above the waterline is the identity and
 * everything at or below it is the furniture.
 */
export interface MenuLayout
{
    /** Centre of the drop, which is the first thing the eye lands on. */
    dropY: number;

    /** Baseline of the small word, and centre of the large one below it. */
    markTopY: number;
    markMainY: number;

    taglineY: number;

    /** Centres of the two buttons. */
    playY: number;
    levelsY: number;

    /** The energy meter, which sits in the reflection rather than above it. */
    meterY: number;
}

export const MENU_LAYOUT: MenuLayout = {
    //  High, and with real air under it. The drop used to sit at 0.30 with the
    //  title immediately beneath, which read as an icon with a caption.
    dropY: GAME_HEIGHT * 0.205,

    markTopY: GAME_HEIGHT * 0.320,
    markMainY: GAME_HEIGHT * 0.418,

    //  Clear of the wordmark's reflection, which hangs below the big word and
    //  is part of the composition rather than an effect painted over it.
    taglineY: GAME_HEIGHT * 0.555,

    playY: GAME_HEIGHT * 0.635,
    levelsY: (GAME_HEIGHT * 0.635) + BUTTON_HEIGHT + BUTTON_GAP,

    meterY: GAME_HEIGHT * 0.875
};

/** A block of the screen something occupies, for checking nothing collides. */
export interface Band
{
    name: string;
    top: number;
    bottom: number;
}

/**
 * What each element actually covers, given how tall it is.
 *
 * Taken as measured heights rather than assumed, because text height depends on
 * the font the browser resolved and the only honest answer comes from the
 * objects themselves. The scene passes in what it measured; the test passes in
 * the sizes the theme asks for.
 */
export function bandsOf (heights: {
    drop: number;
    markTop: number;
    markMain: number;
    tagline: number;
}): Band[]
{
    const half = (h: number) => h / 2;

    //  The reflection hangs below the big word, mirrored and squashed. It is
    //  laid out here rather than left to the mark that draws it, because it
    //  takes up room on the screen like everything else does - the first
    //  version of this layout forgot that and put a ghost of FLOW straight
    //  through the tagline.
    const reflectionTop = MENU_LAYOUT.markMainY + half(heights.markMain) + TITLE_REFLECT_GAP;

    return [
        { name: 'drop', top: MENU_LAYOUT.dropY - half(heights.drop), bottom: MENU_LAYOUT.dropY + half(heights.drop) },
        { name: 'mark top', top: MENU_LAYOUT.markTopY - half(heights.markTop), bottom: MENU_LAYOUT.markTopY + half(heights.markTop) },
        { name: 'mark main', top: MENU_LAYOUT.markMainY - half(heights.markMain), bottom: MENU_LAYOUT.markMainY + half(heights.markMain) },
        { name: 'mark reflection', top: reflectionTop, bottom: reflectionTop + (heights.markMain * TITLE_REFLECT_SQUASH) },
        { name: 'tagline', top: MENU_LAYOUT.taglineY - half(heights.tagline), bottom: MENU_LAYOUT.taglineY + half(heights.tagline) },
        { name: 'play', top: MENU_LAYOUT.playY - half(BUTTON_HEIGHT), bottom: MENU_LAYOUT.playY + half(BUTTON_HEIGHT) },
        { name: 'levels', top: MENU_LAYOUT.levelsY - half(BUTTON_HEIGHT), bottom: MENU_LAYOUT.levelsY + half(BUTTON_HEIGHT) }
    ];
}

/** Where the waterline falls, which everything above it has to stay clear of. */
export const MENU_WATERLINE = MENU_POOL_Y;
