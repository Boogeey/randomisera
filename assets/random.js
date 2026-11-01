'use strict';

// Rejection sampling avoids bias when the interval does not divide 2^32.
function randomInt(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 4294967296) throw Error('Intervallet är för stort.');
  const value = new Uint32Array(1), limit = Math.floor(4294967296 / n) * n;
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return value[0] % n;
}

function shuffle(items, integer = randomInt) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = integer(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

module.exports = {randomInt, shuffle};
