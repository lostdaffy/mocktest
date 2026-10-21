// Builders for the Advanced Successive Percentage Change questions: exam
// questions of two or three steps, worked backwards from an amount, or two
// ideas at once. Each takes a test title and its own numbers. The wrong
// options are made from the slips students make (adding the percentages,
// undoing a change by the same percentage, the direction turned round), so
// every distractor is a number someone would get. Every answer is worked out
// in `v`, and every solution ends on the answer as the option shows it.
const { Q, C, P } = require("./pct-builders");
const { net, after, pct, rs, n, clean, isInt } = P;
const f = (x) => n(1 + x / 100);
const said = (x) => (Math.abs(clean(x)) < 1e-9 ? "so there is no change" : `${P.an(P.chg(x))} ${P.chg(x)}`);
const saidH = (x) => (Math.abs(clean(x)) < 1e-9 ? "अतः कोई परिवर्तन नहीं" : `यानी ${P.chgH(P.chg(x))}`);
const sgn = (x) => (x >= 0 ? `increased by ${x}%` : `decreased by ${-x}%`);
const sgnH = (x, fem) => `${Math.abs(x)}% ${x >= 0 ? (fem ? "बढ़ाई" : "बढ़ाया") : fem ? "घटाई" : "घटाया"}`;
const list = (xs) => xs.map(sgn).join(", then ");
const listH = (xs, fem) => xs.map((x) => sgnH(x, fem)).join(", फिर ");
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const r2 = (x) => Math.round(x * 100) / 100;

// The marked option first, then the slips that give a different, sensible
// option; if fewer than three are left, neighbours of the answer.
function choices(answer, show, slips, { positive = true, step = 5, near = 0.5 } = {}) {
  const out = [show(answer)];
  const ok = (x) => Number.isFinite(x) && (!positive || x > 0) && Math.abs(x - answer) >= near;
  const add = (x) => {
    const exact = show(clean(x));
    const s = /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]/.test(exact) || !/\d \d+\/\d+|\d\/\d|\.\d{3,}/.test(exact) ? exact : show(r2(x));
    if (out.length < 4 && ok(x) && !out.includes(s)) out.push(s);
  };
  slips.forEach(add);
  for (let k = 1; out.length < 4 && k < 50; k++) [answer + step * k, answer - step * k].forEach(add);
  if (out.length < 4) throw new Error(`not enough options for ${show(answer)}`);
  return out;
}
const money = (x) => rs(Math.round(x));
const need = (cond, what) => { if (!cond) throw new Error(what); };

