import {
  type Emote,
  type ResolvedPose,
  NEUTRAL_POSE,
  MAX_STACK_DEPTH,
  sampleEmote,
  lerpResolvedPose,
} from "./emotes";

// ---------------------------------------------------------------------------
// Internal state types

interface ActiveEmote {
  emote: Emote;
  startClockTime: number;  // performance.now()/1000 when this emote started
  loopsCompleted: number;
}

interface BlendIn {
  fromPose: ResolvedPose;
  duration: number;
  startClockTime: number;
}

// ---------------------------------------------------------------------------
// Public resume snapshot — exposed for group-sync extension

export interface ResumeSnapshot {
  emote: Emote;
  savedEmoteTime: number;   // position in the emote when interrupted
  savedPose: ResolvedPose;  // pose at that moment, used to smooth the crossfade back
  /** Reserved for future group-sync: when set, rejoin the session at its current clock */
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// AnimationController
//
// Lifecycle:
//   play(emote)                          — queue; starts immediately if idle
//   interrupt(emote, { resume: true })   — pushes snapshot, plays now, resumes after
//   interrupt(emote, { resume: false })  — clears everything, plays now
//   stop()                               — clears all state
//   tick(clockTime)                      — call from useFrame; returns current pose
//
// Stack depth is capped at MAX_STACK_DEPTH (10). When full, the oldest frame
// is silently dropped on the next push (the deepest interrupt chain is lost,
// not the most recent ones — preserves the "in-progress" feeling).

export class AnimationController {
  private queue:   Emote[]           = [];
  private stack:   ResumeSnapshot[]  = [];
  private current: ActiveEmote | null = null;
  private blendIn: BlendIn | null    = null;

  private static readonly BLEND_DURATION = 0.25; // seconds

  // -------------------------------------------------------------------------
  // Public API

  play(emote: Emote): void {
    if (!this.current) {
      this._start(emote, this._clock());
    } else {
      this.queue.push(emote);
    }
  }

  interrupt(emote: Emote, opts: { resume?: boolean } = {}): void {
    const now = this._clock();
    const fromPose = this._computePose(now);

    if (opts.resume !== false && this.current) {
      const emoteTime = this._emoteTime(now);
      if (this.stack.length >= MAX_STACK_DEPTH) {
        // Drop the oldest entry to make room (keeps the most-recently-interrupted states)
        this.stack.shift();
      }
      this.stack.push({
        emote:          this.current.emote,
        savedEmoteTime: emoteTime,
        savedPose:      fromPose,
      });
    } else {
      this.queue = [];
      this.stack = [];
    }

    this._start(emote, now, fromPose);
  }

  stop(): void {
    this.current = null;
    this.blendIn = null;
    this.queue   = [];
    this.stack   = [];
  }

  /**
   * Drive the controller from a React Three Fiber useFrame callback.
   * Pass clock.elapsedTime (or performance.now() / 1000 outside R3F).
   */
  tick(clockTime: number): ResolvedPose {
    if (!this.current) return clone(NEUTRAL_POSE);

    const emoteTime = this._emoteTime(clockTime);
    const emote     = this.current.emote;

    if (emoteTime >= emote.duration) {
      const loopsCompleted = this.current.loopsCompleted + 1;

      if (emote.loop && (emote.loopCount === undefined || loopsCompleted < emote.loopCount)) {
        this.current = { emote, startClockTime: clockTime, loopsCompleted };
        this.blendIn = null;
      } else if (this.stack.length > 0) {
        this._resume(this.stack.pop()!, clockTime, this._computePose(clockTime));
      } else if (this.queue.length > 0) {
        this._start(this.queue.shift()!, clockTime, this._computePose(clockTime));
      } else {
        this.current = null;
        this.blendIn = null;
        return clone(NEUTRAL_POSE);
      }
    }

    return this._computePose(clockTime);
  }

  // Introspection

  isPlaying(): boolean   { return this.current !== null; }
  stackDepth(): number   { return this.stack.length; }
  queueLength(): number  { return this.queue.length; }
  getStack(): ResumeSnapshot[] { return [...this.stack]; }

  currentEmoteName(): string | null {
    return this.current?.emote.name ?? null;
  }

  // -------------------------------------------------------------------------
  // Private helpers

  private _clock(): number {
    return performance.now() / 1000;
  }

  private _emoteTime(clockTime: number): number {
    return this.current ? clockTime - this.current.startClockTime : 0;
  }

  private _start(emote: Emote, clockTime: number, blendFrom?: ResolvedPose): void {
    this.current = { emote, startClockTime: clockTime, loopsCompleted: 0 };
    this.blendIn = blendFrom
      ? { fromPose: blendFrom, duration: AnimationController.BLEND_DURATION, startClockTime: clockTime }
      : null;
  }

  private _resume(snap: ResumeSnapshot, clockTime: number, blendFrom: ResolvedPose): void {
    // When group-sync lands: resolve snap.sessionId to get the real current time.
    const resumeTime = snap.savedEmoteTime;
    this.current = {
      emote:          snap.emote,
      startClockTime: clockTime - resumeTime,
      loopsCompleted: 0,
    };
    this.blendIn = {
      fromPose:       blendFrom,
      duration:       AnimationController.BLEND_DURATION,
      startClockTime: clockTime,
    };
  }

  private _computePose(clockTime: number): ResolvedPose {
    if (!this.current) return clone(NEUTRAL_POSE);

    const emoteTime  = Math.min(this._emoteTime(clockTime), this.current.emote.duration);
    const targetPose = sampleEmote(this.current.emote, emoteTime);

    if (!this.blendIn) return targetPose;

    const elapsed = clockTime - this.blendIn.startClockTime;
    const t = Math.min(elapsed / this.blendIn.duration, 1);
    if (t >= 1) { this.blendIn = null; return targetPose; }
    return lerpResolvedPose(this.blendIn.fromPose, targetPose, t);
  }
}

function clone(p: ResolvedPose): ResolvedPose {
  return {
    ...p,
    headDeltaRotation: [...p.headDeltaRotation],
    rightArm: {
      upperArmRotation: [...p.rightArm.upperArmRotation],
      forearmRotation:  [...p.rightArm.forearmRotation],
      handRotation:     [...p.rightArm.handRotation],
    },
    leftArm: {
      upperArmRotation: [...p.leftArm.upperArmRotation],
      forearmRotation:  [...p.leftArm.forearmRotation],
      handRotation:     [...p.leftArm.handRotation],
    },
    activeEffects: [...p.activeEffects],
  };
}
