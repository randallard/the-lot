import * as THREE from "three";
import { Text } from "@react-three/drei";

export interface GridDisc {
  row: number;
  col: number;
  color: string;
  label: string;
}

export interface GridTrap {
  row: number;
  col: number;
}

interface TutorialGridProps {
  position: [number, number, number];
  visible?: boolean;
  discs: GridDisc[];
  traps: GridTrap[];
}

const CELL_SIZE = 0.5;
const GRID_SIZE = 2;
const TOTAL = CELL_SIZE * GRID_SIZE; // 1.0

export function TutorialGrid({ position, visible = true, discs, traps }: TutorialGridProps) {
  if (!visible) return null;

  // Grid cells (2x2)
  const cells: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      cells.push([r, c]);
    }
  }

  return (
    <group position={position}>
      {/* Cell planes */}
      {cells.map(([r, c]) => {
        const x = (c - (GRID_SIZE - 1) / 2) * CELL_SIZE;
        const z = (r - (GRID_SIZE - 1) / 2) * CELL_SIZE;
        return (
          <mesh
            key={`cell-${r}-${c}`}
            position={[x, 0.005, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[CELL_SIZE - 0.02, CELL_SIZE - 0.02]} />
            <meshStandardMaterial
              color="#ffffff"
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Grid lines — horizontal */}
      {[0, 1, 2].map((i) => {
        const z = (i - 1) * CELL_SIZE;
        return (
          <mesh
            key={`h-${i}`}
            position={[0, 0.006, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[TOTAL + 0.02, 0.01]} />
            <meshStandardMaterial color="#333333" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {/* Grid lines — vertical */}
      {[0, 1, 2].map((i) => {
        const x = (i - 1) * CELL_SIZE;
        return (
          <mesh
            key={`v-${i}`}
            position={[x, 0.006, 0]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          >
            <planeGeometry args={[TOTAL + 0.02, 0.01]} />
            <meshStandardMaterial color="#333333" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      {/* Discs */}
      {discs.map((disc, i) => {
        const x = (disc.col - (GRID_SIZE - 1) / 2) * CELL_SIZE;
        const z = (disc.row - (GRID_SIZE - 1) / 2) * CELL_SIZE;
        return (
          <group key={`disc-${i}`} position={[x, 0.01, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[CELL_SIZE * 0.35, 24]} />
              <meshStandardMaterial
                color={disc.color}
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
            <Text
              position={[0, 0.005, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.15}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {disc.label}
            </Text>
          </group>
        );
      })}

      {/* Traps — red X on ground */}
      {traps.map((trap, i) => {
        const x = (trap.col - (GRID_SIZE - 1) / 2) * CELL_SIZE;
        const z = (trap.row - (GRID_SIZE - 1) / 2) * CELL_SIZE;
        return (
          <group key={`trap-${i}`} position={[x, 0.015, z]}>
            <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
              <planeGeometry args={[CELL_SIZE * 0.6, 0.03]} />
              <meshStandardMaterial color="#e74c3c" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
              <planeGeometry args={[CELL_SIZE * 0.6, 0.03]} />
              <meshStandardMaterial color="#e74c3c" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Helper: convert grid row,col to world position relative to grid center
export function gridCellToWorld(
  row: number,
  col: number,
  gridCenter: [number, number, number]
): [number, number, number] {
  const x = gridCenter[0] + (col - (GRID_SIZE - 1) / 2) * CELL_SIZE;
  const z = gridCenter[2] + (row - (GRID_SIZE - 1) / 2) * CELL_SIZE;
  return [x, gridCenter[1], z];
}