const A = {
  // Three (or more) changes, and the amount now: what it was at first.
  back: (t, what, whatH, fem, xs, start) => {
    const m = after(1, ...xs);
    const now = clean(start * m);
    need(isInt(now), `back: ${start} × ${m} is not whole`);
    const o = choices(start, money, [now / (1 + sum(xs) / 100), after(now, ...xs.map((x) => -x)), now * (1 - net(...xs) / 100), start * 1.05], { step: Math.max(100, Math.round(start / 20 / 100) * 100) });
    return Q(t, `A ${what} is ${list(xs)}, and is now ₹${n(now)}. What was it at first?`,
      `एक ${whatH} क्रमशः ${listH(xs, fem)} ${fem ? "जाती" : "जाता"} है, और अब वह ₹${n(now)} है। शुरुआत में ${fem ? "वह कितनी थी" : "वह कितना था"}?`, o, 0, () => rs(clean(now / m)),
      `At first × ${xs.map(f).join(" × ")} = ${n(now)}. The multiplier is ${n(m)}, so at first = ${n(now)} ÷ ${n(m)} = ${rs(clean(now / m))}.`,
      `शुरुआती मान × ${xs.map(f).join(" × ")} = ${n(now)}। गुणक ${n(m)} है, अतः शुरुआती मान = ${n(now)} ÷ ${n(m)} = ${rs(clean(now / m))}।`);
  },

  // Price up/down ch%, so ₹M buys q units less/more: the new or the old price per unit.
  perUnit: (t, item, itemH, ch, M, q, unit, unitOne, unitH, ask) => {
    const S = clean(Math.abs(ch) * M / 100);
    const nw = clean(S / q);
    const old = clean(nw / (1 + ch / 100));
    const ans = ask === "new" ? nw : old;
    need(isInt(ans * 100), `perUnit: ${ans}`);
    const o = choices(ans, rs, ask === "new" ? [old, nw * (1 + ch / 100), M / q / 2] : [nw, nw * (1 - ch / 100), nw * (1 + ch / 100)], { step: Math.max(1, Math.round(ans / 10)), near: 0.01 });
    const rise = ch > 0;
    const end = ask === "new" ? "" : ` The original price = ${n(nw)} ÷ ${f(ch)} = ${rs(old)} per ${unitOne}.`;
    const endH = ask === "new" ? "" : ` पहले का मूल्य = ${n(nw)} ÷ ${f(ch)} = ${rs(old)} प्रति ${unitH}।`;
    return Q(t,
      `The price of ${item} ${rise ? "rises" : "falls"} by ${Math.abs(ch)}%, so for ₹${n(M)} a family now gets ${q} ${unit} ${rise ? "less" : "more"} than before. What is the ${ask === "new" ? "new" : "original"} price per ${unitOne}?`,
      `${itemH} का मूल्य ${Math.abs(ch)}% ${rise ? "बढ़ जाता" : "घट जाता"} है, जिससे एक परिवार को ₹${n(M)} में पहले से ${q} ${unitH} ${rise ? "कम" : "अधिक"} मिलता है। ${ask === "new" ? "नया" : "पहले का"} मूल्य प्रति ${unitH} कितना है?`, o, 0,
      ask === "new" ? () => rs(nw) : () => rs(old),
      rise
        ? `At the new price, what ₹${n(M)} used to buy would cost ${ch}% more, that is ₹${n(S)} more; ₹${n(S)} is the price of the ${q} ${unit} the family now goes without. New price = ${n(S)} ÷ ${q} = ${rs(nw)} per ${unitOne}.${end}`
        : `At the new price, what ₹${n(M)} used to buy costs ${-ch}% less, saving ₹${n(S)}; the ₹${n(S)} buys the extra ${q} ${unit}. New price = ${n(S)} ÷ ${q} = ${rs(nw)} per ${unitOne}.${end}`,
      rise
        ? `नए मूल्य पर, ₹${n(M)} वाली पुरानी मात्रा ${ch}% अधिक, यानी ₹${n(S)} अधिक में आती; ₹${n(S)} उन ${q} ${unitH} का मूल्य है जो अब नहीं मिलते। नया मूल्य = ${n(S)} ÷ ${q} = ${rs(nw)} प्रति ${unitH}।${endH}`
        : `नए मूल्य पर पुरानी मात्रा ${-ch}% कम, यानी ₹${n(S)} कम में आती है; बचे ₹${n(S)} से अतिरिक्त ${q} ${unitH} मिलता है। नया मूल्य = ${n(S)} ÷ ${q} = ${rs(nw)} प्रति ${unitH}।${endH}`);
  },

  // Marked up, two discounts, still a gain of g%: how far above cost was it marked?
  markup: (t, d1, d2, g) => {
    const m = after(1, -d1, -d2);
    const M = clean((100 + g) / m);
    const ans = clean(M - 100);
    const o = choices(ans, pct, [d1 + d2 + g, -net(-d1, -d2) + g, ((100 + g) / (100 - d1 - d2) - 1) * 100]);
    return Q(t, `A shopkeeper marks an article some percentage above its cost, then allows two successive discounts of ${d1}% and ${d2}%, and still makes a profit of ${g}%. By what percentage above the cost was it marked?`,
      `एक दुकानदार किसी वस्तु पर लागत से कुछ प्रतिशत अधिक मूल्य अंकित करता है, फिर ${d1}% और ${d2}% की दो क्रमिक छूटें देता है, और फिर भी उसे ${g}% लाभ होता है। अंकित मूल्य लागत से कितने प्रतिशत अधिक था?`, o, 0, () => pct(ans),
      `Take the cost as 100, so the selling price is ${100 + g}. Marked price × ${f(-d1)} × ${f(-d2)} = ${100 + g}, so the marked price = ${100 + g} ÷ ${n(m)} = ${n(M)}, which is ${pct(ans)} above the cost.`,
      `लागत = 100 लें, तो विक्रय मूल्य ${100 + g} है। अंकित मूल्य × ${f(-d1)} × ${f(-d2)} = ${100 + g}, अतः अंकित मूल्य = ${100 + g} ÷ ${n(m)} = ${n(M)}, जो लागत से ${pct(ans)} अधिक है।`);
  },

  // A single discount and two successive ones differ by ₹D: the marked price.
  gapPrice: (t, s, a, b, M) => {
    const two = clean(-net(-a, -b));
    const g = clean(Math.abs(s - two));
    need(g > 0, "gapPrice: no gap");
    const D = clean(M * g / 100);
    need(isInt(D), `gapPrice: gap ₹${D}`);
    const slips = [s !== a + b ? D * 100 / Math.abs(s - a - b) : NaN, D * 100 / s, M * 2, M / 2];
    const o = choices(M, money, slips, { step: Math.max(100, Math.round(M / 10 / 100) * 100) });
    return Q(t, `On the same article, a single discount of ${s}% and two successive discounts of ${a}% and ${b}% differ by ₹${n(D)}. What is the marked price of the article?`,
      `किसी वस्तु पर ${s}% की एकल छूट और ${a}% व ${b}% की दो क्रमिक छूटों में ₹${n(D)} का अंतर है। वस्तु का अंकित मूल्य कितना है?`, o, 0, () => rs(clean(D / (g / 100))),
      `Two successive discounts of ${a}% and ${b}% = ${a} + ${b} − (${a} × ${b})/100 = ${n(two)}%. The gap is ${n(Math.max(s, two))} − ${n(Math.min(s, two))} = ${n(g)}% of the marked price, which is ₹${n(D)}. Marked price = ${n(D)} ÷ ${n(g / 100)} = ${rs(clean(D / (g / 100)))}.`,
      `${a}% और ${b}% की क्रमिक छूटें = ${a} + ${b} − (${a} × ${b})/100 = ${n(two)}%। अंतर ${n(Math.max(s, two))} − ${n(Math.min(s, two))} = अंकित मूल्य का ${n(g)}% है, जो ₹${n(D)} है। अंकित मूल्य = ${n(D)} ÷ ${n(g / 100)} = ${rs(clean(D / (g / 100)))}।`);
  },

  // Cylinder: radius and height change; the volume.
  cylinder: (t, r, h) => {
    const v = net(r, r, h);
    const o = choices(v, P.chg, [2 * r + h, net(r, h), -v, r + h], { positive: false });
    const verb = (x) => `${Math.abs(x)}% ${x >= 0 ? "बढ़ाई" : "घटाई"}`;
    return C(t, `The radius of a cylinder is ${sgn(r)} and its height is ${sgn(h)}. What is the change in its volume?`,
      `एक बेलन की त्रिज्या ${verb(r)} जाती है और उसकी ऊँचाई ${verb(h)} जाती है। उसके आयतन में क्या परिवर्तन होता है?`, o, 0, () => v,
      `The volume goes as radius² × height, so it is multiplied by ${f(r)}² × ${f(h)} = ${n(after(1, r, r, h))}: ${said(v)}.`,
      `आयतन त्रिज्या² × ऊँचाई के अनुसार बदलता है, अतः यह ${f(r)}² × ${f(h)} = ${n(after(1, r, r, h))} से गुणा होता है, ${saidH(v)}।`);
  },

  // The change in x^p / y^q.
  ratioPow: (t, a, b, p, q) => {
    const m = clean(Math.pow(1 + a / 100, p) / Math.pow(1 + b / 100, q));
    const v = clean((m - 1) * 100);
    const e = `${p === 1 ? "x" : `x^${p}`}/${q === 1 ? "y" : `y^${q}`}`;
    const o = choices(v, P.chg, [p * a - q * b, (Math.pow(1 + a / 100, p) * Math.pow(1 + b / 100, q) - 1) * 100, -v, a - b], { positive: false });
    const of = (x, k) => `${f(x)}${k > 1 ? `^${k}` : ""}`;
    return C(t, `x is ${sgn(a)} and y is ${sgn(b)}. What is the change in ${e}?`,
      `x को ${sgnH(a)} जाता है और y को ${sgnH(b)} जाता है। ${e} में क्या परिवर्तन होता है?`, o, 0, () => v,
      `${e} is multiplied by ${of(a, p)} ÷ ${of(b, q)} = ${n(m)}: ${said(v)}.`,
      `${e} ${of(a, p)} ÷ ${of(b, q)} = ${n(m)} से गुणा होता है, ${saidH(v)}।`);
  },

  // Raised a% one year and b% the next; the second raise is ₹D more than the first.
  raiseGap: (t, a, b, start) => {
    const k = clean((1 + a / 100) * b / 100 - a / 100);
    need(k > 0, "raiseGap: second raise is not larger");
    const D = clean(start * k);
    need(isInt(D), `raiseGap: ₹${D}`);
    const o = choices(start, money, [D * 100 / (b - a), D / (b / 100), start * (1 + a / 100)], { step: Math.max(500, Math.round(start / 10 / 500) * 500) });
    return Q(t, `A salary is raised by ${a}% one year and by ${b}% the next year. The second raise is ₹${n(D)} more than the first. What was the salary at first?`,
      `एक वेतन एक वर्ष ${a}% और अगले वर्ष ${b}% बढ़ाया जाता है। दूसरी वृद्धि पहली से ₹${n(D)} अधिक है। शुरुआत में वेतन कितना था?`, o, 0, () => rs(clean(D / k)),
      `Take the salary as S. The first raise is ${n(a / 100)}S, making it ${f(a)}S; the second is ${b}% of that, ${n((1 + a / 100) * b / 100)}S. The gap ${n((1 + a / 100) * b / 100)}S − ${n(a / 100)}S = ${n(k)}S = ${n(D)}, so S = ${rs(clean(D / k))}.`,
      `वेतन S लें। पहली वृद्धि ${n(a / 100)}S है, जिससे वेतन ${f(a)}S होता है; दूसरी उसका ${b}%, यानी ${n((1 + a / 100) * b / 100)}S है। अंतर ${n((1 + a / 100) * b / 100)}S − ${n(a / 100)}S = ${n(k)}S = ${n(D)}, अतः S = ${rs(clean(D / k))}।`);
  },

  // Two price rises; spending may rise only s%: the cut in consumption.
  cut2: (t, item, itemH, p1, p2, s) => {
    const c = clean((1 - (1 + s / 100) / after(1, p1, p2)) * 100);
    need(c > 0, "cut2: no cut");
    const o = choices(c, pct, [p1 + p2 - s, net(p1, p2) - s, (1 - (1 + s / 100) / (1 + (p1 + p2) / 100)) * 100]);
    return Q(t, `The price of ${item} rises by ${p1}% and then by another ${p2}%. A family wants its spending on ${item} to rise by only ${s}%. By what percentage must it cut its consumption?`,
      `${itemH} का मूल्य ${p1}% और फिर ${p2}% और बढ़ता है। एक परिवार चाहता है कि ${itemH} पर उसका खर्च केवल ${s}% बढ़े। उसे अपनी खपत कितने प्रतिशत घटानी होगी?`, o, 0, () => pct(c),
      `Spending = price × consumption: ${f(p1)} × ${f(p2)} × c = ${f(s)}, so c = ${f(s)} ÷ ${n(after(1, p1, p2))} = ${n(1 - c / 100)}, and consumption must fall by ${pct(c)}.`,
      `खर्च = मूल्य × खपत: ${f(p1)} × ${f(p2)} × c = ${f(s)}, अतः c = ${f(s)} ÷ ${n(after(1, p1, p2))} = ${n(1 - c / 100)}, यानी खपत ${pct(c)} घटानी होगी।`);
  },

  // A is a% more/less than B, B is b% more/less than C, and C's is ₹X: A − B.
  chainGap: (t, noun, nounH, fem, a, b, X) => {
    const B = clean(X * (1 + b / 100));
    const Av = clean(B * (1 + a / 100));
    const d = clean(Math.abs(Av - B));
    need(isInt(d), `chainGap: ${d}`);
    const k = fem ? "की" : "का";
    const ko = fem ? "की" : "के";
    const more = (x) => (x > 0 ? "more" : "less");
    const moreH = (x) => (x > 0 ? "अधिक" : "कम");
    const o = choices(d, money, [X * Math.abs(a) / 100, Math.abs(X * (1 + (a + b) / 100) - B), Math.abs(Av - X)], { step: Math.max(100, Math.round(d / 10 / 100) * 100) });
    return Q(t, `A's ${noun} is ${Math.abs(a)}% ${more(a)} than B's, and B's is ${Math.abs(b)}% ${more(b)} than C's. If C's ${noun} is ₹${n(X)}, what is the difference between A's and B's?`,
      `A ${k} ${nounH} B ${ko} ${nounH} से ${Math.abs(a)}% ${moreH(a)} है, और B ${k} ${nounH} C ${ko} ${nounH} से ${Math.abs(b)}% ${moreH(b)} है। यदि C ${k} ${nounH} ₹${n(X)} है, तो A और B ${ko} ${nounH} में कितना अंतर है?`, o, 0, () => rs(d),
      `B's = ${n(X)} × ${f(b)} = ₹${n(B)}, and A's = ${n(B)} × ${f(a)} = ₹${n(Av)}. The difference is ${rs(d)}.`,
      `B ${k} = ${n(X)} × ${f(b)} = ₹${n(B)}, और A ${k} = ${n(B)} × ${f(a)} = ₹${n(Av)}। अंतर ${rs(d)} है।`);
  },

  // Three equal successive changes equal a single one: each.
  equal3: (t, r, up) => {
    const single = clean(Math.abs(net(...[r, r, r].map((x) => (up ? x : -x)))));
    const o = choices(r, pct, [single / 3, single / 2, Math.sqrt(1 + (up ? single : -single) / 100) * 100 - 100]);
    const word = up ? "increase" : "decrease";
    const wordH = up ? "वृद्धि" : "कमी";
    return Q(t, `Three equal successive percentage ${word}s are together equal to a single ${word} of ${n(single)}%. What is each ${word}?`,
      `तीन समान क्रमिक प्रतिशत ${up ? "वृद्धियाँ" : "कमियाँ"} मिलकर ${n(single)}% की एकल ${wordH} के बराबर हैं। प्रत्येक ${wordH} कितनी है?`, o, 0, () => pct(r),
      `(1 ${up ? "+" : "−"} r)³ = ${f(up ? single : -single)}. Since ${f(up ? r : -r)}³ = ${f(up ? single : -single)}, 1 ${up ? "+" : "−"} r = ${f(up ? r : -r)} and r = ${pct(r)}.`,
      `(1 ${up ? "+" : "−"} r)³ = ${f(up ? single : -single)}। चूँकि ${f(up ? r : -r)}³ = ${f(up ? single : -single)}, 1 ${up ? "+" : "−"} r = ${f(up ? r : -r)} और r = ${pct(r)}।`);
  },

  // A vs B and B vs C known: by what percentage is C more/less than A?
  back2: (t, noun, nounH, fem, a, b) => {
    const m = after(1, a, b); // A = C × m
    const v = clean((1 / m - 1) * 100); // C against A
    need(Math.abs(v) > 1e-9, "back2: equal");
    const k = fem ? "की" : "का";
    const ko = fem ? "की" : "के";
    const more = (x) => (x > 0 ? "more" : "less");
    const moreH = (x) => (x > 0 ? "अधिक" : "कम");
    const o = choices(Math.abs(v), pct, [Math.abs(net(a, b)), Math.abs(a + b), Math.abs(net(-a, -b))]);
    return Q(t, `A's ${noun} is ${Math.abs(a)}% ${more(a)} than B's, and B's is ${Math.abs(b)}% ${more(b)} than C's. By what percentage is C's ${noun} ${more(v)} than A's?`,
      `A ${k} ${nounH} B ${ko} ${nounH} से ${Math.abs(a)}% ${moreH(a)} है, और B ${k} ${nounH} C ${ko} ${nounH} से ${Math.abs(b)}% ${moreH(b)} है। C ${k} ${nounH} A ${ko} ${nounH} से कितने प्रतिशत ${moreH(v)} है?`, o, 0, () => pct(Math.abs(v)),
      `Take C's = 100. B's = ${n(100 * (1 + b / 100))} and A's = ${n(after(100, b, a))}. C's is ${n(Math.abs(after(100, b, a) - 100))} ${more(v)} than A's ${n(after(100, b, a))}, so the percentage is ${n(Math.abs(after(100, b, a) - 100))} ÷ ${n(after(100, b, a))} × 100 = ${pct(Math.abs(v))}.`,
      `C ${k} = 100 लें। B ${k} = ${n(100 * (1 + b / 100))} और A ${k} = ${n(after(100, b, a))}। C ${k} A ${ko} ${n(after(100, b, a))} से ${n(Math.abs(after(100, b, a) - 100))} ${moreH(v)} है, अतः प्रतिशत = ${n(Math.abs(after(100, b, a) - 100))} ÷ ${n(after(100, b, a))} × 100 = ${pct(Math.abs(v))}।`);
  },

  // Five changes in a row.
  five: (t, xs) => {
    const v = net(...xs);
    const o = choices(v, P.chg, [sum(xs), -v, sum(xs) / 2, v + (v > 0 ? -1 : 1) * 2], { positive: false });
    return C(t, `The value of an investment is ${list(xs)}. What is the overall change?`,
      `एक निवेश का मूल्य क्रमशः ${listH(xs)} जाता है। कुल परिवर्तन क्या है?`, o, 0, () => v,
      `${xs.map(f).join(" × ")} = ${n(after(1, ...xs))}: ${said(v)}.`, `${xs.map(f).join(" × ")} = ${n(after(1, ...xs))}, ${saidH(v)}।`);
  },

  // Three changes known: the fourth that makes the overall change `target`.
  fourth: (t, xs, target) => {
    const r = clean(((1 + target / 100) / after(1, ...xs) - 1) * 100);
    const o = choices(r, P.chg, [target - sum(xs), -r, target - net(...xs)], { positive: false });
    const goal = target === 0 ? "brings it back to where it began" : `makes the overall result ${P.an(Math.abs(target))} ${target > 0 ? `${target}% increase` : `${-target}% decrease`}`;
    const goalH = target === 0 ? "उसे वापस शुरुआती मान पर ले आएगा" : `कुल परिणाम को ${Math.abs(target)}% ${target > 0 ? "वृद्धि" : "कमी"} बना देगा`;
    return C(t, `A price is ${list(xs)}. What fourth change ${goal}?`,
      `एक मूल्य को क्रमशः ${listH(xs)} जाता है। कौन-सा चौथा परिवर्तन ${goalH}?`, o, 0, () => r,
      `${xs.map(f).join(" × ")} = ${n(after(1, ...xs))}. The fourth factor is ${f(target)} ÷ ${n(after(1, ...xs))} = ${n(1 + r / 100)}: ${said(r)}.`,
      `${xs.map(f).join(" × ")} = ${n(after(1, ...xs))}। चौथा गुणक ${f(target)} ÷ ${n(after(1, ...xs))} = ${n(1 + r / 100)} है, ${saidH(r)}।`);
  },

  // Raised r%, then by (r + k)%; together `total`%: r.
  nextMore: (t, r, k) => {
    const total = net(r, r + k);
    const o = choices(r, pct, [(total - k) / 2, total / 2, r + k]);
    return Q(t, `A price is raised by some percentage, and then by ${k} percentage points more than that. Together the two raises add ${n(total)}% to the price. What was the first raise?`,
      `एक मूल्य किसी प्रतिशत से बढ़ाया जाता है, और फिर उससे ${k} प्रतिशत अंक अधिक से। दोनों वृद्धियाँ मिलकर मूल्य में ${n(total)}% जोड़ती हैं। पहली वृद्धि कितनी थी?`, o, 0,
      () => pct([...Array(400)].map((_, i) => i / 4).find((x) => Math.abs(net(x, x + k) - total) < 1e-9)),
      `With a first raise of r%: (1 + r/100)(1 + (r + ${k})/100) = ${f(total)}. Trying r = ${r}: ${f(r)} × ${f(r + k)} = ${f(total)}. So the first raise was ${pct(r)}.`,
      `पहली वृद्धि r% हो तो: (1 + r/100)(1 + (r + ${k})/100) = ${f(total)}। r = ${r} रखने पर: ${f(r)} × ${f(r + k)} = ${f(total)}। अतः पहली वृद्धि ${pct(r)} थी।`);
  },

  // Speed cut s%, late by m minutes: the usual time.
  late: (t, who, whoH, s, m) => {
    const T0 = clean(m * (100 - s) / s);
    need(isInt(T0), `late: ${T0}`);
    const o = choices(T0, n, [m * 100 / s, m * (100 + s) / s, m * 100 / (100 - s)], { step: 5 });
    return Q(t, `${who} drives ${s}% slower than usual and reaches ${m} minutes late. How many minutes does the trip take at the usual speed?`,
      `${whoH} सामान्य से ${s}% धीमी गति से चलता है और ${m} मिनट देर से पहुँचता है। सामान्य गति से यात्रा में कितने मिनट लगते हैं?`, o, 0, () => n(clean(m * (100 - s) / s)),
      `For the same distance, time goes as 1 ÷ speed: it is multiplied by 100/${100 - s}, so the extra time is ${s}/${100 - s} of the usual time T. ${s}/${100 - s} × T = ${m}, so T = ${n(T0)} minutes.`,
      `उतनी ही दूरी के लिए समय गति का उल्टा होता है: यह 100/${100 - s} से गुणा होता है, अतः अतिरिक्त समय सामान्य समय T का ${s}/${100 - s} है। ${s}/${100 - s} × T = ${m}, अतः T = ${n(T0)} मिनट।`);
  },

  // Marked price, two discounts known, sold for sp: the third discount.
  thirdDiscount: (t, item, itemH, mp, d1, d2, sp) => {
    const before = clean(mp * (1 - d1 / 100) * (1 - d2 / 100));
    const d3 = clean((1 - sp / before) * 100);
    const o = choices(d3, pct, [((mp - sp) / mp) * 100 - d1 - d2, ((mp - sp) / mp) * 100, d3 + d1 / 2]);
    return Q(t, `The marked price of ${item} is ₹${n(mp)}. After three successive discounts, the first two of ${d1}% and ${d2}%, it is sold for ₹${n(sp)}. What is the third discount?`,
      `${itemH} का अंकित मूल्य ₹${n(mp)} है। तीन क्रमिक छूटों के बाद, जिनमें पहली दो ${d1}% और ${d2}% हैं, यह ₹${n(sp)} में बिकता है। तीसरी छूट कितनी है?`, o, 0, () => pct(d3),
      `After two discounts the price is ${n(mp)} × ${f(-d1)} × ${f(-d2)} = ₹${n(before)}. The third takes it to ₹${n(sp)}: ${n(before - sp)} ÷ ${n(before)} × 100 = ${pct(d3)}.`,
      `दो छूटों के बाद मूल्य ${n(mp)} × ${f(-d1)} × ${f(-d2)} = ₹${n(before)}। तीसरी छूट से यह ₹${n(sp)} होता है: ${n(before - sp)} ÷ ${n(before)} × 100 = ${pct(d3)}।`);
  },

  // Three cuts: the rise that brings it back.
  restore3: (t, what, whatH, fem, xs) => {
    const m = after(1, ...xs.map((x) => -x));
    const r = clean((1 / m - 1) * 100);
    const o = choices(r, pct, [sum(xs), -net(...xs.map((x) => -x)), r - 10]);
    return Q(t, `A ${what} is cut by ${xs.slice(0, -1).map((x) => `${x}%`).join(", ")} and ${xs.at(-1)}% in three successive steps. By what percentage must it now be raised to bring it back to where it began?`,
      `एक ${whatH} तीन क्रमिक चरणों में ${xs.slice(0, -1).map((x) => `${x}%`).join(", ")} और ${xs.at(-1)}% ${fem ? "घटाई जाती" : "घटाया जाता"} है। अब इसे कितने प्रतिशत बढ़ाया जाए कि यह शुरुआत ${fem ? "जितनी" : "जितना"} हो जाए?`, o, 0, () => pct(r),
      `After the cuts it is ${xs.map((x) => f(-x)).join(" × ")} = ${n(m)} of the start. To get back it must be multiplied by 1 ÷ ${n(m)}, an increase of ${pct(r)}.`,
      `कटौतियों के बाद यह शुरुआत का ${xs.map((x) => f(-x)).join(" × ")} = ${n(m)} है। वापस लाने के लिए इसे 1 ÷ ${n(m)} से गुणा करना होगा, यानी ${pct(r)} वृद्धि।`);
  },

  // Two price rises, spending up s%: the quantity from q.
  quantity2: (t, item, itemH, p1, p2, s, q, unit, unitH) => {
    const nq = clean(q * (1 + s / 100) / after(1, p1, p2));
    need(isInt(nq * 100), `quantity2: ${nq}`);
    const o = choices(nq, n, [q * (1 + (s - p1 - p2) / 100), q * (1 + s / 100) / (1 + (p1 + p2) / 100), q * (1 - (p1 + p2) / 100)], { step: 1, near: 0.05 });
    return Q(t, `A family used to buy ${q} ${unit} of ${item} a month. Its price rises by ${p1}% and then by another ${p2}%, and the family lets its spending on ${item} rise by ${s}%. How many ${unit} does it buy now?`,
      `एक परिवार हर महीने ${q} ${unitH} ${itemH} खरीदता था। उसका मूल्य ${p1}% और फिर ${p2}% और बढ़ता है, और परिवार उस पर अपना खर्च ${s}% बढ़ने देता है। अब वह कितने ${unitH} खरीदता है?`, o, 0, () => n(nq),
      `Quantity = spending ÷ price, so it becomes ${q} × ${f(s)} ÷ (${f(p1)} × ${f(p2)}) = ${q} × ${f(s)} ÷ ${n(after(1, p1, p2))} = ${n(nq)} ${unit}.`,
      `मात्रा = खर्च ÷ मूल्य, अतः यह ${q} × ${f(s)} ÷ (${f(p1)} × ${f(p2)}) = ${q} × ${f(s)} ÷ ${n(after(1, p1, p2))} = ${n(nq)} ${unitH} हो जाती है।`);
  },

  // Raised up%; the cut that leaves it x% above the original.
  toAbove: (t, item, itemH, up, above) => {
    const c = clean((1 - (1 + above / 100) / (1 + up / 100)) * 100);
    need(c > 0, "toAbove: no cut");
    const o = choices(c, pct, [up - above, ((up - above) / (100 + above)) * 100, c + 5]);
    return Q(t, `The price of ${item} is raised by ${up}%. By what percentage must the new price be cut so that the final price is only ${above}% above the original?`,
      `${itemH} का मूल्य ${up}% बढ़ाया जाता है। नए मूल्य को कितने प्रतिशत घटाया जाए कि अंतिम मूल्य मूल से केवल ${above}% अधिक रहे?`, o, 0, () => pct(c),
      `${f(up)} × (1 − r) = ${f(above)}, so 1 − r = ${f(above)} ÷ ${f(up)} = ${n(1 - c / 100)} and r = ${pct(c)}.`,
      `${f(up)} × (1 − r) = ${f(above)}, अतः 1 − r = ${f(above)} ÷ ${f(up)} = ${n(1 - c / 100)} और r = ${pct(c)}।`);
  },

  // Two schemes on ₹M: two successive raises against one single raise.
  schemes: (t, a, b, s, M) => {
    const two = net(a, b);
    const d = clean(Math.abs(two - s) * M / 100);
    need(d > 0 && isInt(d), `schemes: ${d}`);
    const better = two > s ? "the first" : "the second";
    const betterH = two > s ? "पहली" : "दूसरी";
    const o = choices(d, money, [Math.abs(a + b - s) * M / 100 || NaN, (a * b / 100) * M / 100, d * 2], { step: Math.max(10, Math.round(d / 10 / 10) * 10) });
    return Q(t, `On a sum of ₹${n(M)}, one scheme gives two successive increases of ${a}% and ${b}%, and another gives a single increase of ${s}%. How much more does ${better} scheme give?`,
      `₹${n(M)} की राशि पर एक योजना ${a}% और ${b}% की दो क्रमिक वृद्धियाँ देती है, और दूसरी योजना ${s}% की एकल वृद्धि। ${betterH} योजना कितना अधिक देती है?`, o, 0, () => rs(d),
      `Two successive increases of ${a}% and ${b}% = ${a} + ${b} + (${a} × ${b})/100 = ${n(two)}%. The gap is ${n(Math.abs(two - s))}% of ₹${n(M)} = ${rs(d)}.`,
      `${a}% और ${b}% की क्रमिक वृद्धियाँ = ${a} + ${b} + (${a} × ${b})/100 = ${n(two)}%। अंतर ₹${n(M)} का ${n(Math.abs(two - s))}% = ${rs(d)} है।`);
  },
};

module.exports = { A, choices };
