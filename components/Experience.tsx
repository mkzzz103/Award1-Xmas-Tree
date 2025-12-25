import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Foliage from './Foliage';
import Ornaments from './Ornaments';
import SpiralLights from './SpiralLights';
import Snow from './Snow';
import TopStar from './TopStar';
import { TreeColors, LotteryStatus } from '../types';

const T = {
  AmbientLight: 'ambientLight' as any,
  PointLight: 'pointLight' as any,
  Group: 'group' as any,
};

const BALL_COLORS = ['#D32F2F', '#1B5E20', '#D4AF37', '#C0C0C0'];

interface ExperienceProps {
  mixFactor: number;
  colors: TreeColors;
  inputRef: React.MutableRefObject<{ x: number, y: number, isDetected?: boolean }>;
  userImages?: string[];
  lotteryStatus: LotteryStatus;
  winnerIndex: number;
  currentPrizeUrl: string | null;
  onManualFlip: () => void;
}

const SceneController: React.FC<{ 
    inputRef: React.MutableRefObject<{ x: number, y: number, isDetected?: boolean }>, 
    groupRef: React.RefObject<THREE.Group>,
    lotteryStatus: LotteryStatus
}> = ({ inputRef, groupRef, lotteryStatus }) => {
    const { camera } = useThree();
    const vec = useMemo(() => new THREE.Vector3(), []);
    const currentInput = useRef({ x: 0, y: 0 }); 

    useFrame((state, delta) => {
        const smoothing = 4.0 * delta;
        currentInput.current.x = THREE.MathUtils.lerp(currentInput.current.x, inputRef.current.x, smoothing);
        currentInput.current.y = THREE.MathUtils.lerp(currentInput.current.y, inputRef.current.y, smoothing);

        if (lotteryStatus === 'IDLE' || lotteryStatus === 'RUNNING') {
            camera.position.lerp(vec.set(currentInput.current.x * 5, currentInput.current.y * 3 + 5, 38), 0.1);
            camera.lookAt(0, 0, 0);
        } else {
            camera.position.lerp(vec.set(0, 0, 42), 0.1);
            camera.lookAt(0, 0, 0);
        }

        if (groupRef.current) {
            if (lotteryStatus === 'RUNNING') {
                groupRef.current.rotation.y += 0.25; 
            } else if (lotteryStatus === 'IDLE') {
                groupRef.current.rotation.y += 0.005;
            }
        }
    });
    return null;
};

const SceneContent: React.FC<ExperienceProps> = ({ mixFactor, colors, inputRef, userImages, lotteryStatus, winnerIndex, currentPrizeUrl, onManualFlip }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // 中奖时压低光照
  const isShowcase = lotteryStatus === 'WINNER' || lotteryStatus === 'FLIPPED';

  return (
    <>
      <SceneController inputRef={inputRef} groupRef={groupRef} lotteryStatus={lotteryStatus} />
      <T.AmbientLight intensity={isShowcase ? 0.3 : 0.6} />
      <T.PointLight position={[10, 20, 10]} intensity={isShowcase ? 0.5 : 2} />
      <Environment files='https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr' />
      <Stars radius={100} depth={50} count={isShowcase ? 1000 : 5000} factor={4} saturation={0} fade speed={1} />
      <Snow mixFactor={mixFactor} />

      <T.Group ref={groupRef} position={[0, 0, 0]}>
        <TopStar mixFactor={mixFactor} lotteryStatus={lotteryStatus} />
        <Foliage mixFactor={mixFactor} colors={colors} />
        <SpiralLights mixFactor={mixFactor} lotteryStatus={lotteryStatus} />
        <Ornaments mixFactor={mixFactor} type="BALL" count={60} scale={0.5} colors={BALL_COLORS} />
        <Ornaments 
            mixFactor={mixFactor} 
            type="PHOTO" 
            count={42} 
            userImages={userImages}
            lotteryStatus={lotteryStatus}
            winnerIndex={winnerIndex}
            currentPrizeUrl={currentPrizeUrl}
            onManualFlip={onManualFlip}
            scale={0.8}
        />
      </T.Group>

      <EffectComposer>
        <Bloom 
            // 中奖后大幅调高阈值并降低强度，停止发亮
            luminanceThreshold={isShowcase ? 0.95 : 0.4} 
            mipmapBlur 
            intensity={isShowcase ? 0.3 : 1.5} 
            radius={0.7} 
        />
        <Vignette darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const Experience: React.FC<ExperienceProps> = (props) => {
  return (
    <Canvas camera={{ position: [0, 0, 38], fov: 45 }} gl={{ antialias: false, stencil: false }} shadows style={{ touchAction: 'none' }}>
      <SceneContent {...props} />
    </Canvas>
  );
};

export default Experience;