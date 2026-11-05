// coverage() and findGaps() walk the whole catalog. On the free instance one
// call took ~28 s, and the Generation page asked for both every 2.5 s, so
// calls piled up and slowed every other request. One answer is shared for a
// minute - and calls that arrive while one is being worked out wait for that
// one instead of starting their own.
//
// What is built changes when something is queued (the controller clears it)
// and when a job ends (the worker clears it). Without the second, the panel
// kept showing a finished mock as unfinished for up to a minute.
const memo = new Map();

function cached(key, ttlMs, fn) {
  const hit = memo.get(key);
  if (hit && (hit.pending || Date.now() - hit.at < ttlMs)) return hit.promise;
  const entry = { at: Date.now(), pending: true };
  entry.promise = fn().then(
    (v) => ((entry.pending = false), (entry.at = Date.now()), v),
    (e) => (memo.get(key) === entry && memo.delete(key), Promise.reject(e))
  );
  memo.set(key, entry);
  return entry.promise;
}

const clearCached = () => memo.clear();

module.exports = { cached, clearCached };
