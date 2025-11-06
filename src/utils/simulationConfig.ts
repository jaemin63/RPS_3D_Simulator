import type { SimulationStep } from "../types";

/**
 * 반복되는 동작 패턴 정의
 */
export const PICKUP_PATTERN: SimulationStep[] = [
  { action: "LIFT", value: -0.3, duration: 800 },
  { action: "SECOND", value: -0.8, duration: 800 },
  { action: "LIFT", value: -0.4, duration: 800 },
  { action: "SECOND", value: 0, duration: 800 },
];

export const MIDDLE_PATTERN: SimulationStep[] = [
  { action: "LIFT", value: 0.6, duration: 1000 },
  { action: "SECOND", value: -0.8, duration: 800 },
  { action: "LIFT", value: 0.5, duration: 800 },
  { action: "SECOND", value: 0, duration: 800 },
];

export const TOP_PATTERN: SimulationStep[] = [
  { action: "LIFT", value: 1.5, duration: 1200 },
  { action: "SECOND", value: -0.8, duration: 800 },
  { action: "LIFT", value: 1.4, duration: 800 },
  { action: "SECOND", value: 0, duration: 800 },
];

/**
 * Y축 회전 각도 목록
 */
export const ROTATION_ANGLES = [82, 112, 138, 167, 194, 222, 249];

/**
 * 전체 시뮬레이션 시퀀스 생성
 */
export function generateSimulationSteps(): SimulationStep[] {
  const steps: SimulationStep[] = [
    // 초기 위치 이동
    { action: "AGV Z", value: 1.2, duration: 1500 },
    { action: "AGV Rotation", value: ROTATION_ANGLES[0], duration: 1500 },

    // 첫 번째 사이클 (82도)
    ...PICKUP_PATTERN,
    ...MIDDLE_PATTERN,
    ...TOP_PATTERN,
  ];

  // 나머지 위치들 추가
  for (let i = 1; i < ROTATION_ANGLES.length; i++) {
    const angle = ROTATION_ANGLES[i];
    const duration = i % 2 === 0 ? 1000 : 1200; // 짝수 인덱스는 1000ms, 홀수는 1200ms

    steps.push({ action: "AGV Rotation", value: angle, duration });

    // 홀수 위치: Top → Middle → Pickup
    // 짝수 위치: Pickup → Middle → Top
    if (i % 2 === 1) {
      steps.push(...TOP_PATTERN, ...MIDDLE_PATTERN, ...PICKUP_PATTERN);
    } else {
      steps.push(...PICKUP_PATTERN, ...MIDDLE_PATTERN, ...TOP_PATTERN);
    }
  }

  return steps;
}
