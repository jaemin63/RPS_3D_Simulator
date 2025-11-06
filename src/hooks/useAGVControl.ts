import { useState, useRef } from "react";
import * as THREE from "three";
import type { AnimationState } from "../types";

export function useAGVControl(animationRef: React.MutableRefObject<AnimationState>) {
  const agvGroupRef = useRef<THREE.Group | null>(null);
  const agvPivotMarkerRef = useRef<THREE.Mesh | null>(null);
  const currentAgvZRef = useRef(0);
  const currentAgvRotationRef = useRef(0);

  const [agvZPosition, setAgvZPosition] = useState(0);
  const [agvRotation, setAgvRotation] = useState(0);
  const [agvPivot, setAgvPivot] = useState({ x: 0, y: 0, z: -1.1 });

  const moveAgvZ = (direction: number) => {
    if (!agvGroupRef.current) return;

    const currentPosition = currentAgvZRef.current;
    const step = 0.001;
    let newZ = currentPosition + direction * step;
    newZ = Math.max(-5, Math.min(5, newZ));

    animationRef.current.agvZ = {
      start: currentPosition,
      target: newZ,
      startTime: performance.now(),
      duration: 300,
    };
  };

  const setAgvZPositionDirect = (value: number) => {
    if (!agvGroupRef.current) return;

    const currentPosition = currentAgvZRef.current;
    const newZ = Math.max(-5, Math.min(5, value));

    animationRef.current.agvZ = {
      start: currentPosition,
      target: newZ,
      startTime: performance.now(),
      duration: 500,
    };
  };

  const rotateAgv = (degrees: number) => {
    if (!agvGroupRef.current) return;

    const currentRotation = currentAgvRotationRef.current;
    const newRotation = currentRotation + degrees;

    animationRef.current.agvRotation = {
      start: currentRotation,
      target: newRotation,
      startTime: performance.now(),
      duration: 400,
    };
  };

  const setAgvRotationDirect = (degrees: number) => {
    if (!agvGroupRef.current) return;

    const currentRotation = currentAgvRotationRef.current;

    animationRef.current.agvRotation = {
      start: currentRotation,
      target: degrees,
      startTime: performance.now(),
      duration: 600,
    };
  };

  const updateAgvPivot = (axis: "x" | "y" | "z", value: number) => {
    if (!agvGroupRef.current) return;

    const newPivot = { ...agvPivot, [axis]: value };
    const oldPivot = new THREE.Vector3(agvPivot.x, agvPivot.y, agvPivot.z);
    const newPivotVec = new THREE.Vector3(newPivot.x, newPivot.y, newPivot.z);

    const offset = newPivotVec.clone().sub(oldPivot);
    agvGroupRef.current.position.copy(newPivotVec);

    agvGroupRef.current.children.forEach((child) => {
      child.position.sub(offset);
    });

    setAgvPivot(newPivot);
  };

  return {
    agvGroupRef,
    agvPivotMarkerRef,
    currentAgvZRef,
    currentAgvRotationRef,
    agvZPosition,
    setAgvZPosition,
    agvRotation,
    setAgvRotation,
    agvPivot,
    setAgvPivot,
    moveAgvZ,
    setAgvZPositionDirect,
    rotateAgv,
    setAgvRotationDirect,
    updateAgvPivot,
  };
}
