/**
 * How a torso mesh is scaled to the shape its dancer is currently wearing.
 *
 * Its own module because `Dancer.tsx` may only export components — and because this is a
 * derivation with a right answer, which means it can be tested without a renderer.
 */

import { type CharacterBodyShape } from "../services/body-shapes";

/**
 * How to scale the torso mesh so it draws the shape a dancer is *currently wearing*, given the
 * shape its geometry was **built from**.
 *
 * Two things make this more than a ratio of heights.
 *
 * 🔴 **The divisor is the built shape, and getting that wrong is invisible.** `DanceFloor` had
 * been dividing the resolved height by the *reshaped* height — the same number — so the scale was
 * exactly `1` for the whole of every reshape. The head group and the shoulders follow model
 * heights and rose correctly, so a growing dancer's head and arms lifted off a torso that never
 * moved. Ryan, watching Sprout grow: *"his head just pops up with his shoulders, leaving his body
 * the same on the ground."*
 *
 * 🔑 **And a capsule is not a box.** Scaling Y by `h'/h` stretches the two hemispherical caps as
 * well, so the mesh's top lands at `(h/2 + r)·h'/h` while every measurement in the dance puts the
 * shoulders at `h'/2 + r` — `computePositions`' `bodyTop`, with the radius **not** scaled. On
 * Sprout grown by 0.735 that is an overshoot of 0.245, a torso standing a quarter of a unit proud
 * of the shoulders hanging off it. Scaling by the ratio of *half-extents* puts the top and the
 * bottom exactly where the model says they are; the caps stretch with the barrel, which is what a
 * stretching torso looks like and is the reason to do this rather than rebuild the geometry every
 * frame.
 */
export function bodyMeshScale(
  built: CharacterBodyShape,
  worn: CharacterBodyShape,
): { radial: number; height: number } {
  const halfBuilt = built.body.height / 2 + built.body.radius;
  const halfWorn = worn.body.height / 2 + worn.body.radius;
  return {
    radial: worn.body.radius / built.body.radius,
    height: halfBuilt === 0 ? 1 : halfWorn / halfBuilt,
  };
}
