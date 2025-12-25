import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateSpiralData, lerp } from '../utils/math';
import { LotteryStatus } from '../types';

const T = {
  InstancedMesh: 'instancedMesh' as any,
  SphereGeometry: 'sphereGeometry' as any,
  MeshBasicMaterial: 'meshBasicMaterial' as any,
};

interface SpiralLightsProps {
  mixFactor: number;
  lotteryStatus?: LotteryStatus;
}

const SpiralLights: React.FC<SpiralLightsProps> = ({ mixFactor, lotteryStatus }) => {
  const count = 300;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentMixRef = useRef(1);

  const { target, chaos } = useMemo(() => generateSpiralData(count, 19, 7.5, 9), []);

  useLayoutEffect(() => {
     if (!meshRef.current) return;
     const color = new THREE.Color("#fffae0");
     for(let i=0; i<count; i++) {
         meshRef.current.setColorAt(i, color);
         dummy.position.set(target[i*3], target[i*3+1], target[i*3+2]);
         dummy.scale.setScalar(0.15);
         dummy.updateMatrix();
         meshRef.current.setMatrixAt(i, dummy.matrix);
     }
     if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
     meshRef.current.instanceMatrix.needsUpdate = true;
  }, [target, dummy]);

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    const speed = 2.0 * delta;
    currentMixRef.current = lerp(currentMixRef.current, mixFactor, speed);
    const t = currentMixRef.current;
    const isShowcase = lotteryStatus === 'WINNER' || lotteryStatus === 'FLIPPED';
    
    // 中奖后调低材质亮度
    materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, isShowcase ? 0.4 : 1.0, 0.1);
    
    const time = state.clock.elapsedTime;
    
    for(let i=0; i<count; i++) {
      const x = lerp(chaos[i*3], target[i*3], t);
      const y = lerp(chaos[i*3+1], target[i*3+1], t);
      const z = lerp(chaos[i*3+2], target[i*3+2], t);

      dummy.position.set(x, y, z);
      
      // 中奖后停止剧烈脉冲，保持微弱缩放
      const pulse = isShowcase ? 0.12 : (Math.sin(time * 3 + i * 0.1) * 0.05 + 0.15);
      dummy.scale.setScalar(pulse);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <T.InstancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <T.SphereGeometry args={[1, 8, 8]} />
      <T.MeshBasicMaterial ref={materialRef} color="#fffae0" toneMapped={false} transparent />
    </T.InstancedMesh>
  );
};

export default SpiralLights;