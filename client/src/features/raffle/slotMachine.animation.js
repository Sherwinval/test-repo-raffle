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

/**
 * Starts the slot machine animation. Reels auto-stop within totalDurationMs,
 * while freezeNextReel() can stop one additional reel early on each Space press.
 *
 * Returns { stop, freezeNextReel }:
 *   - stop()           - cancel the animation loop (cleanup only)
 *   - freezeNextReel() - freeze the leftmost still-spinning reel on its winning
 *                        digit. When all reels are frozen, onComplete() is called.
 */
export const startSlotMachineAnimation = ({
  winner,
  visibleRows,
  reelCount = 7,
  onFrame,
  onComplete,
  totalDurationMs = 3600,
  staggerMs,
}) => {
  const finalDigits = toDisplayDigits(winner, reelCount);
  const durationMs = Math.max(0, Number(totalDurationMs) || 0);
  const autoStaggerMs = Math.max(80, Number(staggerMs) || Math.min(520, Math.max(140, durationMs / (reelCount + 1))));
  const firstAutoStopMs = Math.max(0, durationMs - autoStaggerMs * (reelCount - 1));
  const reels = Array.from({ length: reelCount }, (_, index) => ({
    index,
    frozen: false,
    finalRows: [],
    liveRows: [],
    autoStopAtMs: firstAutoStopMs + autoStaggerMs * index,
  }));

  let frame = 0;
  let rafId = 0;
  let startedAt = null;
  let completed = false;

  const freezeReel = (reel) => {
    if (!reel || reel.frozen) return;
    const finalDigit = finalDigits[reel.index] || '0';
    reel.finalRows = buildReelRows(DIGIT_POOL, finalDigit, visibleRows, reel.index);
    reel.frozen = true;
  };

  const completeIfReady = () => {
    if (completed || !reels.every((r) => r.frozen)) return false;
    completed = true;
    onComplete();
    return true;
  };

  const render = (timestamp) => {
    if (startedAt === null) startedAt = timestamp;
    const elapsedMs = timestamp - startedAt;
    frame += 1;

    const reelRows = reels.map((reel) => {
      if (!reel.frozen && elapsedMs >= reel.autoStopAtMs) {
        freezeReel(reel);
      }

      if (reel.frozen) return reel.finalRows;

      const tick = frame * 2 + reel.index * 11;
      const center = pickDisplayCenter(DIGIT_POOL, reel.index, tick);
      const rows = buildReelRows(DIGIT_POOL, center, visibleRows, tick + reel.index);

      reel.liveRows = rows;
      return rows;
    });

    onFrame(reelRows);

    if (completeIfReady()) return;

    rafId = requestAnimationFrame(render);
  };

  const freezeNextReel = () => {
    const reel = reels.find((r) => !r.frozen);
    if (!reel) return;

    freezeReel(reel);

    const reelRows = reels.map((currentReel) => {
      if (currentReel.frozen) return currentReel.finalRows;
      if (currentReel.liveRows.length > 0) return currentReel.liveRows;
      return buildReelRows(DIGIT_POOL, '0', visibleRows, currentReel.index);
    });
    onFrame(reelRows);
    if (completeIfReady()) cancelAnimationFrame(rafId);
  };

  rafId = requestAnimationFrame(render);

  return {
    stop: () => cancelAnimationFrame(rafId),
    freezeNextReel,
  };
};

export const createInitialReels = (winner, visibleRows, reelCount = 7) => {
  const chars = toDisplayDigits(winner, reelCount);
  return chars.map((char, reelIndex) => buildReelRows(DIGIT_POOL, char || '0', visibleRows, reelIndex));
};
