const UINT32_MAX = 4294967296;

/**
 * Converts random bytes to hex for an auditable fingerprint.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Uniform integer generator in [0, maxExclusive) using rejection sampling.
 * No Math.random() or Math.floor() is used.
 * @param {number} maxExclusive
 * @returns {{ value: number, fingerprint: string }}
 */
export const secureRandomInt = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('maxExclusive must be a positive integer.');
  }

  const limit = UINT32_MAX - (UINT32_MAX % maxExclusive);
  const source = new Uint32Array(1);
  const fingerprintBytes = new Uint8Array(16);
  crypto.getRandomValues(fingerprintBytes);

  let value = 0;
  do {
    crypto.getRandomValues(source);
    value = source[0];
  } while (value >= limit);

  return {
    value: value % maxExclusive,
    fingerprint: toHex(fingerprintBytes)
  };
};

/**
 * Picks one item from an array using crypto entropy.
 * @template T
 * @param {T[]} items
 * @returns {{ item: T, index: number, fingerprint: string }}
 */
export const pickOneSecure = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cannot pick from an empty list.');
  }
  const result = secureRandomInt(items.length);
  return { item: items[result.value], index: result.value, fingerprint: result.fingerprint };
};
