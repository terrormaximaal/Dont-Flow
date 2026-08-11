//  A small deterministic generator, so a world looks the same every time it is
//  played without any of it being stored.
//
//  Shared by the environment and the silhouettes it draws: both need the same
//  sequence from the same seed, and two copies of this would be one bug away
//  from a layer that wraps visibly.
export function seeded (seed: number): () => number
{
    let state = (seed * 1103515245 + 12345) & 0x7fffffff;

    return () => {

        state = (state * 1103515245 + 12345) & 0x7fffffff;

        return state / 0x7fffffff;

    };
}
