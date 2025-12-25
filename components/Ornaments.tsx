import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { lerp, randomVector3 } from '../utils/math';
import { LotteryStatus } from '../types';

const T = {
  Group: 'group' as any,
  Mesh: 'mesh' as any,
  BoxGeometry: 'boxGeometry' as any,
  MeshStandardMaterial: 'meshStandardMaterial' as any,
  PlaneGeometry: 'planeGeometry' as any,
  InstancedMesh: 'instancedMesh' as any,
};

interface OrnamentData {
  id: number;
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  rotation: THREE.Euler;
  color: THREE.Color;
  targetScale: THREE.Vector3;
  chaosScale: THREE.Vector3;
}

interface PhotoFrameProps {
    item: OrnamentData;
    mixFactor: number;
    url: string;
    isWinner: boolean;
    lotteryStatus: LotteryStatus;
    prizeUrl: string | null;
    onManualFlip: () => void;
}

const PhotoFrameMesh: React.FC<PhotoFrameProps> = ({ item, mixFactor, url, isWinner, lotteryStatus, prizeUrl, onManualFlip }) => {
    const groupRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Group>(null); 
    const currentMixRef = useRef(1);
    
    const safeUrl = url || 'https://picsum.photos/id/1025/200/200';
    // 关键点：只有当前是中奖者时才传入真实的奖品 URL，否则使用 base64 极小透明图，防止纹理污染
    const finalPrizeUrl = (isWinner && prizeUrl) ? prizeUrl : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    
    const texture = useLoader(THREE.TextureLoader, safeUrl);
    const prizeTexture = useLoader(THREE.TextureLoader, finalPrizeUrl);
    
    const vecPos = useMemo(() => new THREE.Vector3(), []);
    const vecScale = useMemo(() => new THREE.Vector3(), []);
    const qTarget = useMemo(() => new THREE.Quaternion(), []);
    const qParentInv = useMemo(() => new THREE.Quaternion(), []);
    const worldCenter = useMemo(() => new THREE.Vector3(0, 0, 15), []); 

    useFrame((state, delta) => {
        if (!groupRef.current || !innerRef.current) return;
        
        currentMixRef.current = lerp(currentMixRef.current, mixFactor, delta * 2.5);
        const t = currentMixRef.current;
        
        if (isWinner && (lotteryStatus === 'WINNER' || lotteryStatus === 'FLIPPED')) {
            const localTarget = groupRef.current.parent!.worldToLocal(worldCenter.clone());
            groupRef.current.position.lerp(localTarget, 0.15);
            groupRef.current.scale.lerp(vecScale.setScalar(12.5), 0.15); 
            
            groupRef.current.parent!.getWorldQuaternion(qParentInv).invert();
            qTarget.copy(qParentInv).multiply(state.camera.quaternion);
            groupRef.current.quaternion.slerp(qTarget, 0.15);
            
            const targetRotationY = lotteryStatus === 'FLIPPED' ? Math.PI : 0;
            innerRef.current.rotation.y = THREE.MathUtils.lerp(innerRef.current.rotation.y, targetRotationY, 0.12);
        } else {
            vecPos.lerpVectors(item.chaosPos, item.targetPos, t);
            groupRef.current.position.lerp(vecPos, 0.15); 
            
            vecScale.lerpVectors(item.chaosScale, item.targetScale, t);
            groupRef.current.scale.lerp(vecScale, 0.15);
            
            if (t > 0.8) {
                // 修正朝向：正面（Z+）面向外部。让 -Z 指向树心，则正面朝外。
                const center = new THREE.Vector3(0, groupRef.current.position.y, 0);
                const mat = new THREE.Matrix4().lookAt(groupRef.current.position, center, new THREE.Vector3(0,1,0));
                groupRef.current.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(mat), 0.1);
            } else {
                const qCam = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(groupRef.current.position, state.camera.position, new THREE.Vector3(0,1,0)));
                groupRef.current.quaternion.slerp(qCam, 0.1);
            }
            innerRef.current.rotation.y = lerp(innerRef.current.rotation.y, 0, 0.1);
        }
    });

    return (
        <T.Group ref={groupRef} onClick={(e: any) => {
            e.stopPropagation();
            if (isWinner && (lotteryStatus === 'WINNER' || lotteryStatus === 'FLIPPED')) onManualFlip();
        }}>
            <T.Group ref={innerRef}>
                {/* 边框 */}
                <T.Mesh>
                    <T.BoxGeometry args={[1.0, 1.3, 0.05]} />
                    <T.MeshStandardMaterial 
                        color={isWinner && lotteryStatus === 'RUNNING' ? "#ffcc00" : "white"} 
                        emissive={isWinner && lotteryStatus === 'RUNNING' ? "#ffcc00" : "white"}
                        emissiveIntensity={isWinner && lotteryStatus === 'RUNNING' ? 8 : 0.2}
                    />
                </T.Mesh>
                {/* 正面照片 */}
                <T.Mesh position={[0, 0, 0.03]}>
                    <T.PlaneGeometry args={[0.85, 1.15]} />
                    <T.MeshStandardMaterial map={texture} toneMapped={false} />
                </T.Mesh>
                {/* 背面逻辑 */}
                <T.Group rotation={[0, Math.PI, 0]} position={[0, 0, -0.026]}>
                    <T.Mesh>
                        <T.PlaneGeometry args={[1.0, 1.3]} />
                        <T.MeshStandardMaterial color="#f8f8f8" metalness={0.4} roughness={0.3} />
                    </T.Mesh>
                    {isWinner && (
                        <T.Mesh position={[0, 0, 0.01]}>
                            <T.PlaneGeometry args={[0.85, 1.15]} />
                            <T.MeshStandardMaterial map={prizeTexture} transparent toneMapped={false} />
                        </T.Mesh>
                    )}
                </T.Group>
            </T.Group>
        </T.Group>
    );
};

