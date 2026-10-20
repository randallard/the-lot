/**
 * 🧪 **The joined hands of a turn-under travel one arc in one upright plane** (2026-10-19,
 * exploratory, no ADR).
 *
 * Ryan, watching the California Twirl video against the reference photos
 * (`work/square-dance-planning/review2/reference/california-twirl/`): *"her hand travels in an
 * arc while she turns … from down and slightly in front of them up in an arc on the same plane to
 * down and slightly in front of them facing the other direction … her arm doesn't switch sides or
 * cross over, she walks around it while he holds her hand, his arm up and over."*
 *
 * So the hands are not carried by the pair. The bodies move, and the hands stay in the upright
 * plane through the **centre of the exchange** along the couple's facing. They start low and a
 * little in front of the couple, rise over the centre (over her crown as she passes under it),
 * and come down a little in front of the couple's new facing, which is the old one reversed.
 *
 * 🔑 **How far along the arc the hands are is how far she has turned**, not the clock. The peak
 * is where she is half turned, which on square-one's twirl is where she stands on the centre,
 * and the hands are low again as her turn (and the arch span) ends.
 *
 * Pure: the floor samples the motions and hands the samples in.
 */

/** A dancer sampled at a beat: world position and rig yaw (`rotation.y`). */
export interface Sampled {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
}

/** The arc for one execution of an arch span, solved once when the span begins. */
export interface JoinArc {
  /** The centre of the exchange: the couple's midpoint as the span begins. */
  readonly cx: number;
  readonly cz: number;
  /** The couple's facing as the span begins, a unit vector on the floor. */
  readonly fx: number;
  readonly fz: number;
  readonly from: number;
  readonly to: number;
  /** How far she has turned (radians, unsigned) at `STEPS + 1` even beats across the span. */
  readonly turned: readonly number[];
}

const STEPS = 32;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Where a rig with this yaw faces. `rotation.y = 0` faces +z. */
const forwardOf = (yaw: number) => ({ x: Math.sin(yaw), z: Math.cos(yaw) });

/**
 * Solve the arc for a span. `beau` and `belle` sample each dancer at a beat; the turn is
 * measured on the belle, the one who walks under.
 */
export function planJoinArc(
  beau: (beat: number) => Sampled,
  belle: (beat: number) => Sampled,
  from: number,
  to: number,
): JoinArc {
  const a = beau(from);
  const b = belle(from);
  const fa = forwardOf(a.yaw);
  const fb = forwardOf(b.yaw);
  const fl = Math.hypot(fa.x + fb.x, fa.z + fb.z);
  const f = fl < 1e-9 ? fa : { x: (fa.x + fb.x) / fl, z: (fa.z + fb.z) / fl };
  const turned: number[] = [0];
  let yaw = b.yaw;
  let sum = 0;
  for (let i = 1; i <= STEPS; i++) {
    const next = belle(from + ((to - from) * i) / STEPS).yaw;
    sum += wrap(next - yaw);
    yaw = next;
    turned.push(Math.abs(sum));
  }
  return { cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2, fx: f.x, fz: f.z, from, to, turned };
}

/** Where on the arc the hands are at `beat`: `0` at the start, `π` at the end. */
export function arcAngle(arc: JoinArc, beat: number): number {
  const total = arc.turned[arc.turned.length - 1] ?? 0;
  if (total < 1e-9 || arc.to <= arc.from) return beat >= arc.to ? Math.PI : 0;
  const u = Math.min(1, Math.max(0, (beat - arc.from) / (arc.to - arc.from))) * STEPS;
  const i = Math.min(STEPS - 1, Math.floor(u));
  const t0 = arc.turned[i] ?? 0;
  const t1 = arc.turned[i + 1] ?? t0;
  return Math.PI * Math.min(1, (t0 + (t1 - t0) * (u - i)) / total);
}

/**
 * The joined hands at `beat`: on the floor, `reach` in front of the centre at the start and
 * `reach` behind it (in front of the new facing) at the end; in height, `low` at both ends and
 * `top` over the centre. `rise` is how far up they are, `0`–`1`.
 */
export function joinArcAt(
  arc: JoinArc,
  beat: number,
  low: number,
  top: number,
  reach: number,
): { x: number; z: number; height: number; rise: number } {
  const th = arcAngle(arc, beat);
  const along = reach * Math.cos(th);
  const rise = Math.sin(th);
  return { x: arc.cx + arc.fx * along, z: arc.cz + arc.fz * along, height: low + (top - low) * rise, rise };
}
