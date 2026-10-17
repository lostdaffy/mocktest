// Small number helpers the hand-written batches use in their checks (`v`).
// Every answer a batch marks is worked out again here, in code.
const big = (x) => BigInt(x);
const powmod = (b, e, m) => {
  let r = 1n, B = big(b) % big(m), E = big(e);
  const M = big(m);
  while (E > 0n) { if (E & 1n) r = (r * B) % M; B = (B * B) % M; E >>= 1n; }
  return Number(r);
};
const ud = (b, e) => powmod(b, e, 10); // unit digit of b^e
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (...xs) => xs.reduce((a, b) => (a / gcd(a, b)) * b);
const hcf = (...xs) => xs.reduce((a, b) => gcd(a, b));
// exponent of prime p in n!
const vfact = (n, p) => { let c = 0; for (let k = p; k <= n; k *= p) c += Math.floor(n / k); return c; };
const factor = (n) => { const f = {}; for (let p = 2; p * p <= n; p++) while (n % p === 0) { f[p] = (f[p] || 0) + 1; n /= p; } if (n > 1) f[n] = (f[n] || 0) + 1; return f; };
const divisors = (n) => { const d = []; for (let i = 1; i * i <= n; i++) if (n % i === 0) { d.push(i); if (i * i !== n) d.push(n / i); } return d.sort((a, b) => a - b); };
const isPrime = (n) => n > 1 && divisors(n).length === 2;
const digitSum = (n) => String(n).split("").reduce((a, d) => a + Number(d), 0);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const count = (a, b, test) => range(a, b).filter(test).length;
const fact = (n) => { let r = 1n; for (let i = 2n; i <= big(n); i++) r *= i; return r; };
// The marked option is the value, and no other option is.
const only = (opts, a, value) => String(opts[a]) === String(value) && opts.filter((o) => String(o) === String(value)).length === 1;
// For fractions: "p/q" options compared by value.
const frac = (s) => { const [p, q] = String(s).split("/").map(Number); return p / (q || 1); };
const onlyFrac = (opts, a, p, q) => opts.filter((o) => Math.abs(frac(o) - p / q) < 1e-12).length === 1 && Math.abs(frac(opts[a]) - p / q) < 1e-12;
// Unique digit(s) that make a pattern ("5a43b0") divisible by m.
const fill = (pattern, test) => {
  const vars = [...new Set(pattern.replace(/[0-9]/g, ""))];
  const out = [];
  const rec = (i, env) => {
    if (i === vars.length) {
      const s = pattern.replace(/[a-z]/g, (c) => env[c]);
      if (s[0] !== "0" && test(BigInt(s), env)) out.push({ ...env });
      return;
    }
    for (let d = 0; d <= 9; d++) rec(i + 1, { ...env, [vars[i]]: d });
  };
  rec(0, {});
  return out;
};
module.exports = { powmod, ud, gcd, lcm, hcf, vfact, factor, divisors, isPrime, digitSum, range, count, fact, only, onlyFrac, frac, fill };