interface OrnamentsProps {
  mixFactor: number;
  type: 'BALL' | 'PHOTO';
  count: number;
  colors?: string[];
  scale?: number;
  userImages?: string[];
  lotteryStatus?: LotteryStatus;
  winnerIndex?: number;
  currentPrizeUrl?: string | null;
  onManualFlip?: () => void;
}

const Ornaments: React.FC<OrnamentsProps> = ({ mixFactor, type, count, colors, scale = 1, userImages = [], lotteryStatus = 'IDLE', winnerIndex = -1, currentPrizeUrl, onManualFlip }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentMixRef = useRef(1);

  const data = useMemo(() => {
    const items: OrnamentData[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const treeHeight = 18;
    const treeRadiusBase = 7.5;
    const apexY = 9;

    for (let i = 0; i < count; i++) {
      const progress = Math.sqrt((i + 1) / count) * 0.9;
      const r = progress * treeRadiusBase;
      const y = apexY - progress * treeHeight;
      const theta = i * goldenAngle;
      const tPos = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)).multiplyScalar(1.15);
      const targetScale = new THREE.Vector3(1, 1, 1).multiplyScalar(scale * (0.8 + Math.random() * 0.4));
      const chaosScale = targetScale.clone().multiplyScalar(type === 'PHOTO' ? 4 : 1.2);

      items.push({
        id: i,
        chaosPos: randomVector3(25),
        targetPos: tPos,
        rotation: new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, 0),
        color: new THREE.Color(colors ? colors[Math.floor(Math.random() * colors.length)] : '#ffffff'),
        targetScale: targetScale,
        chaosScale: chaosScale
      });
    }
    return items;
  }, [count, type, scale, colors]);

  // 关键修复：确保在状态重置时同步色彩属性，防止球体变白
  useLayoutEffect(() => {
     if (!meshRef.current || type === 'PHOTO') return;
     data.forEach((item, i) => {
         meshRef.current!.setColorAt(i, item.color);
         dummy.position.copy(item.targetPos);
         dummy.scale.copy(item.targetScale);
         dummy.updateMatrix();
         meshRef.current!.setMatrixAt(i, dummy.matrix);
     });
     if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
     meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data, type, lotteryStatus, colors]); // 监听状态变化以重新应用属性

  useFrame((state, delta) => {
    if (!meshRef.current || type === 'PHOTO') return;
    currentMixRef.current = lerp(currentMixRef.current, mixFactor, delta * 2);
    data.forEach((item, i) => {
      dummy.position.lerpVectors(item.chaosPos, item.targetPos, currentMixRef.current);
      dummy.scale.lerpVectors(item.chaosScale, item.targetScale, currentMixRef.current);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (type === 'PHOTO') {
      return (
          <T.Group>
              {data.map((item, i) => (
                  <PhotoFrameMesh 
                      key={i} 
                      item={item} 
                      mixFactor={mixFactor} 
                      url={userImages.length > 0 ? userImages[i % userImages.length] : 'https://picsum.photos/id/1025/200/200'} 
                      isWinner={i === winnerIndex}
                      lotteryStatus={lotteryStatus}
                      prizeUrl={i === winnerIndex ? currentPrizeUrl : null}
                      onManualFlip={onManualFlip!}
                  />
              ))}
          </T.Group>
      );
  }

  return (
    <T.InstancedMesh ref={meshRef} args={[new THREE.SphereGeometry(1, 16, 16), undefined, count]}>
      <T.MeshStandardMaterial roughness={0.2} metalness={0.8} />
    </T.InstancedMesh>
  );
};

export default Ornaments;