import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { armMetrics, restPose, armPose, upperArmStrain } from "./arm-pose";
import {
  EMBER_DEFAULTS, PLAYER_DEFAULTS, NPC_BODY_CENTER_Y, computePositions, deg2rad,
} from "../services/body-shapes";

/**
 * 🧪 **The shoulders ride the torso's lean** (2026-10-13) — `ComputedPositions.shoulderZ`.
 *
 * Ryan, of Ember: *"shoulders should stay at the top of the body, following when it leans."* The
 * torso mesh is turned by `rotation.x = leanX` about its own centre; the shoulders used to stay
 * at `z = 0`, 0.224 behind the top of her 14° lean.
 */
describe("🧪 a leaning body carries its shoulders", () => {
  it("🔑 puts Ember's shoulder exactly where the drawn torso's top went", () => {
    const { body } = EMBER_DEFAULTS;
    const top = new THREE.Vector3(0, body.height / 2 + body.radius, 0)
      .applyEuler(new THREE.Euler(deg2rad(body.leanX), 0, deg2rad(body.leanZ)));
    const pos = computePositions(EMBER_DEFAULTS, NPC_BODY_CENTER_Y);
    expect(pos.shoulderY).toBeCloseTo(NPC_BODY_CENTER_Y + top.y, 12);
    expect(pos.shoulderZ).toBeCloseTo(top.z, 12);
    expect(pos.shoulderZ).toBeCloseTo(0.224, 3);
  });

  it("leaves an upright body exactly as it was", () => {
    const pos = computePositions(PLAYER_DEFAULTS, NPC_BODY_CENTER_Y);
    const { body } = PLAYER_DEFAULTS;
    expect(pos.shoulderZ).toBe(0);
    expect(pos.shoulderY).toBe(NPC_BODY_CENTER_Y + body.height / 2 + body.radius);
  });

  it("hangs the resting arm from the leaned shoulder, at its true length", () => {
    const m = armMetrics(EMBER_DEFAULTS);
    for (const sign of [1, -1]) {
      const p = restPose(armPose(), m, sign);
      expect(p.z).toBeCloseTo(m.restZ, 12);
      expect(upperArmStrain(p, m, sign)).toBeCloseTo(0, 12);
    }
  });
});
