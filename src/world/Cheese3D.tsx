interface Cheese3DProps {
  position: [number, number, number];
  visible?: boolean;
}

const CHIP_COLOR = "#f5a623";
const RIM_COLOR = "#d4891a";

export function Cheese3D({ position, visible = true }: Cheese3DProps) {
  if (!visible) return null;

  return (
    <group position={position}>
      {/* Stack of 3 cheese token cylinders */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, i * 0.025, 0]}>
          {/* Chip body */}
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
            <meshStandardMaterial color={CHIP_COLOR} />
          </mesh>
          {/* Rim ring */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.015, 12]} />
            <meshStandardMaterial color={RIM_COLOR} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
