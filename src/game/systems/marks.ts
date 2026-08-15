//  Whether the colours wear their marks.
//
//  On by default, which is the whole point: a player who needs this is exactly
//  the player who will never go looking through a settings screen for it,
//  because from where they are sitting the game is simply broken rather than
//  missing a feature. Anybody who prefers unmarked colour can turn it off, and
//  they will find the switch because they are looking for it.
//
//  Module state rather than a class, like the audio, because every orb, gate and
//  barrier in the game has to ask and none of them owns the answer.

let marks = true;

export function areMarksOn (): boolean
{
    return marks;
}

export function setMarks (on: boolean): void
{
    marks = on;
}
