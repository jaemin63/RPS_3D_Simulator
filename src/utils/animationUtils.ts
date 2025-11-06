/**
 * Easing 함수: ease-out-cubic
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * 애니메이션 진행률 계산
 */
export function calculateProgress(startTime: number, duration: number, now: number): number {
  const elapsed = now - startTime;
  return Math.min(elapsed / duration, 1);
}

/**
 * 애니메이션 값 계산 (easing 적용)
 */
export function calculateAnimatedValue(
  start: number,
  target: number,
  progress: number,
  easingFn: (t: number) => number = easeOutCubic
): number {
  const eased = easingFn(progress);
  return start + (target - start) * eased;
}

/**
 * Promise 기반 대기 함수
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
