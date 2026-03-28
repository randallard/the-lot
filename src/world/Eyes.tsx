import { useMemo } from "react";
import * as THREE from "three";
import {
  type CharacterEyes,
  type EyeShape,
  buildEyeShape,
  resolveEye,
  eyeZOnSphere,
} from "../services/eye-shapes";
import { deg2rad } from "../services/body-shapes";

// ---------------------------------------------------------------------------
// Clip a THREE.Shape to the half-plane x >= clipX (keepRight=true) or x <= clipX (false).
// Uses a dense polyline approximation + Sutherland-Hodgman half-plane clip.

// Clip a THREE.Shape against a half-plane on either axis.
// axis='x': keepPos=true keeps x >= clipVal, false keeps x <= clipVal
// axis='y': keepPos=true keeps y >= clipVal, false keeps y <= clipVal
function clipShape(
  shape: THREE.Shape,
  axis: "x" | "y",
  clipVal: number,
  keepPos: boolean,
): THREE.Shape | null {
  const pts = shape.getPoints(64);
  const n =
    pts.length > 1 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6
      ? pts.length - 1
      : pts.length;

  const out: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const cv = axis === "x" ? curr.x : curr.y;
    const nv = axis === "x" ? next.x : next.y;
    const currIn = keepPos ? cv >= clipVal : cv <= clipVal;
    const nextIn = keepPos ? nv >= clipVal : nv <= clipVal;
    if (currIn) out.push(new THREE.Vector2(curr.x, curr.y));
    if (currIn !== nextIn) {
      const t = (clipVal - cv) / (nv - cv);
      out.push(new THREE.Vector2(
        curr.x + t * (next.x - curr.x),
        curr.y + t * (next.y - curr.y),
      ));
    }
  }
  if (out.length < 3) return null;

  const clipped = new THREE.Shape();
  clipped.moveTo(out[0].x, out[0].y);
  for (let i = 1; i < out.length; i++) clipped.lineTo(out[i].x, out[i].y);
  clipped.closePath();
  return clipped;
}

// ---------------------------------------------------------------------------
// Single eye — white shape + iris circle

interface SingleEyeProps {
  eye: EyeShape;
  position: [number, number, number];
  /** Clip the sclera at this local x. keepRight=true keeps x >= clipX, false keeps x <= clipX */
  whiteClipX?: number;
  keepRight?: boolean;
  /** Negate the eye's rotation (used for left eye when rotationMirrored is on) */
  mirrorRotation?: boolean;
}

function SingleEye({ eye, position, whiteClipX, keepRight = true, mirrorRotation = false }: SingleEyeProps) {
  const fullShape = useMemo(
    () => buildEyeShape(eye),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      eye.width, eye.height,
      eye.cornerTL, eye.cornerTR, eye.cornerBL, eye.cornerBR,
      eye.arcTop, eye.arcBottom, eye.arcLeft, eye.arcRight,
    ],
  );

  const displayShape = useMemo(() => {
    if (whiteClipX === undefined) return fullShape;
    return clipShape(fullShape, "x", whiteClipX, keepRight) ?? fullShape;
  }, [fullShape, whiteClipX, keepRight]);

  const irisRadius = (eye.irisSize * eye.height) / 2;

  const eyeRotation = mirrorRotation ? -eye.rotation : eye.rotation;

  return (
    <group position={position} rotation={[0, 0, deg2rad(eyeRotation)]}>
      {/* Sclera (white) — optional, clipped at midpoint when clipOverlap is on */}
      {eye.showWhite && (
        <mesh>
          <shapeGeometry args={[displayShape, 32]} />
          <meshStandardMaterial color="white" side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Iris */}
      <mesh position={[0, eye.irisOffsetY, eye.showWhite ? 0.001 : 0]}>
        <circleGeometry args={[irisRadius, 24]} />
        <meshStandardMaterial color={eye.irisColor} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Eyes — positions both eyes on the head sphere surface

export interface EyesProps {
  eyes: CharacterEyes;
  /** Y position of the head sphere center in the character's local group space */
  headY: number;
  headRadius: number;
  /** If set, looks up and applies the matching expression overrides */
  expression?: string;
  /** Direct override — takes precedence over `expression` (used by the emote system) */
  expressionOverride?: Partial<EyeShape>;
}

export function Eyes({ eyes, headY, headRadius, expression, expressionOverride }: EyesProps) {
  const { positioning, asymmetric, right, left, expressions, clipOverlap, rotationMirrored } = eyes;

  const expOverride = expressionOverride ?? (expression ? expressions[expression] : undefined);
  const rightEye = resolveEye(right, expOverride);
  const leftEye  = asymmetric ? resolveEye(left, expOverride) : rightEye;

  const eyeX      = positioning.separation / 2;
  const eyeLocalY = headRadius * (1 - 2 * positioning.fromTopOfHead);
  const eyeZ      = eyeZOnSphere(headRadius, eyeX, eyeLocalY);
  const eyeWorldY = headY + eyeLocalY;

  // Clip each white at the midpoint (world x=0). In each eye's local space:
  //   right eye local origin is at world +eyeX → midpoint is at local x = -eyeX
  //   left  eye local origin is at world -eyeX → midpoint is at local x = +eyeX
  // Also clip at y = -height/2 to remove downward arc extensions.
  const rightClipX = clipOverlap ? -eyeX : undefined;
  const leftClipX  = clipOverlap ?  eyeX : undefined;

  return (
    <>
      <SingleEye eye={rightEye} position={[ eyeX, eyeWorldY, eyeZ]} whiteClipX={rightClipX} keepRight={true}  />
      <SingleEye eye={leftEye}  position={[-eyeX, eyeWorldY, eyeZ]} whiteClipX={leftClipX}  keepRight={false} mirrorRotation={rotationMirrored} />
    </>
  );
}
