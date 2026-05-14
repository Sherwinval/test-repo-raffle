const DEFAULT_TOTAL_DURATION_MS = 3600;
const DEFAULT_STAGGER_MS = 450;

export const easeOutCubic = (t) => 1 - ((1 - t) ** 3);
const safeModulo = (value, length) => ((value % length) + length) % length;

export const DIGIT_POOL = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const buildReelRows = (pool, centerValue, visibleRows, offsetSeed) => {
  const half = (visibleRows - 1) / 2;
  const centerIndex = pool.indexOf(centerValue);
  const baseIndex = centerIndex >= 0 ? centerIndex : safeModulo(offsetSeed, pool.length);

  return Array.from({ length: visibleRows }, (_, rowIdx) => {
    const shift = rowIdx - half;
    const index = safeModulo(baseIndex + shift, pool.length);
    return pool[index];
  });
};

export const pickDisplayCenter = (pool, reelIndex, tick) => {
  const seed = (reelIndex + 1) * 37 + tick * 17;
  return pool[safeModulo(seed, pool.length)];
};

export const toDisplayDigits = (winnerId, reelCount = 7) => {
  const digitsOnly = String(winnerId || '').replace(/\D/g, '');
  const normalized = (digitsOnly || '0').slice(-reelCount).padStart(reelCount, '0');
  return normalized.split('');
};

export const startSlotMachineAnimation = ({
  winner,
  visibleRows,
  reelCount = 7,
  totalDurationMs = DEFAULT_TOTAL_DURATION_MS,
  staggerMs = DEFAULT_STAGGER_MS,
  onFrame,
  onComplete
}) => {
  const winnerChars = toDisplayDigits(winner, reelCount);
  const startTime = performance.now();
  const totalStaggerMs = (reelCount - 1) * staggerMs;
  const perReelBaseMs = Math.max(totalDurationMs - totalStaggerMs, staggerMs);

  const reels = Array.from({ length: reelCount }, (_, index) => ({
    index,
    stopTime: startTime + perReelBaseMs + index * staggerMs,
    frozen: false,
    finalRows: []
  }));

  let frame = 0;
  let rafId = 0;

  const render = (time) => {
    frame += 1;

    const reelRows = reels.map((reel) => {
      const remaining = reel.stopTime - time;
      const progress = Math.min(1, Math.max(0, (perReelBaseMs - remaining) / perReelBaseMs));
      const eased = easeOutCubic(progress);

      if (time >= reel.stopTime) {
        if (!reel.frozen) {
          const target = winnerChars[reel.index] ?? '0';
          reel.finalRows = buildReelRows(DIGIT_POOL, target, visibleRows, reel.index + frame);
          reel.frozen = true;
        }
        return reel.finalRows;
      }

      const fastTick = frame * 2 + reel.index * 11;
      const slowTick = Math.round(fastTick * (1 - eased * 0.8));
      const center = pickDisplayCenter(DIGIT_POOL, reel.index, slowTick);
      return buildReelRows(DIGIT_POOL, center, visibleRows, slowTick + reel.index);
    });

    onFrame(reelRows);

    if (reels.every((reel) => reel.frozen)) {
      onComplete();
      return;
    }

    rafId = requestAnimationFrame(render);
  };

  rafId = requestAnimationFrame(render);
  return () => cancelAnimationFrame(rafId);
};

export const createInitialReels = (winner, visibleRows, reelCount = 7) => {
  const chars = toDisplayDigits(winner, reelCount);
  return chars.map((char, reelIndex) => buildReelRows(DIGIT_POOL, char || '0', visibleRows, reelIndex));
};
