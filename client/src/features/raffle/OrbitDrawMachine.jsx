import { useEffect, useMemo, useState } from 'react';

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

export const OrbitDrawMachine = ({ entries, winner, isSpinning, onSpinComplete, spinDurationMs = 3600 }) => {
  const pool = useMemo(() => normalizePool(entries), [entries]);
  const [orbitItems, setOrbitItems] = useState(() => buildOrbit(pool, 0));

  useEffect(() => {
    setOrbitItems(buildOrbit(pool, 0));
  }, [pool]);

  useEffect(() => {
    if (!isSpinning) return undefined;

    let active = true;
    let offset = 0;
    let rafId = 0;
    const start = performance.now();

    const frame = (now) => {
      if (!active) return;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / spinDurationMs);
      const speed = 1 + Math.round((1 - progress) * 10);
      offset = (offset + speed) % pool.length;
      setOrbitItems(buildOrbit(pool, offset));

      if (progress >= 1) {
        active = false;
        setOrbitItems(buildOrbit(pool, offset));
        onSpinComplete();
        return;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [isSpinning, onSpinComplete, pool, spinDurationMs]);

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
