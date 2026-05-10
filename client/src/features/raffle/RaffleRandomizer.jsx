import { useEffect, useMemo, useState } from 'react';
import { SlotMachine } from './SlotMachine';
import { OrbitDrawMachine } from './OrbitDrawMachine';
import { drawWinner, mapEntryIds } from './raffle.logic';
import { addWinnerForEvent, clearWinnersForEvent, fetchAllEventEntries, getWinnersForEvent } from './raffle.service';

const IconTrophy = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ff8c00', display: 'inline' }}>
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/>
  </svg>
);

const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff8c00" stroke="#ff8c00" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'text-bottom' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const RaffleRandomizer = ({ selectedEvent, onStatsChange }) => {
  const [entries, setEntries] = useState([]);
  const [winners, setWinners] = useState([]);
  const [error, setError] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinComplete, setSpinComplete] = useState(false);
  const [pendingWinner, setPendingWinner] = useState(null);
  const [auditVisible, setAuditVisible] = useState(true);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [drawDurationSec, setDrawDurationSec] = useState(4);
  const [raffleStyle, setRaffleStyle] = useState('classic');

  useEffect(() => {
    if (!selectedEvent?.id) return;
    fetchAllEventEntries(selectedEvent.id)
      .then((rows) => {
        setEntries(rows);
        setError('');
      })
      .catch((e) => setError(e.message));

    setWinners(getWinnersForEvent(selectedEvent.id));
    setIsSpinning(false);
    setSpinComplete(false);
    setPendingWinner(null);
    setShowWinnerPopup(false);
  }, [selectedEvent]);

  const excludedWinnerIds = useMemo(() => new Set(winners.map((w) => w.entry.id)), [winners]);
  const eligibleEntries = useMemo(() => entries.filter((entry) => !excludedWinnerIds.has(entry.id)), [entries, excludedWinnerIds]);
  const eligibleIds = useMemo(() => mapEntryIds(eligibleEntries), [eligibleEntries]);

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ total: entries.length, eligible: eligibleEntries.length, drawn: winners.length });
    }
  }, [entries.length, eligibleEntries.length, winners.length, onStatsChange]);

  const preselectWinner = () => {
    const result = drawWinner(entries, excludedWinnerIds);
    const winnerLock = { winner: result.winner, fingerprint: result.fingerprint, preselectedAt: new Date().toISOString() };

    setPendingWinner(winnerLock);
    setSpinComplete(false);
    setIsSpinning(true);
    setShowWinnerPopup(false);
    setError('');

    console.info(`Winner pre-selected: ${winnerLock.winner.employeeId} | Draw fingerprint: ${winnerLock.fingerprint}`);
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setSpinComplete(true);
    setShowWinnerPopup(true);
  };

  const confirmWinner = () => {
    if (!pendingWinner || !selectedEvent?.id) return;

    const winnerRecord = {
      entry: pendingWinner.winner,
      drawnAt: new Date().toISOString(),
      fingerprint: pendingWinner.fingerprint
    };

    const next = addWinnerForEvent(selectedEvent.id, winnerRecord);
    setWinners(next);
    setPendingWinner(null);
    setSpinComplete(false);
    setShowWinnerPopup(false);
  };

  const onReset = () => {
    if (!selectedEvent?.id) return;
    setWinners(clearWinnersForEvent(selectedEvent.id));
    setPendingWinner(null);
    setSpinComplete(false);
    setIsSpinning(false);
    setShowWinnerPopup(false);
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
    <div className="raffle-wrap">
      <div className="soft-card raffle-card">
        <div className="split-row raffle-header-row">
          <div>
            <p className="card-heading">Raffle Randomizer</p>
            <p className="tiny-copy">Winner is cryptographically locked before animation starts.</p>
          </div>
          <span className="entries-total-badge">{selectedEvent.name}</span>
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

        <div className="draw-duration-wrap">
          <label htmlFor="raffle-style" className="field-label">Raffle Style</label>
          <select id="raffle-style" className="entries-filter" value={raffleStyle} onChange={(e) => setRaffleStyle(e.target.value)} disabled={isSpinning}>
            <option value="classic">Classic Digit Slot</option>
            <option value="orbit">Orbit Draw</option>
          </select>
        </div>

        {raffleStyle === 'orbit' ? (
          <OrbitDrawMachine
            entries={eligibleIds}
            winner={pendingWinner?.winner?.employeeId || eligibleIds[0] || '0000000'}
            isSpinning={isSpinning}
            onSpinComplete={handleSpinComplete}
            spinDurationMs={drawDurationSec * 1000}
          />
        ) : (
          <SlotMachine
            entries={eligibleIds}
            winner={pendingWinner?.winner?.employeeId || eligibleIds[0] || '---'}
            isSpinning={isSpinning}
            onSpinComplete={handleSpinComplete}
            reelCount={7}
            visibleRows={5}
            spinDurationMs={drawDurationSec * 1000}
          />
        )}

        <div className="raffle-action-row">
          <button type="button" className="btn-primary action-btn spin-btn" onClick={preselectWinner} disabled={isSpinning || eligibleEntries.length === 0}>SPIN</button>
          {spinComplete && pendingWinner && <button type="button" className="btn-primary action-btn claim-btn" onClick={confirmWinner}>CLAIM / CONFIRM WINNER</button>}
          <button type="button" className="btn-ghost" onClick={onReset} disabled={isSpinning}>Reset Winners</button>
        </div>

        {pendingWinner && auditVisible && (
          <div className="audit-panel">
            <p className="card-subheading">Audit</p>
            <p className="card-copy">Winner pre-selected: <strong>{pendingWinner.winner.employeeId}</strong><br />Draw fingerprint: <code>{pendingWinner.fingerprint}</code></p>
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
