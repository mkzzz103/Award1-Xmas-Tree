import React, { useState, useCallback, useRef } from 'react';
import Experience from './components/Experience';
import GestureController from './components/GestureController';
import { TreeColors, LotteryStatus, HandGesture } from './types';

const App: React.FC = () => {
  const [targetMix, setTargetMix] = useState(1); 
  const [colors] = useState<TreeColors>({ bottom: '#011c12', top: '#1c6a3c' });
  const inputRef = useRef({ x: 0, y: 0, isDetected: false });
  
  const [userImages, setUserImages] = useState<string[]>([]);
  const [prizePool, setPrizePool] = useState<string[]>([]);
  const [currentPrize, setCurrentPrize] = useState<string | null>(null);
  const [lotteryStatus, setLotteryStatus] = useState<LotteryStatus>('IDLE');
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [gestureEnabled, setGestureEnabled] = useState(true);
  
  const prizeInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lotteryInterval = useRef<any>(null);
  
  const lastGestureTime = useRef(0);
  const lastFlipTime = useRef(0);

  const startRolling = useCallback(() => {
    clearInterval(lotteryInterval.current);
    setWinnerIndex(-1);
    setCurrentPrize(null);
    setTargetMix(0); // 抽奖自动展开
    setLotteryStatus('RUNNING');
    lotteryInterval.current = setInterval(() => {
      setWinnerIndex(Math.floor(Math.random() * 42));
    }, 70);
  }, []);

  const handleExplodeToggle = useCallback(() => {
    setTargetMix(prev => prev === 1 ? 0 : 1);
  }, []);

  const handleStopLottery = useCallback(() => {
      clearInterval(lotteryInterval.current);
      setLotteryStatus('WINNER');
      if (prizePool.length > 0) {
          const randPrize = prizePool[Math.floor(Math.random() * prizePool.length)];
          setCurrentPrize(randPrize);
      } else {
          setCurrentPrize('https://picsum.photos/id/1012/512/512');
      }
  }, [prizePool]);

  const handleExitLottery = useCallback(() => {
    clearInterval(lotteryInterval.current);
    setLotteryStatus('IDLE');
    setWinnerIndex(-1);
    setCurrentPrize(null);
    setTargetMix(1); // 退出后圣诞树自动聚拢
  }, []);

  const handleManualFlip = useCallback(() => {
      setLotteryStatus(prev => prev === 'WINNER' ? 'FLIPPED' : 'WINNER');
  }, []);

  const handleGesture = useCallback((data: HandGesture) => {
    if (!gestureEnabled) return;
    
    if (data.isDetected) {
        inputRef.current = { x: data.position.x * 1.5, y: data.position.y, isDetected: true };
        const now = Date.now();

        // 仅在 IDLE 时允许手势控制树的聚散
        if (lotteryStatus === 'IDLE') {
            if (data.isFist && targetMix !== 1) {
                setTargetMix(1); 
            } else if (data.isOpen && targetMix !== 0) {
                setTargetMix(0); 
            }
        } 
        // 仅在 WINNER/FLIPPED 状态下允许手势翻转卡片
        else if (lotteryStatus === 'WINNER' || lotteryStatus === 'FLIPPED') {
            if (data.isPinch && now - lastFlipTime.current > 800) {
                handleManualFlip();
                lastFlipTime.current = now;
            }
        }
    } else {
        inputRef.current.isDetected = false;
    }
  }, [lotteryStatus, gestureEnabled, targetMix, handleManualFlip]);

  const btnStyle = "w-12 h-12 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center cursor-pointer shadow-2xl transition-all hover:bg-white/30 active:scale-95";

  return (
    <div className="relative w-full h-screen bg-[#010a05] overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={(e) => {
          if (e.target.files) {
              const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f as File));
              setUserImages(prev => [...prev, ...urls]);
          }
      }} multiple className="hidden" accept="image/*" />
      
      <input type="file" ref={prizeInputRef} onChange={(e) => {
          if (e.target.files) {
              const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f as File));
              setPrizePool(prev => [...prev, ...urls]);
          }
      }} multiple className="hidden" accept="image/*" />

      <Experience 
        mixFactor={targetMix} colors={colors} inputRef={inputRef} 
        userImages={userImages} lotteryStatus={lotteryStatus} 
        winnerIndex={winnerIndex} currentPrizeUrl={currentPrize} 
        onManualFlip={handleManualFlip}
      />

      {/* 顶部控制面板 */}
      <div className="absolute top-6 left-6 z-50 flex flex-col gap-3">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-1.5 px-4 rounded-full border border-white/10">
            <span className="text-[10px] font-luxury text-white/60 tracking-widest uppercase">Gesture</span>
            <button onClick={() => setGestureEnabled(!gestureEnabled)} className={`w-8 h-4 rounded-full transition-all relative shadow-inner ${gestureEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${gestureEnabled ? 'left-4.5' : 'left-0.5'}`} />
            </button>
        </div>
        
        {/* 纯展示爆炸按钮 */}
        <button onClick={handleExplodeToggle} className="group bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 p-3 px-5 rounded-2xl flex items-center gap-3 transition-all">
            <span className="text-lg">{targetMix === 1 ? '💥' : '🎄'}</span>
            <span className="text-[9px] font-luxury text-white/80 tracking-widest uppercase">{targetMix === 1 ? 'Explode' : 'Form Tree'}</span>
        </button>
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-4 z-50">
        <button onClick={startRolling} className={`${btnStyle} ${lotteryStatus !== 'IDLE' ? 'border-amber-400 ring-4 ring-amber-400/20' : ''}`} title="Start Lottery">
           <span className="text-xl">🎁</span>
        </button>
        <button onClick={() => prizeInputRef.current?.click()} className={btnStyle} title="Prize Pool">
           <span className="text-xl">🏆</span>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className={btnStyle} title="Import People">
           <span className="text-xl">📸</span>
        </button>
      </div>

      {/* 底部抽奖交互 UI */}
      {lotteryStatus !== 'IDLE' && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-500">
              <div className="bg-black/80 backdrop-blur-3xl border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-4 min-w-[320px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                  <div className="text-center">
                    <h2 className="font-luxury text-sm text-white tracking-[0.3em] uppercase opacity-90">
                        {lotteryStatus === 'RUNNING' ? 'Selecting Winner' : 'Congratulations!'}
                    </h2>
                    <p className="text-white/30 text-[9px] uppercase tracking-widest mt-1">
                        {lotteryStatus === 'RUNNING' ? 'Randomizing among attendees...' : 'Winner Revealed'}
                    </p>
                  </div>

                  <div className="flex gap-3 w-full">
                    {lotteryStatus === 'RUNNING' ? (
                        <button onClick={handleStopLottery} className="flex-1 py-3 bg-white text-black font-luxury text-[10px] rounded-full hover:bg-amber-400 transition-all active:scale-95">STOP</button>
                    ) : (
                        <>
                            <button onClick={startRolling} className="flex-1 py-3 bg-amber-400 text-black font-luxury text-[10px] rounded-full hover:scale-105 transition-all shadow-lg shadow-amber-500/20 uppercase font-bold">Next Round</button>
                            <button onClick={handleManualFlip} className="px-6 py-3 bg-white/10 text-white font-luxury text-[10px] rounded-full hover:bg-white/20 transition-all uppercase">Flip</button>
                            <button onClick={handleExitLottery} className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/30 font-luxury text-[10px] rounded-full hover:bg-red-500/40 transition-all uppercase">Exit</button>
                        </>
                    )}
                  </div>
              </div>
          </div>
      )}

      <GestureController onGesture={handleGesture} isGuiVisible={gestureEnabled} />
    </div>
  );
};

export default App;