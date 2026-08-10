import { GAME_HEIGHT } from './constants';
import { WorldId, WorldSpec } from './worlds';

//  The ten environments.
//
//  Every one is silhouettes and flat bands - no image assets - and every one is
//  held well back from the gameplay: layers are low contrast against their own
//  sky, and the corridor is always the darkest or lightest thing on screen so
//  the orbs and barriers drawn on it stay the brightest.
//
//  Light worlds carry dark HUD text and dark worlds carry light, because a
//  single fixed colour would be unreadable on half of them.

const LIGHT_HUD = { hudText: '#eaf3ff', hudDim: '#93a6c4', hudStroke: '#050a16' };
const DARK_HUD = { hudText: '#12263c', hudDim: '#4a6480', hudStroke: '#eef7ff' };

export const WORLDS: Record<WorldId, WorldSpec> = {

    //  1 - a clean, bright introduction with nothing to read but the colours.
    sky: {
        skyTop: 0x8ec9f0, skyBottom: 0xdff0fb,
        track: 0x24405e, laneLine: 0x3d5f82, trackEdge: 0x6d95bb, rung: 0x2e4f70,
        ...DARK_HUD,
        hazeColor: 0xffffff, hazeAlpha: 0.4,
        orbColor: 0xfff6d8, orbAlpha: 0.5, orbRadius: 66, orbX: 372, orbY: 148,
        layers: [
            { shape: 'blobs', color: 0xffffff, alpha: 0.5, parallax: 0.05, baseline: 210, height: 46, period: 190, repeat: 300, seed: 11 },
            { shape: 'blobs', color: 0xffffff, alpha: 0.75, parallax: 0.11, baseline: 400, height: 60, period: 250, repeat: 430, seed: 27 }
        ],
        palette: [ 'red', 'blue' ]
    },

    //  2 - the first sense of distance: ridges behind ridges.
    mountains: {
        skyTop: 0x1d3557, skyBottom: 0x7fb4dc,
        track: 0x18293f, laneLine: 0x2b4463, trackEdge: 0x4f7aa6, rung: 0x22374f,
        ...LIGHT_HUD,
        hazeColor: 0xbcd9f2, hazeAlpha: 0.3,
        layers: [
            { shape: 'peaks', color: 0x3f6690, alpha: 0.55, parallax: 0.05, baseline: 300, height: 130, period: 210, repeat: 620, seed: 5 },
            { shape: 'peaks', color: 0x24425f, alpha: 0.8, parallax: 0.12, baseline: 420, height: 170, period: 260, repeat: 700, seed: 19 },
            { shape: 'blobs', color: 0xffffff, alpha: 0.28, parallax: 0.03, baseline: 170, height: 34, period: 200, repeat: 380, seed: 31 }
        ],
        palette: [ 'red', 'blue', 'yellow' ]
    },

    //  3 - low sun, long shadows, hard mesa edges.
    canyon: {
        skyTop: 0x35135a, skyBottom: 0xff8a4a,
        track: 0x2a1330, laneLine: 0x4a2450, trackEdge: 0x8a4472, rung: 0x361a3c,
        ...LIGHT_HUD,
        hazeColor: 0xff9d5c, hazeAlpha: 0.34,
        orbColor: 0xffd08a, orbAlpha: 0.75, orbRadius: 78, orbX: 138, orbY: 300,
        layers: [
            { shape: 'mesa', color: 0x6b2f52, alpha: 0.6, parallax: 0.05, baseline: 360, height: 120, period: 190, repeat: 560, seed: 7 },
            { shape: 'mesa', color: 0x3a1733, alpha: 0.9, parallax: 0.13, baseline: 500, height: 165, period: 240, repeat: 660, seed: 23 }
        ],
        palette: [ 'orange', 'purple', 'cyan' ]
    },

    //  4 - close, layered, and misty enough to hide what is coming.
    forest: {
        skyTop: 0x07171a, skyBottom: 0x17403a,
        track: 0x0a1c1e, laneLine: 0x16332f, trackEdge: 0x2f6355, rung: 0x123028,
        ...LIGHT_HUD,
        hazeColor: 0x9fd8c0, hazeAlpha: 0.16,
        layers: [
            { shape: 'trees', color: 0x1c4038, alpha: 0.7, parallax: 0.07, baseline: 330, height: 150, period: 96, repeat: 480, seed: 13 },
            { shape: 'trees', color: 0x0e2723, alpha: 0.95, parallax: 0.16, baseline: 520, height: 200, period: 122, repeat: 560, seed: 41 }
        ],
        palette: [ 'green', 'yellow', 'purple' ]
    },

    //  5 - bright, cold and quiet, with snow crossing the screen.
    ice: {
        skyTop: 0x7fc4e0, skyBottom: 0xe8f8ff,
        track: 0x1d3a52, laneLine: 0x31597a, trackEdge: 0x6ba0c4, rung: 0x27485f,
        ...DARK_HUD,
        hazeColor: 0xffffff, hazeAlpha: 0.45,
        layers: [
            { shape: 'peaks', color: 0xa9d8ec, alpha: 0.75, parallax: 0.05, baseline: 300, height: 150, period: 200, repeat: 640, seed: 3 },
            { shape: 'peaks', color: 0x7bb2d0, alpha: 0.9, parallax: 0.13, baseline: 450, height: 190, period: 250, repeat: 720, seed: 17 }
        ],
        specks: { count: 46, color: 0xffffff, alpha: 0.85, radius: 2.4, fall: 42, drift: 26 },
        palette: [ 'cyan', 'blue', 'pink' ]
    },

    //  6 - heat, haze and soft dunes.
    desert: {
        skyTop: 0xe8913f, skyBottom: 0xffdfa4,
        track: 0x40261c, laneLine: 0x5d382a, trackEdge: 0x93603f, rung: 0x4b2d20,
        ...DARK_HUD,
        hazeColor: 0xffd28a, hazeAlpha: 0.4,
        orbColor: 0xfff0c0, orbAlpha: 0.8, orbRadius: 86, orbX: 330, orbY: 250,
        layers: [
            { shape: 'dunes', color: 0xd98f4e, alpha: 0.6, parallax: 0.05, baseline: 380, height: 90, period: 300, repeat: 520, seed: 9 },
            { shape: 'dunes', color: 0xa8633a, alpha: 0.85, parallax: 0.13, baseline: 520, height: 120, period: 360, repeat: 620, seed: 29 }
        ],
        palette: [ 'yellow', 'orange', 'blue', 'purple' ]
    },

    //  7 - the sky closes in; rain, and the occasional flash.
    storm: {
        skyTop: 0x080c16, skyBottom: 0x243448,
        track: 0x0c1420, laneLine: 0x1b2a3d, trackEdge: 0x3d5a7e, rung: 0x152130,
        ...LIGHT_HUD,
        hazeColor: 0x8fa8c4, hazeAlpha: 0.18,
        layers: [
            { shape: 'hills', color: 0x1a2740, alpha: 0.8, parallax: 0.05, baseline: 320, height: 110, period: 240, repeat: 560, seed: 2 },
            { shape: 'hills', color: 0x0f1a2c, alpha: 0.95, parallax: 0.13, baseline: 470, height: 150, period: 300, repeat: 640, seed: 37 }
        ],
        specks: { count: 60, color: 0xa8c4e0, alpha: 0.5, radius: 1.4, fall: 620, drift: 90, streak: 16 },
        lightning: true,
        palette: [ 'blue', 'red', 'green', 'yellow' ]
    },

    //  8 - hard verticals and window light.
    city: {
        skyTop: 0x0e0724, skyBottom: 0x4a1f7a,
        track: 0x120a26, laneLine: 0x241541, trackEdge: 0x50307e, rung: 0x1b1033,
        ...LIGHT_HUD,
        hazeColor: 0x7a4bd0, hazeAlpha: 0.22,
        layers: [
            { shape: 'buildings', color: 0x241443, alpha: 0.85, parallax: 0.06, baseline: 330, height: 200, period: 74, repeat: 700, seed: 6 },
            { shape: 'buildings', color: 0x140a29, alpha: 0.95, parallax: 0.15, baseline: 540, height: 250, period: 96, repeat: 820, seed: 22 }
        ],
        palette: [ 'cyan', 'magenta', 'yellow', 'green' ]
    },

    //  9 - nothing near, everything far.
    space: {
        skyTop: 0x03050d, skyBottom: 0x0c1030,
        track: 0x252f56, laneLine: 0x3a4880, trackEdge: 0x6274c0, rung: 0x2c3866,
        ...LIGHT_HUD,
        hazeColor: 0x5560c0, hazeAlpha: 0.14,
        orbColor: 0x6f7ad8, orbAlpha: 0.35, orbRadius: 104, orbX: 108, orbY: 210,
        layers: [
            { shape: 'blobs', color: 0x232a58, alpha: 0.7, parallax: 0.04, baseline: 380, height: 70, period: 260, repeat: 620, seed: 8 },
            { shape: 'shards', color: 0x1a1f42, alpha: 0.85, parallax: 0.12, baseline: 560, height: 90, period: 190, repeat: 700, seed: 44 }
        ],
        specks: { count: 70, color: 0xffffff, alpha: 0.7, radius: 1.6, fall: 18, drift: 0 },
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ]
    },

    //  10 - fragments of everywhere else, and nothing whole.
    void: {
        skyTop: 0x04030b, skyBottom: 0x1d0a33,
        track: 0x36255e, laneLine: 0x4c3580, trackEdge: 0x9a6ae0, rung: 0x3d2a68,
        ...LIGHT_HUD,
        hazeColor: 0xa050ff, hazeAlpha: 0.2,
        orbColor: 0x8a3ad0, orbAlpha: 0.3, orbRadius: 120, orbX: 240, orbY: GAME_HEIGHT * 0.26,
        layers: [
            { shape: 'shards', color: 0x2a1250, alpha: 0.7, parallax: 0.04, baseline: 300, height: 120, period: 150, repeat: 520, seed: 1 },
            { shape: 'peaks', color: 0x1d0c38, alpha: 0.8, parallax: 0.1, baseline: 460, height: 160, period: 220, repeat: 640, seed: 33 },
            { shape: 'buildings', color: 0x120722, alpha: 0.9, parallax: 0.17, baseline: 620, height: 190, period: 88, repeat: 760, seed: 55 }
        ],
        specks: { count: 54, color: 0xd8a8ff, alpha: 0.6, radius: 2, fall: 60, drift: 40 },
        palette: [ 'magenta', 'cyan', 'orange', 'green', 'purple' ]
    }
};
