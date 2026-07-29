/**
 * Emotes built in code, for the debug scene only.
 *
 * Real emotes live in `localStorage` per character, authored in the emote builder —
 * which means a fresh browser has none, and an experiment that depends on whatever
 * happens to be saved is not an experiment. These three exist to stress the
 * arbitration between expression and choreography, each aimed at one channel of it:
 *
 * - **wide arms** — both arms swing out to the sides and back. The envelope case:
 *   they should fold in as they enter the space between a passing pair and spring
 *   back out the moment there is room, per arm, as each one arrives.
 * - **spin** — a full turn, expressed on three channels at once. The formation
 *   case, and the reason it is worth watching: the `bodyDeltaRotY` channel must
 *   have **no effect at all** on a driven dancer, because facing belongs to the
 *   choreography and one dancer spinning is one dancer out of the square — while
 *   the head and the arms, which cannot break a formation, go all the way round.
 *   A dancer who turns their head and windmills their arms but stays square-on is
 *   the pass; a dancer whose whole body comes round is the failure.
 * - **look around** — head only. The control: it should play untouched at every
 *   moment of every call, including mid-grip, because nothing about a head can
 *   break a formation.
 *
 * All three are one-shot. They are fired by hand to be watched, so a loop would
 * only mean the button has to be pressed a second time to stop what the first
 * press started.
 */

import { ZERO_POSE } from "../services/arm-actions";
import { makeEmptyTracks, type Emote } from "../services/emotes";

function emote(name: string, duration: number): Emote {
  return {
    id: `debug-${name}`,
    name,
    tracks: makeEmptyTracks(),
    duration,
    loop: false,
    tags: ["debug"],
  };
}

let seq = 0;
const id = (): string => `dbg-${String(seq++)}`;

/** Both arms out to the side and back — the arm the envelope has to fold. */
function wideArms(): Emote {
  const swing = (time: number, degrees: number) => ({
    id: id(),
    time,
    pose: { ...ZERO_POSE, upperArmRotation: [0, 0, degrees] as [number, number, number] },
    easing: "ease-in-out" as const,
  });
  const e = emote("wide arms", 2.4);
  // Positive z-rotation swings the +x arm outward and the −x arm inward, so the two
  // tracks mirror: at any moment one arm is wide and the other is across the body.
  e.tracks.rightArm = [swing(0, 0), swing(1.2, 85), swing(2.4, 0)];
  e.tracks.leftArm = [swing(0, 0), swing(1.2, -85), swing(2.4, 0)];
  return e;
}

/**
 * A full turn on the spot — which a dancer in a square may not take with their
 * body, but may take with everything above it.
 *
 * The body track is the assertion: 360° of `deltaRotY` that a driven dancer must
 * ignore outright. The head and arm tracks are what makes the assertion legible —
 * without them a passing spin and a dropped spin look identical, because both are
 * a dancer standing still.
 *
 * The arms sweep as a cone rather than a twist. An arm's pose reaches the dance
 * layer as an *aim*: the resting hang, straight down, rotated by the emote's
 * euler. Yaw alone spins that hang about its own axis and moves nothing, so the
 * arms are first tilted out on Z and then carried round on Y — mirrored tilts and
 * a shared sweep, so the pair travels together like a propeller.
 */
function spin(): Emote {
  const e = emote("spin", 2);
  const DURATION = 2;
  const TILT = 70;   // degrees out from the hang — enough that the sweep is a circle
  const RAISE = 0.25; // seconds spent getting the arms out and putting them back

  e.tracks.body = [
    { id: id(), time: 0, deltaY: 0, deltaRotY: 0, leanX: 0, leanZ: 0, radiusDelta: 0, heightDelta: 0, easing: "linear" },
    { id: id(), time: DURATION, deltaY: 0, deltaRotY: 360, leanX: 0, leanZ: 0, radiusDelta: 0, heightDelta: 0, easing: "linear" },
  ];

  e.tracks.head = [
    { id: id(), time: 0, deltaRotation: [0, 0, 0], offsetX: 0, offsetY: 0, offsetZ: 0, radiusDelta: 0, easing: "linear" },
    { id: id(), time: DURATION / 2, deltaRotation: [0, 180, 0], offsetX: 0, offsetY: 0, offsetZ: 0, radiusDelta: 0, easing: "linear" },
    { id: id(), time: DURATION, deltaRotation: [0, 360, 0], offsetX: 0, offsetY: 0, offsetZ: 0, radiusDelta: 0, easing: "linear" },
  ];

  // Y sweep is shared, Z tilt is mirrored: both arms out on opposite sides,
  // both carried the same way round.
  const sweep = (time: number, y: number, tilt: number) => ({
    id: id(),
    time,
    pose: { ...ZERO_POSE, upperArmRotation: [0, y, tilt] as [number, number, number] },
    easing: "linear" as const,
  });
  const armTrack = (tilt: number) => [
    sweep(0, 0, 0),
    sweep(RAISE, 0, tilt),
    sweep(RAISE + (DURATION - 2 * RAISE) / 2, 180, tilt),
    sweep(DURATION - RAISE, 360, tilt),
    sweep(DURATION, 360, 0),
  ];
  e.tracks.rightArm = armTrack(TILT);
  e.tracks.leftArm = armTrack(-TILT);

  return e;
}

/** Head only — the channel that should never be interfered with. */
function lookAround(): Emote {
  const head = (time: number, y: number) => ({
    id: id(),
    time,
    deltaRotation: [0, y, 0] as [number, number, number],
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    radiusDelta: 0,
    easing: "ease-in-out" as const,
  });
  const e = emote("look around", 3);
  e.tracks.head = [head(0, 0), head(1, 70), head(2, -70), head(3, 0)];
  return e;
}

export const DEBUG_EMOTES: readonly Emote[] = [wideArms(), spin(), lookAround()];
