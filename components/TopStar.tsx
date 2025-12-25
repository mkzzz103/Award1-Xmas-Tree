import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { lerp } from '../utils/math';
import { LotteryStatus } from '../types';

const T = {
  Group: 'group' as any,
  Mesh: 'mesh' as any,
  MeshStandardMaterial: 'meshStandardMaterial' as any,
  PointLight: 'pointLight' as any,
};

interface TopStarProps {
  mixFactor: number;
  lotteryStatus?: LotteryStatus;
}

const createStarShape = (outerRadius: number, innerRadius: number, points: number) => {
    const shape = new THREE.Shape();
    const step = (Math.PI * 2) / (points * 2);
    shape.moveTo(0, outerRadius);
    for(let i = 0; i < points * 2; i++) {
        const radius = (i % 2 === 0) ? outerRadius : innerRadius;
        const angle = i * step;
        const effectiveAngle = angle + Math.PI / 2;
        shape.lineTo(Math.cos(effectiveAngle) * radius, Math.sin(effectiveAngle) * radius);
    }
    shape.closePath();
    return shape;
};

const TopStar: React.FC<TopStarProps> = ({ mixFactor, lotteryStatus }) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const starMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const currentMixRef = useRef(1);
  
  const geometry = useMemo(() => {
      const shape = createStarShape(1.2, 0.6, 5);
      const geom = new THREE.ExtrudeGeometry(shape, {
          depth: 0.4,
          bevelEnabled: true,
          bevelThickness: 0.1,
          bevelSize: 0.1,
          bevelSegments: 4
      });
      geom.center();
      return geom;
  }, []);

  useFrame((state, delta) => {
      if (!groupRef.current || !visualRef.current || !starMeshRef.current || !materialRef.current) return;

      const speed = 2.0 * delta;
      currentMixRef.current = lerp(currentMixRef.current, mixFactor, speed);
      const t = currentMixRef.current;

      groupRef.current.position.set(0, lerp(13.0, 9.2, t), 0);
      starMeshRef.current.rotation.y += delta * 0.5;

      const isShowcase = lotteryStatus === 'WINNER' || lotteryStatus === 'FLIPPED';
      
      // 中奖后降低亮度和发光
      const targetEmissive = isShowcase ? 0.3 : 2.0;
      materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, targetEmissive, 0.1);
      
      if (lightRef.current) {
          lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, isShowcase ? 0.5 : 3.0, 0.1);
      }

      if (t < 0.9) {
          const chaosTilt = (1 - t) * 0.5;
          groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * chaosTilt;
          groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.8) * chaosTilt;
      } else {
          groupRef.current.rotation.z = lerp(groupRef.current.rotation.z, 0, speed);
          groupRef.current.rotation.x = lerp(groupRef.current.rotation.x, 0, speed);
      }
  });

  return (
    <T.Group ref={groupRef}>
        <T.Group ref={visualRef}>
            <T.Mesh ref={starMeshRef} geometry={geometry}>
                <T.MeshStandardMaterial 
                    ref={materialRef}
                    color="#FFD700" 
                    emissive="#FFD700"
                    emissiveIntensity={2.0}
                    roughness={0.1}
                    metalness={0.9}
                    toneMapped={false}
                />
            </T.Mesh>
        </T.Group>
        <T.PointLight 
            ref={lightRef}
            color="#ffeebf" 
            intensity={3.0} 
            distance={15} 
            decay={2} 
        />
    </T.Group>
  );
};

export default TopStar;