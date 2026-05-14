import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  createInitialReels, 
  toDisplayDigits, 
  easeOutCubic, 
  DIGIT_POOL, 
  buildReelRows, 
  pickDisplayCenter 
} from './slotMachine.animation';

export const SlotMachine = ({
  winner,
  isSpinning,
  isStopping = false,
  onSpinComplete,
  reelCount = 7,
  visibleRows = 3,
}) => {
  const normalizedRows = visibleRows % 2 === 0 ? visibleRows + 1 : visibleRows;
  const centerRowIndex = Math.trunc(normalizedRows / 2);
  const initialReels = useMemo(() => createInitialReels(winner, normalizedRows, reelCount), [winner, normalizedRows, reelCount]);
  const [reels, setReels] = useState(initialReels);
  
  const animRef = useRef({
    frame: 0,
    reelsData: []
  });

  // Reset when starting a new spin
  useEffect(() => {
    if (!isSpinning) {
      setReels(initialReels);
      animRef.current = { frame: 0, reelsData: [] };
    }
  }, [isSpinning, initialReels]);

  useEffect(() => {
    if (!isSpinning) return undefined;

    const winnerChars = toDisplayDigits(winner, reelCount);
    const landingDurationMs = 600; 
    const staggerMs = 150;

    // Initialize reels data
    if (animRef.current.reelsData.length === 0) {
      animRef.current.reelsData = Array.from({ length: reelCount }, (_, index) => ({
        index,
        triggeredAt: null,
        frozen: false,
        finalRows: []
      }));
    }

    let rafId;
    const render = (now) => {
      animRef.current.frame += 1;
      const frameCount = animRef.current.frame;

      const newReelRows = animRef.current.reelsData.map((reel, i) => {
        // If stopping was triggered, set landing time with stagger
        if (isStopping && !reel.triggeredAt) {
          reel.triggeredAt = now + i * staggerMs;
        }

        if (reel.frozen) return reel.finalRows;

        if (reel.triggeredAt && now >= reel.triggeredAt) {
          const elapsed = now - reel.triggeredAt;
          const progress = Math.min(1, elapsed / landingDurationMs);
          const eased = easeOutCubic(progress);

          if (progress >= 1) {
            const target = winnerChars[reel.index] ?? '0';
            reel.finalRows = buildReelRows(DIGIT_POOL, target, normalizedRows, reel.index + frameCount);
            reel.frozen = true;
            return reel.finalRows;
          }

          // Slow down animation towards the target
          const fastTick = frameCount * 2 + reel.index * 11;
          const slowTick = Math.round(fastTick * (1 - eased));
          const center = pickDisplayCenter(DIGIT_POOL, reel.index, slowTick);
          return buildReelRows(DIGIT_POOL, center, normalizedRows, slowTick + reel.index);
        }

        // Infinite fast spin
        const fastTick = frameCount * 2 + reel.index * 11;
        const center = pickDisplayCenter(DIGIT_POOL, reel.index, fastTick);
        return buildReelRows(DIGIT_POOL, center, normalizedRows, fastTick + reel.index);
      });

      setReels(newReelRows);

      if (animRef.current.reelsData.every(r => r.frozen)) {
        onSpinComplete();
        return;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [isSpinning, isStopping, winner, normalizedRows, reelCount, onSpinComplete]);

  return (
    <div className="slot-machine">
      <div className="slot-machine-mask" />
      <div className="slot-machine-result-line" />
      <div className="slot-machine-grid" style={{ gridTemplateColumns: `repeat(${reelCount}, 1fr)` }}>
        {reels.map((reel, reelIndex) => (
          <div key={`reel-${reelIndex}`} className="slot-reel">
            {reel.map((value, rowIndex) => (
              <div key={`reel-${reelIndex}-row-${rowIndex}-${value}`} className={`slot-cell${rowIndex === centerRowIndex ? ' slot-cell--center' : ''}`}>
                {value}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
