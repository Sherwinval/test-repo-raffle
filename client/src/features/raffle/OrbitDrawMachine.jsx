import { useEffect, useMemo, useRef, useState } from 'react';

const ORBIT_ITEMS = 14;

const normalizePool = (entries) => {
  const values = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (values.length === 0) return ['0000000'];
  return values;
};

const buildOrbit = (pool, offset) => {
  return Array.from({ length: ORBIT_ITEMS }, (_, index) => {
    const safeIndex = (offset + index) % pool.length;
    return pool[safeIndex];
  });
};

export const OrbitDrawMachine = ({ entries, winner, isSpinning, isStopping, onSpinComplete, spinDurationMs = 3600 }) => {
  const pool = useMemo(() => normalizePool(entries), [entries]);
  const [orbitItems, setOrbitItems] = useState(() => buildOrbit(pool, 0));
  
  const animRef = useRef({
    accumulatedTime: 0,
    offset: 0
  });

  useEffect(() => {
    setOrbitItems(buildOrbit(pool, 0));
    animRef.current = { accumulatedTime: 0, offset: 0 };
  }, [pool]);

  useEffect(() => {
    if (!isSpinning) {
      animRef.current = { accumulatedTime: 0, offset: 0 };
      return undefined;
    }
    
    // For Orbit, we just stop everything when the stop is hit
    if (isStopping) {
      onSpinComplete();
      return undefined;
    }

    let rafId = 0;
    const startRealTime = performance.now();

    const frame = (now) => {
      const currentElapsed = animRef.current.accumulatedTime + (now - startRealTime);
      const progress = Math.min(1, currentElapsed / spinDurationMs);
      const speed = 1 + Math.round((1 - progress) * 10);
      
      animRef.current.offset = (animRef.current.offset + speed) % pool.length;
      setOrbitItems(buildOrbit(pool, animRef.current.offset));

      if (progress >= 1) {
        onSpinComplete();
        return;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      animRef.current.accumulatedTime += (performance.now() - startRealTime);
    };
  }, [isSpinning, stoppedCount, onSpinComplete, pool, spinDurationMs]);

  return (
    <div className="orbit-machine">
      <div className="orbit-ring">
        {orbitItems.map((value, index) => {
          const angle = (360 / ORBIT_ITEMS) * index;
          return (
            <div key={`orbit-${value}-${index}`} className="orbit-node" style={{ transform: `rotate(${angle}deg) translateY(-9.2rem)` }}>
              <span>{value}</span>
            </div>
          );
        })}
      </div>
      <div className="orbit-center">
        <p className="tiny-copy">Locked Winner</p>
        <strong>{winner}</strong>
      </div>
    </div>
  );
};
