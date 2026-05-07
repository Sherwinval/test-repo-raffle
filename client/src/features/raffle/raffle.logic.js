import { pickOneSecure } from '@/utils/cryptoRandom';

/**
 * @param {Array<{id:string, employeeId:string}>} entries
 * @param {Set<string>} excludedWinnerIds
 * @returns {{winner: any, fingerprint: string, eligibleCount: number}}
 */
export const drawWinner = (entries, excludedWinnerIds) => {
  const excluded = excludedWinnerIds || new Set();
  const eligible = entries.filter((entry) => !excluded.has(entry.id));

  if (eligible.length === 0) {
    throw new Error('No eligible entries remain.');
  }

  const picked = pickOneSecure(eligible);
  return { winner: picked.item, fingerprint: picked.fingerprint, eligibleCount: eligible.length };
};

export const mapEntryIds = (entries) => entries.map((entry) => entry.employeeId).filter(Boolean);
