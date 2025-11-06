import { useState, useRef } from "react";
import * as THREE from "three";
import type { AnimationState } from "../types";

export function useLiftControl(animationRef: React.MutableRefObject<AnimationState>) {
  const liftGroupRef = useRef<THREE.Group | null>(null);
  const currentLiftYRef = useRef(0);
  const [liftYPosition, setLiftYPosition] = useState(0);

  const moveLiftY = (direction: number) => {
    if (!liftGroupRef.current) return;

    const currentPosition = currentLiftYRef.current;
    const step = 0.001;
    let newY = currentPosition + direction * step;
    newY = Math.max(-2, Math.min(2, newY)); // Y축 범위: -2m ~ +2m

    animationRef.current.liftY = {
      start: currentPosition,
      target: newY,
      startTime: performance.now(),
      duration: 300,
    };
  };

  const setLiftYPositionDirect = (value: number) => {
    if (!liftGroupRef.current) return;

    const currentPosition = currentLiftYRef.current;
    const newY = Math.max(-2, Math.min(2, value));

    animationRef.current.liftY = {
      start: currentPosition,
      target: newY,
      startTime: performance.now(),
      duration: 500,
    };
  };

  return {
    liftGroupRef,
    currentLiftYRef,
    liftYPosition,
    setLiftYPosition,
    moveLiftY,
    setLiftYPositionDirect,
  };
}
