import { useEffect, useMemo, useState } from 'react';
import { createInitialReels, startSlotMachineAnimation } from './slotMachine.animation';

export const SlotMachine = ({
  winner,
  isSpinning,
  onSpinComplete,
  reelCount = 7,
  visibleRows = 3,
  spinDurationMs = 3600,
}) => {
  const normalizedRows = visibleRows % 2 === 0 ? visibleRows + 1 : visibleRows;
  const centerRowIndex = Math.trunc(normalizedRows / 2);
  const initialReels = useMemo(() => createInitialReels(winner, normalizedRows, reelCount), [winner, normalizedRows, reelCount]);
  const [reels, setReels] = useState(initialReels);

  useEffect(() => {
    setReels(initialReels);
  }, [initialReels]);

  useEffect(() => {
    if (!isSpinning) return undefined;
    const stop = startSlotMachineAnimation({
      winner,
      reelCount,
      visibleRows: normalizedRows,
      totalDurationMs: spinDurationMs,
      onFrame: setReels,
      onComplete: onSpinComplete,
    });
    return stop;
  }, [isSpinning, winner, normalizedRows, onSpinComplete, reelCount, spinDurationMs]);

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
