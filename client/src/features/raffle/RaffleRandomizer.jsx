import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlotMachine } from './SlotMachine';
import { drawWinner, mapEntryIds } from './raffle.logic';
import { addWinnerForEvent, clearWinnersForEvent, fetchAllEventEntries, getWinnersForEvent, confirmWinnerOnServer } from './raffle.service';
import { appendEventAudit } from '@/features/entry-upload/entryUpload.service';

const IconTrophy = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ff8c00', display: 'inline' }}>
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 1012 0V2z" />
  </svg>
);

const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff8c00" stroke="#ff8c00" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'text-bottom' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconMaximize = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const IconMinimize = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
  </svg>
);

export const RaffleRandomizer = ({ selectedEvent, uploadState, onStatsChange, onSpinStateChange, onAuditChange }) => {
  const [entries, setEntries] = useState([]);
  const [winners, setWinners] = useState([]);
  const [error, setError] = useState('');
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinComplete, setSpinComplete] = useState(false);
  const [pendingWinner, setPendingWinner] = useState(null);
  const [redrawContext, setRedrawContext] = useState(null);
  const [auditVisible, setAuditVisible] = useState(false);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [drawDurationSec, setDrawDurationSec] = useState(4);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isConfirmingWinner, setIsConfirmingWinner] = useState(false);
  const containerRef = useRef(null);

  const uploadStatus = uploadState?.status || 'idle';
  const uploadIsActive = Boolean(uploadState?.isActive);

  const loadEntries = useCallback(() => {
    if (!selectedEvent?.id) return;
    let isCurrent = true;
    setIsLoadingEntries(true);
    fetchAllEventEntries(selectedEvent.id)
      .then((rows) => {
        if (!isCurrent) return;
        setEntries(rows);
        setError('');
      })
      .catch((e) => {
        if (!isCurrent) return;
        setError(e.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingEntries(false);
      });

    setWinners(getWinnersForEvent(selectedEvent.id));
    setIsSpinning(false);
    setSpinComplete(false);
    setPendingWinner(null);
    setShowWinnerPopup(false);
    return () => {
      isCurrent = false;
    };
  }, [selectedEvent?.id]);

  useEffect(() => loadEntries(), [loadEntries]);

  useEffect(() => {
    if (uploadStatus !== 'done') return undefined;
    return loadEntries();
  }, [loadEntries, uploadStatus]);

  const excludedWinnerIds = useMemo(() => new Set(winners.map((w) => w.entry.id)), [winners]);
  const eligibleEntries = useMemo(() => entries.filter((entry) => !excludedWinnerIds.has(entry.id)), [entries, excludedWinnerIds]);
  const eligibleIds = useMemo(() => mapEntryIds(eligibleEntries), [eligibleEntries]);
  const spinIsPreparing = uploadIsActive || isLoadingEntries;
  const spinDisabled = isSpinning || spinIsPreparing || eligibleEntries.length === 0;
  const spinLabel = isSpinning
    ? 'SPINNING...'
    : uploadIsActive
      ? 'PREPARING ENTRIES...'
      : isLoadingEntries
        ? 'LOADING ENTRIES...'
        : eligibleEntries.length === 0
          ? 'NO ENTRIES READY'
          : 'SPIN';

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ total: entries.length, eligible: eligibleEntries.length, drawn: winners.length });
    }
  }, [entries.length, eligibleEntries.length, winners.length, onStatsChange]);

  useEffect(() => {
    onSpinStateChange?.(isSpinning);
  }, [isSpinning, onSpinStateChange]);

  const writeAudit = async (action, details = {}) => {
    if (!selectedEvent?.id) return;
    try {
      await appendEventAudit({ eventId: selectedEvent.id, action, details });
      onAuditChange?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const preselectWinner = async (redraw = null) => {
    const excluded = redraw?.originalWinner?.entry?.id
      ? new Set([...excludedWinnerIds, redraw.originalWinner.entry.id])
      : excludedWinnerIds;
    const result = drawWinner(entries, excluded);
    const winnerLock = { winner: result.winner, fingerprint: result.fingerprint, preselectedAt: new Date().toISOString() };

    setPendingWinner(winnerLock);
    setRedrawContext(redraw);
    setSpinComplete(false);
    setIsSpinning(true);
    setShowWinnerPopup(false);
    setError('');

    console.info(`Winner pre-selected: ${winnerLock.winner.employeeId} | Draw fingerprint: ${winnerLock.fingerprint}`);
    await writeAudit(redraw ? 'redraw_logged' : 'draw_initiated', redraw ? {
      reason: redraw.reason,
      originalWinner: {
        id: redraw.originalWinner.entry.id,
        employeeId: redraw.originalWinner.entry.employeeId,
        fullName: redraw.originalWinner.entry.fullName,
        drawnAt: redraw.originalWinner.drawnAt,
        fingerprint: redraw.originalWinner.fingerprint
      },
      newWinner: {
        id: winnerLock.winner.id,
        employeeId: winnerLock.winner.employeeId,
        fullName: winnerLock.winner.fullName
      },
      newFingerprint: winnerLock.fingerprint
    } : {
      eligibleCount: result.eligibleCount,
      winner: {
        id: winnerLock.winner.id,
        employeeId: winnerLock.winner.employeeId,
        fullName: winnerLock.winner.fullName
      },
      fingerprint: winnerLock.fingerprint
    });
  };

  const handleToggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isSpinning) {
          return;
        } else if (spinComplete) {
          confirmWinner();
        } else if (eligibleEntries.length > 0 && !spinIsPreparing) {
          preselectWinner();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpinning, spinComplete, spinIsPreparing, eligibleEntries.length]);

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setSpinComplete(true);
    setShowWinnerPopup(true);
  };

  const confirmWinner = async () => {
    if (!pendingWinner || !selectedEvent?.id || isConfirmingWinner) return;

    setIsConfirmingWinner(true);
    setError('');

    const winnerRecord = {
      entry: pendingWinner.winner,
      drawnAt: new Date().toISOString(),
      fingerprint: pendingWinner.fingerprint
    };

    try {
      await confirmWinnerOnServer({
        eventId: selectedEvent.id,
        entryId: pendingWinner.winner.id,
        fingerprint: pendingWinner.fingerprint,
        redrawReason: redrawContext?.reason || null
      });
    } catch (err) {
      setError(err.message);
      setIsConfirmingWinner(false);
      return;
    }

    const next = addWinnerForEvent(selectedEvent.id, winnerRecord);
    setWinners(next);
    onAuditChange?.();
    setPendingWinner(null);
    setRedrawContext(null);
    setSpinComplete(false);
    setIsConfirmingWinner(false);
    setShowWinnerPopup(false);
  };

  const handleRedrawLastWinner = () => {
    const originalWinner = winners[0];
    if (!originalWinner || isSpinning) return;
    const reason = window.prompt('Reason for redraw');
    if (!reason?.trim()) return;
    preselectWinner({ originalWinner, reason: reason.trim() });
  };

  const onReset = async () => {
    if (!selectedEvent?.id) return;
    setWinners(clearWinnersForEvent(selectedEvent.id));
    setPendingWinner(null);
    setRedrawContext(null);
    setSpinComplete(false);
    setIsSpinning(false);
    setShowWinnerPopup(false);
    await writeAudit('winners_reset', { clearedAt: new Date().toISOString() });
  };

  if (!selectedEvent) {
    return (
      <div className="soft-card raffle-card">
        <p className="card-heading">Raffle Randomizer</p>
        <p className="tiny-copy">Select an event in Entry Upload first.</p>
      </div>
    );
  }

  return (
    <div className={`raffle-wrap${isFullScreen ? ' is-fullscreen' : ''}`} ref={containerRef}>
      <div className="soft-card raffle-card">
        <div className="split-row raffle-header-row">
          <div>
            <p className="card-heading">Raffle Randomizer</p>
            <p className="tiny-copy">Winner is cryptographically locked before animation starts.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" className="btn-ghost-sm fullscreen-btn" onClick={handleToggleFullScreen} title="Toggle Fullscreen">
              {isFullScreen ? <IconMinimize /> : <IconMaximize />}
            </button>
            <span className="entries-total-badge">{selectedEvent.name}</span>
          </div>
        </div>

        <div className="raffle-stats-row">
          <span className="pill pill--neutral">Total: {entries.length}</span>
          <span className="pill pill--accent">Eligible: {eligibleEntries.length}</span>
          <span className="pill pill--success">Drawn: {winners.length}</span>
        </div>

        <div className="draw-duration-wrap">
          <label htmlFor="draw-duration" className="field-label">Draw Duration: {drawDurationSec}s</label>
          <input id="draw-duration" type="range" min="2" max="12" step="1" value={drawDurationSec} onChange={(e) => setDrawDurationSec(Number(e.target.value))} disabled={isSpinning} className="draw-duration-slider" style={{ '--slider-percent': `${((drawDurationSec - 2) / 10) * 100}%` }} />
        </div>

        <SlotMachine
          winner={pendingWinner?.winner?.employeeId || eligibleIds[0] || '---'}
          isSpinning={isSpinning}
          onSpinComplete={handleSpinComplete}
          reelCount={7}
          visibleRows={5}
          spinDurationMs={drawDurationSec * 1000}
        />

        <div className="raffle-action-row">
          <button type="button" className="btn-primary action-btn spin-btn" onClick={() => preselectWinner()} disabled={spinDisabled}>
            {spinIsPreparing && <span className="button-spinner" aria-hidden="true" />}
            {spinLabel}
          </button>
          {spinComplete && pendingWinner && <button type="button" className="btn-primary action-btn claim-btn" onClick={confirmWinner} disabled={isConfirmingWinner}>
            {isConfirmingWinner && <span className="button-spinner" aria-hidden="true" />}
            CLAIM / CONFIRM WINNER
          </button>}
          <button type="button" className="btn-ghost" onClick={handleRedrawLastWinner} disabled={isSpinning || winners.length === 0 || eligibleEntries.length === 0}>Redraw Last Winner</button>
          <button type="button" className="btn-ghost" onClick={onReset} disabled={isSpinning}>Reset Winners</button>
        </div>

        {pendingWinner && auditVisible && (
          <div className="audit-panel">
            <p className="card-subheading">Audit</p>
            <p className="card-copy">Winner pre-selected: <strong>{pendingWinner.winner.employeeId}</strong><br />Draw fingerprint: <code>{pendingWinner.fingerprint}</code></p>
            {redrawContext?.reason && <p className="tiny-copy">Redraw reason: {redrawContext.reason}</p>}
            <p className="tiny-copy">Preselected at: {new Date(pendingWinner.preselectedAt).toLocaleString()}</p>
          </div>
        )}

        <button type="button" className="btn-ghost audit-toggle-btn" onClick={() => setAuditVisible((v) => !v)}>{auditVisible ? 'Hide audit log' : 'Show audit log'}</button>
        {error && <div className="error-card raffle-error-card">{error}</div>}
      </div>

      <div className="soft-card raffle-history-card">
        <p className="card-heading"><IconStar /> Winner History</p>
        {winners.length === 0 ? <p className="tiny-copy winner-empty">No winners drawn yet. Run your first draw to see results here.</p> : (
          <ul className="winner-history">
            {winners.map((winner) => (
              <li key={`${winner.entry.id}-${winner.drawnAt}`}>
                <strong>{winner.entry.employeeId}</strong> - {winner.entry.fullName}
                <span className="tiny-copy winner-time">{new Date(winner.drawnAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showWinnerPopup && pendingWinner && (
        <div className="winner-popup-backdrop" onClick={() => setShowWinnerPopup(false)}>
          <div className="winner-popup" onClick={(e) => e.stopPropagation()}>
            <p className="winner-popup-title"><IconTrophy /> You win, {pendingWinner.winner.fullName}!</p>
            <p className="tiny-copy">Employee ID: {pendingWinner.winner.employeeId}</p>
            <button type="button" className="btn-primary action-btn" onClick={() => setShowWinnerPopup(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
