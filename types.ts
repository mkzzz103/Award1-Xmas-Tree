
export type TreeState = 'CHAOS' | 'FORMED';

export type LotteryStatus = 'IDLE' | 'RUNNING' | 'WINNER' | 'FLIPPED';

export interface TreeColors {
  bottom: string;
  top: string;
}

export interface HandGesture {
  isOpen: boolean;
  isFist: boolean;
  isPinch: boolean;
  isThumbUp: boolean;
  position: { x: number; y: number };
  isDetected: boolean;
}
