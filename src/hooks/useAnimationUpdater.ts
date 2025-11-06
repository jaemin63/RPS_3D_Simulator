import { useRef, useCallback } from "react";
import * as THREE from "three";
import type { AnimationState } from "../types";
import { easeOutCubic } from "../utils/animationUtils";

interface AnimationRefs {
  agvGroupRef: React.MutableRefObject<THREE.Group | null>;
  liftGroupRef: React.MutableRefObject<THREE.Group | null>;
  secondGroupRef: React.MutableRefObject<THREE.Group | null>;
  currentAgvZRef: React.MutableRefObject<number>;
  currentAgvRotationRef: React.MutableRefObject<number>;
  currentLiftYRef: React.MutableRefObject<number>;
  currentSecondZRef: React.MutableRefObject<number>;
}

interface AnimationSetters {
  setAgvZPosition: (value: number) => void;
  setAgvRotation: (value: number) => void;
  setLiftYPosition: (value: number) => void;
  setSecondLocalZ: (value: number) => void;
}

export function useAnimationUpdater(refs: AnimationRefs, setters: AnimationSetters) {
  const animationRef = useRef<AnimationState>({});

  const updateAnimations = useCallback(() => {
    const now = performance.now();
    const anims = animationRef.current;

    // AGV Z축 애니메이션
    if (anims.agvZ && refs.agvGroupRef.current) {
      const elapsed = now - anims.agvZ.startTime;
      const progress = Math.min(elapsed / anims.agvZ.duration, 1);
      const eased = easeOutCubic(progress);

      const currentZ = anims.agvZ.start + (anims.agvZ.target - anims.agvZ.start) * eased;
      const offset = currentZ - refs.currentAgvZRef.current;

      refs.agvGroupRef.current.position.z += offset;
      refs.currentAgvZRef.current = currentZ;
      setters.setAgvZPosition(currentZ);

      if (progress >= 1) {
        delete anims.agvZ;
      }
    }

    // AGV 회전 애니메이션
    if (anims.agvRotation && refs.agvGroupRef.current) {
      const elapsed = now - anims.agvRotation.startTime;
      const progress = Math.min(elapsed / anims.agvRotation.duration, 1);
      const eased = easeOutCubic(progress);

      const currentRotation = anims.agvRotation.start + (anims.agvRotation.target - anims.agvRotation.start) * eased;
      refs.agvGroupRef.current.rotation.y = THREE.MathUtils.degToRad(currentRotation);
      refs.currentAgvRotationRef.current = currentRotation;
      setters.setAgvRotation(currentRotation);

      if (progress >= 1) {
        delete anims.agvRotation;
      }
    }

    // SECOND Z축 애니메이션
    if (anims.secondZ && refs.secondGroupRef.current) {
      const elapsed = now - anims.secondZ.startTime;
      const progress = Math.min(elapsed / anims.secondZ.duration, 1);
      const eased = easeOutCubic(progress);

      const currentZ = anims.secondZ.start + (anims.secondZ.target - anims.secondZ.start) * eased;
      const offset = currentZ - refs.currentSecondZRef.current;

      const localDirection = new THREE.Vector3(0, 0, 1);
      const worldDirection = localDirection.applyQuaternion(refs.secondGroupRef.current.quaternion);
      const movement = worldDirection.multiplyScalar(offset);

      refs.secondGroupRef.current.position.add(movement);
      refs.currentSecondZRef.current = currentZ;
      setters.setSecondLocalZ(currentZ);

      if (progress >= 1) {
        delete anims.secondZ;
      }
    }

    // LIFT Y축 애니메이션
    if (anims.liftY && refs.liftGroupRef.current) {
      const elapsed = now - anims.liftY.startTime;
      const progress = Math.min(elapsed / anims.liftY.duration, 1);
      const eased = easeOutCubic(progress);

      const currentY = anims.liftY.start + (anims.liftY.target - anims.liftY.start) * eased;
      const offset = currentY - refs.currentLiftYRef.current;

      refs.liftGroupRef.current.position.y += offset;
      refs.currentLiftYRef.current = currentY;
      setters.setLiftYPosition(currentY);

      if (progress >= 1) {
        delete anims.liftY;
      }
    }
  }, [refs, setters]);

  return {
    animationRef,
    updateAnimations,
  };
}
