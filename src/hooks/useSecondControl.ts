import { useState, useRef } from "react";
import * as THREE from "three";
import type { AnimationState } from "../types";

export function useSecondControl(animationRef: React.MutableRefObject<AnimationState>) {
  const secondGroupRef = useRef<THREE.Group | null>(null);
  const currentSecondZRef = useRef(0);
  const [secondLocalZ, setSecondLocalZ] = useState(0);

  const moveSecondLocal = (direction: number) => {
    if (!secondGroupRef.current) return;

    const currentPosition = currentSecondZRef.current;
    const step = 0.001;
    let newZ = currentPosition + direction * step;
    newZ = Math.max(-2, Math.min(2, newZ));

    animationRef.current.secondZ = {
      start: currentPosition,
      target: newZ,
      startTime: performance.now(),
      duration: 300,
    };
  };

  const setSecondLocalZDirect = (value: number) => {
    if (!secondGroupRef.current) return;

    const currentPosition = currentSecondZRef.current;
    const newZ = Math.max(-2, Math.min(2, value));

    animationRef.current.secondZ = {
      start: currentPosition,
      target: newZ,
      startTime: performance.now(),
      duration: 500,
    };
  };

  return {
    secondGroupRef,
    currentSecondZRef,
    secondLocalZ,
    setSecondLocalZ,
    moveSecondLocal,
    setSecondLocalZDirect,
  };
}
