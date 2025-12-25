import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

interface GestureControllerProps {
  onGesture: (data: { 
    isOpen: boolean; 
    isFist: boolean; 
    isPinch: boolean;
    isThumbUp: boolean;
    position: { x: number; y: number };
    isDetected: boolean;
  }) => void;
  isGuiVisible: boolean;
}

const GestureController: React.FC<GestureControllerProps> = ({ onGesture, isGuiVisible }) => {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<handpose.HandPose | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [debugState, setDebugState] = useState<string>("-");
  
  const onGestureRef = useRef(onGesture);
  useEffect(() => { onGestureRef.current = onGesture; }, [onGesture]);

  useEffect(() => {
    let isMounted = true;
    const loadModel = async () => {
      try {
        await tf.ready();
        const net = await handpose.load();
        if (isMounted) { setModel(net); setLoading(false); }
      } catch (err) { console.error("TF Load Error", err); }
    };
    loadModel();
    return () => { isMounted = false; };
  }, []);

  const runDetection = useCallback(async () => {
    if (model && webcamRef.current?.video?.readyState === 4) {
      const video = webcamRef.current.video;
      try {
        const predictions = await model.estimateHands(video);
        if (predictions.length > 0) {
          const landmarks = predictions[0].landmarks;
          const wrist = landmarks[0];
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];
          
          const x = -1 * ((wrist[0] / video.videoWidth) * 2 - 1); 
          const y = -1 * ((wrist[1] / video.videoHeight) * 2 - 1);

          const getDist = (p1: number[], p2: number[]) => Math.sqrt(Math.pow(p1[0]-p2[0],2) + Math.pow(p1[1]-p2[1],2));
          const palmBase = landmarks[9];
          const palmRefSize = getDist(wrist, palmBase);
          
          // 1. PINCH: 只有拇指和食指靠近，且中指必须是伸开的（防止与握拳混淆）
          const thumbIndexDist = getDist(thumbTip, indexTip);
          const middleWristDist = getDist(middleTip, wrist);
          const isPinch = thumbIndexDist < palmRefSize * 0.45 && middleWristDist > palmRefSize * 1.8;

          // 2. FIST: 所有主要指尖都靠近腕部
          const fingerWristDists = [
            getDist(indexTip, wrist),
            getDist(middleTip, wrist),
            getDist(ringTip, wrist),
            getDist(pinkyTip, wrist)
          ];
          const avgFingerWrist = fingerWristDists.reduce((a,b)=>a+b,0)/4;
          const isFist = avgFingerWrist < palmRefSize * 1.4 && !isPinch;

          // 3. PALM: 全开
          const isOpen = avgFingerWrist > palmRefSize * 2.2;
          
          // 4. THUMB UP
          const isThumbUp = thumbTip[1] < landmarks[3][1] && avgFingerWrist < palmRefSize * 1.6;

          let currentState = "SEARCHING";
          if (isPinch) currentState = "PINCH 👌";
          else if (isFist) currentState = "FIST 👊";
          else if (isOpen) currentState = "PALM ✋";
          else if (isThumbUp) currentState = "LIKE 👍";
          
          setDebugState(currentState);

          if (onGestureRef.current) {
            onGestureRef.current({ isOpen, isFist, isPinch, isThumbUp, position: { x, y }, isDetected: true });
          }
        } else {
          if (onGestureRef.current) {
            onGestureRef.current({ isOpen: false, isFist: false, isPinch: false, isThumbUp: false, position: {x:0, y:0}, isDetected: false });
          }
        }
      } catch (err) {}
    }
    requestAnimationFrame(runDetection);
  }, [model]);

  useEffect(() => {
    if (model && !loading) requestAnimationFrame(runDetection);
  }, [model, loading, runDetection]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ${isGuiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="w-24 h-32 rounded-lg border-[#d4af37]/30 bg-black/90 border overflow-hidden shadow-2xl relative">
          {!cameraError && (
            <Webcam ref={webcamRef} mirrored={true} videoConstraints={{ width: 128, height: 128, facingMode: "user" }} className="w-full h-full object-cover opacity-40" onUserMediaError={() => setCameraError(true)} />
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 pt-2 pb-1 px-2 flex flex-col items-center border-t border-white/10">
            <span className="text-[10px] font-bold text-[#d4af37]">{debugState}</span>
          </div>
      </div>
    </div>
  );
};

export default GestureController;