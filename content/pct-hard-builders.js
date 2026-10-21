// Builders for the harder Successive Percentage Change questions: several
// steps, two ideas at once, or working backwards from an amount. Each takes a
// test title and its own numbers; every answer is worked out in `v`, and every
// solution ends on the answer as the option shows it.
const { Q, C, P } = require("./pct-builders");
const { net, after, pct, rs, n, clean } = P;
const f = (x) => n(1 + x / 100);
const said = (x) => (Math.abs(clean(x)) < 1e-9 ? "so there is no change" : `${P.an(P.chg(x))} ${P.chg(x)}`);
const saidH = (x) => (Math.abs(clean(x)) < 1e-9 ? "अतः कोई परिवर्तन नहीं" : `यानी ${P.chgH(P.chg(x))}`);
const sgn = (x) => (x >= 0 ? `increased by ${x}%` : `decreased by ${-x}%`);
const sgnH = (x) => (x >= 0 ? `${x}% बढ़ाया` : `${-x}% घटाया`);
const list = (xs) => xs.map(sgn).join(", then ");
const listH = (xs) => xs.map(sgnH).join(", फिर ");

const H = {
  // four changes in a row
  four: (t, xs, o) => C(t, `A share price is ${list(xs)}. What is the overall change?`, `एक शेयर का मूल्य ${listH(xs)} जाता है। कुल परिवर्तन क्या है?`, o, 0, () => net(...xs),
    `${xs.map(f).join(" × ")} = ${n(after(1, ...xs))}: ${said(net(...xs))}.`, `${xs.map(f).join(" × ")} = ${n(after(1, ...xs))}, ${saidH(net(...xs))}।`),
  // A is a% more than B, B is b% more than C, A gets ₹d more than C: A?
  chainAmount: (t, noun, nounH, fem, a, b, d, o) => {
    const m = clean((1 + a / 100) * (1 + b / 100) - 1);
    const cVal = d / m, aVal = cVal * (1 + m);
    const k = fem ? "की" : "का";
    return Q(t, `A's ${noun} is ${a}% more than B's, and B's is ${b}% more than C's. A's ${noun} is ₹${n(d)} more than C's. What is A's ${noun}?`, `A ${k} ${nounH} B ${fem ? "की" : "के"} ${nounH} से ${a}% अधिक है, और B ${k} ${nounH} C ${fem ? "की" : "के"} ${nounH} से ${b}% अधिक है। A ${k} ${nounH} C ${fem ? "की" : "के"} ${nounH} से ₹${n(d)} अधिक है। A ${k} ${nounH} ${fem ? "कितनी" : "कितना"} है?`, o, 0, () => rs(aVal),
      `Take C's = 100. B's = ${n(100 * (1 + b / 100))} and A's = ${n(100 * (1 + m))}, so A's exceeds C's by ${n(m * 100)} per 100 of C's. C's = ${n(d)} ÷ ${n(m)} = ₹${n(cVal)}, and A's = ₹${n(aVal)}.`, `C ${k} = 100 लें। B ${k} = ${n(100 * (1 + b / 100))} और A ${k} = ${n(100 * (1 + m))}, अतः C के हर 100 पर A ${n(m * 100)} अधिक। C ${k} = ${n(d)} ÷ ${n(m)} = ₹${n(cVal)}, और A ${k} = ₹${n(aVal)}।`);
  },
  // price up p%, spending up s% -> new quantity from q
  quantity: (t, item, itemH, p, s, q, unit, unitH, o) => {
    const nq = clean(q * (1 + s / 100) / (1 + p / 100));
    return Q(t, `A family used to buy ${q} ${unit} of ${item} a month. Its price rises by ${p}%, and the family lets its spending on ${item} rise by only ${s}%. How many ${unit} does it buy now?`, `एक परिवार हर महीने ${q} ${unitH} ${itemH} खरीदता था। उसका मूल्य ${p}% बढ़ता है, और परिवार उस पर अपना खर्च केवल ${s}% बढ़ने देता है। अब वह कितने ${unitH} खरीदता है?`, o, 0, () => n(nq),
      `Quantity = spending ÷ price, so it becomes ${q} × ${f(s)} ÷ ${f(p)} = ${n(nq)} ${unit}.`, `मात्रा = खर्च ÷ मूल्य, अतः यह ${q} × ${f(s)} ÷ ${f(p)} = ${n(nq)} ${unitH} हो जाती है।`);
  },
  // +a then -a, ends ₹d / d below: original
  updownAmount: (t, what, whatH, a, d, money, o, fem = false) => {
    const vb = (w) => (fem ? w.replace("या", "ई") : w);
    const loss = clean(a * a / 10000);
    const val = d / loss;
    return Q(t, `A ${what} is increased by ${a}% and the new ${what} is then decreased by ${a}%. It ends up ${money ? "₹" : ""}${n(d)} less than at first. What was it at first?`, `एक ${whatH} ${a}% ${vb("बढ़ाया")} ${fem ? "जाती" : "जाता"} है और फिर ${fem ? "नई" : "नया"} ${whatH} ${a}% ${vb("घटाया")} ${fem ? "जाती" : "जाता"} है। अंत में यह शुरुआत से ${money ? "₹" : ""}${n(d)} कम रह ${fem ? "जाती" : "जाता"} है। शुरुआत में यह ${fem ? "कितनी थी" : "कितना था"}?`, o, 0, () => (money ? rs(val) : n(val)),
      `An increase and a decrease of ${a}% leave ${f(a)} × ${f(-a)} = ${n(1 - loss)}, a loss of ${n(loss * 100)}%. So ${n(loss * 100)}% of the value is ${n(d)}: value = ${n(d)} ÷ ${n(loss)} = ${money ? "₹" : ""}${n(val)}.`, `${a}% वृद्धि और कमी से ${f(a)} × ${f(-a)} = ${n(1 - loss)} बचता है, यानी ${n(loss * 100)}% हानि। अतः मान का ${n(loss * 100)}% = ${n(d)}: मान = ${n(d)} ÷ ${n(loss)} = ${money ? "₹" : ""}${n(val)}।`);
  },
  // two cuts -> the rise needed to get back
  restore: (t, what, whatH, a, b, o, fem = false) => {
    const r = clean((1 / ((1 - a / 100) * (1 - b / 100)) - 1) * 100);
    return Q(t, `A ${what} is cut by ${a}% and then by a further ${b}%. By what percentage must it now be raised to bring it back to where it began?`, `एक ${whatH} पहले ${a}% और फिर ${b}% और ${fem ? "घटाई जाती" : "घटाया जाता"} है। अब इसे कितने प्रतिशत बढ़ाया जाए कि यह शुरुआत ${fem ? "जितनी हो जाए" : "जितना हो जाए"}?`, o, 0, () => pct(r),
      `After the cuts it is ${f(-a)} × ${f(-b)} = ${n((1 - a / 100) * (1 - b / 100))} of the start. To get back it must be multiplied by 1 ÷ ${n((1 - a / 100) * (1 - b / 100))}, an increase of ${pct(r)}.`, `कटौतियों के बाद यह शुरुआत का ${f(-a)} × ${f(-b)} = ${n((1 - a / 100) * (1 - b / 100))} है। वापस लाने के लिए इसे 1 ÷ ${n((1 - a / 100) * (1 - b / 100))} से गुणा करना होगा, यानी ${pct(r)} वृद्धि।`);
  },
  // the change in x^px * y^py
  power: (t, a, b, px, py, o) => {
    const v = clean((Math.pow(1 + a / 100, px) * Math.pow(1 + b / 100, py) - 1) * 100);
    const expr = `${px === 1 ? "x" : `x^${px}`}${py === 1 ? "y" : `y^${py}`}`;
    return C(t, `x is ${sgn(a)} and y is ${sgn(b)}. What is the change in ${expr}?`, `x को ${sgnH(a)} जाता है और y को ${sgnH(b)} जाता है। ${expr} में क्या परिवर्तन होता है?`, o, 0, () => v,
      `${expr} is multiplied by ${f(a)}${px > 1 ? `^${px}` : ""} × ${f(b)}${py > 1 ? `^${py}` : ""} = ${n(1 + v / 100)}: ${said(v)}.`, `${expr} ${f(a)}${px > 1 ? `^${px}` : ""} × ${f(b)}${py > 1 ? `^${py}` : ""} = ${n(1 + v / 100)} से गुणा होता है, ${saidH(v)}।`);
  },
  // speed up s% saves m minutes on a fixed trip: the usual time
  timeSaved: (t, who, whoH, s, m, o) => {
    const frac = clean(1 - 1 / (1 + s / 100));
    const T0 = clean(m / frac);
    const g = (a, b) => (b ? g(b, a % b) : a);
    const k = g(s, 100 + s);
    const sv = `${s / k}/${(100 + s) / k}`, kept = `${100 / k}/${(100 + s) / k}`;
    return Q(t, `${who} increases the speed by ${s}% and so reaches ${m} minutes earlier on the usual trip. How many minutes does the trip take at the usual speed?`, `${whoH} गति ${s}% बढ़ाता है और इससे सामान्य यात्रा में ${m} मिनट पहले पहुँचता है। सामान्य गति से यात्रा में कितने मिनट लगते हैं?`, o, 0, () => n(T0),
      `For the same distance, time is multiplied by 100/${100 + s} = ${kept}, saving ${sv} of the usual time. ${sv} × T = ${m}, so T = ${n(T0)} minutes.`, `उतनी ही दूरी के लिए समय 100/${100 + s} = ${kept} से गुणा होता है, यानी सामान्य समय का ${sv} बचता है। ${sv} × T = ${m}, अतः T = ${n(T0)} मिनट।`);
  },
  // after +up%, the cut that leaves it b% below the original
  toBelow: (t, item, itemH, up, below, o) => {
    const c = clean((1 - (1 - below / 100) / (1 + up / 100)) * 100);
    return Q(t, `The price of ${item} is raised by ${up}%. By what percentage must the new price be cut so that the final price is ${below}% below the original?`, `${itemH} का मूल्य ${up}% बढ़ाया जाता है। नए मूल्य को कितने प्रतिशत घटाया जाए कि अंतिम मूल्य मूल से ${below}% कम हो?`, o, 0, () => pct(c),
      `${f(up)} × (1 − r) = ${f(-below)}, so 1 − r = ${n((1 - below / 100) / (1 + up / 100))} and r = ${pct(c)}.`, `${f(up)} × (1 − r) = ${f(-below)}, अतः 1 − r = ${n((1 - below / 100) / (1 + up / 100))} और r = ${pct(c)}।`);
  },
  // circle radius up r% then the new radius down r%
  radiusUpDown: (t, r, o) => C(t, `The radius of a circle is increased by ${r}%, and the new radius is then decreased by ${r}%. What is the overall change in the area?`, `एक वृत्त की त्रिज्या ${r}% बढ़ाई जाती है, और फिर नई त्रिज्या ${r}% घटाई जाती है। क्षेत्रफल में कुल परिवर्तन क्या है?`, o, 0, () => net(r, r, -r, -r),
    `The radius ends at ${f(r)} × ${f(-r)} = ${n((1 + r / 100) * (1 - r / 100))} of itself, so the area is multiplied by ${n((1 + r / 100) * (1 - r / 100))}² = ${n(after(1, r, r, -r, -r))}: ${said(net(r, r, -r, -r))}.`, `त्रिज्या अपनी ${f(r)} × ${f(-r)} = ${n((1 + r / 100) * (1 - r / 100))} रह जाती है, अतः क्षेत्रफल ${n((1 + r / 100) * (1 - r / 100))}² = ${n(after(1, r, r, -r, -r))} से गुणा होता है, ${saidH(net(r, r, -r, -r))}।`),
  // mark up, then two discounts: selling price vs cost
  markup2: (t, up, d1, d2, o) => C(t, `A shopkeeper marks goods ${up}% above cost and then gives two successive discounts of ${d1}% and ${d2}%. How does the selling price compare with the cost?`, `एक दुकानदार माल पर लागत से ${up}% अधिक मूल्य अंकित करता है और फिर ${d1}% और ${d2}% की दो क्रमिक छूटें देता है। विक्रय मूल्य लागत की तुलना में कैसा है?`, o, 0, () => net(up, -d1, -d2),
    `Selling price = cost × ${f(up)} × ${f(-d1)} × ${f(-d2)} = cost × ${n(after(1, up, -d1, -d2))}: ${said(net(up, -d1, -d2))}.`, `विक्रय मूल्य = लागत × ${f(up)} × ${f(-d1)} × ${f(-d2)} = लागत × ${n(after(1, up, -d1, -d2))}, ${saidH(net(up, -d1, -d2))}।`),
  // marked price and selling price known, first discount known: the second
  secondDiscount: (t, item, itemH, mp, d1, sp, o) => {
    const d2 = clean((1 - sp / (mp * (1 - d1 / 100))) * 100);
    return Q(t, `The marked price of ${item} is ₹${n(mp)}. After two successive discounts, the first of ${d1}%, it is sold for ₹${n(sp)}. What is the second discount?`, `${itemH} का अंकित मूल्य ₹${n(mp)} है। दो क्रमिक छूटों के बाद, जिनमें पहली ${d1}% है, यह ₹${n(sp)} में बिकता है। दूसरी छूट कितनी है?`, o, 0, () => pct(d2),
      `After the first discount the price is ${n(mp)} × ${f(-d1)} = ₹${n(mp * (1 - d1 / 100))}. The second discount takes it to ₹${n(sp)}: ${n(mp * (1 - d1 / 100) - sp)} ÷ ${n(mp * (1 - d1 / 100))} × 100 = ${pct(d2)}.`, `पहली छूट के बाद मूल्य ${n(mp)} × ${f(-d1)} = ₹${n(mp * (1 - d1 / 100))}। दूसरी छूट से यह ₹${n(sp)} होता है: ${n(mp * (1 - d1 / 100) - sp)} ÷ ${n(mp * (1 - d1 / 100))} × 100 = ${pct(d2)}।`);
  },
  // two price rises and a cut in consumption: spending
  spend3: (t, item, itemH, p1, p2, c, o) => C(t, `The price of ${item} rises by ${p1}% and later by another ${p2}%, and a family ${c < 0 ? `cuts its consumption by ${-c}%` : `raises its consumption by ${c}%`}. What is the change in its spending on ${item}?`, `${itemH} का मूल्य ${p1}% और बाद में ${p2}% और बढ़ता है, और एक परिवार अपनी खपत ${Math.abs(c)}% ${c < 0 ? "घटाता" : "बढ़ाता"} है। ${itemH} पर उसके खर्च में क्या परिवर्तन होता है?`, o, 0, () => net(p1, p2, c),
    `Spending = price × consumption: ${f(p1)} × ${f(p2)} × ${f(c)} = ${n(after(1, p1, p2, c))}: ${said(net(p1, p2, c))}.`, `खर्च = मूल्य × खपत: ${f(p1)} × ${f(p2)} × ${f(c)} = ${n(after(1, p1, p2, c))}, ${saidH(net(p1, p2, c))}।`),
  // x% then 2x% together make total%: x
  doubleNext: (t, x, o) => {
    const total = clean(net(x, 2 * x));
    return Q(t, `A salary is raised by some percentage, and the next year by twice that percentage. Together the two raises add ${n(total)}% to the salary. What was the first raise?`, `एक वेतन किसी प्रतिशत से बढ़ाया जाता है, और अगले वर्ष उसके दोगुने प्रतिशत से। दोनों वृद्धियाँ मिलकर वेतन में ${n(total)}% जोड़ती हैं। पहली वृद्धि कितनी थी?`, o, 0, () => pct([...Array(200)].map((_, i) => i / 2).find((r) => Math.abs(net(r, 2 * r) - total) < 1e-9)),
      `With a first raise of r%: (1 + r/100)(1 + 2r/100) = ${f(total)}. Trying r = ${x}: ${f(x)} × ${f(2 * x)} = ${f(total)}. So the first raise was ${x}%.`, `पहली वृद्धि r% हो तो: (1 + r/100)(1 + 2r/100) = ${f(total)}। r = ${x} रखने पर: ${f(x)} × ${f(2 * x)} = ${f(total)}। अतः पहली वृद्धि ${x}% थी।`);
  },
  // a, b known, third change so that the total is target
  third: (t, a, b, target, o) => {
    const r = clean(((1 + target / 100) / ((1 + a / 100) * (1 + b / 100)) - 1) * 100);
    return C(t, `A price is ${sgn(a)} and then ${sgn(b)}. What third change makes the overall result ${P.an(Math.abs(target))} ${target >= 0 ? `${target}% increase` : `${-target}% decrease`}?`, `एक मूल्य ${sgnH(a)} और फिर ${sgnH(b)} जाता है। कौन-सा तीसरा परिवर्तन कुल परिणाम को ${Math.abs(target)}% ${target >= 0 ? "वृद्धि" : "कमी"} बना देगा?`, o, 0, () => r,
      `${f(a)} × ${f(b)} × (third) = ${f(target)}, so the third factor is ${f(target)} ÷ ${n((1 + a / 100) * (1 + b / 100))} = ${n(1 + r / 100)}: ${said(r)}.`, `${f(a)} × ${f(b)} × (तीसरा) = ${f(target)}, अतः तीसरा गुणक ${f(target)} ÷ ${n((1 + a / 100) * (1 + b / 100))} = ${n(1 + r / 100)}, ${saidH(r)}।`);
  },
  // a cuboid's three edges change: volume
  cuboid: (t, [a, b, c], o) => C(t, `The length, breadth and height of a cuboid are ${a > 0 && b > 0 && c > 0 ? `increased by ${a}%, ${b}% and ${c}%` : `changed as follows: length ${sgn(a)}, breadth ${sgn(b)}, height ${sgn(c)}`} respectively. What is the change in its volume?`.replace("as follows: length", "- length").replace(" respectively. What", a > 0 && b > 0 && c > 0 ? " respectively. What" : ". What"), `एक घनाभ की लंबाई, चौड़ाई और ऊँचाई ${a > 0 && b > 0 && c > 0 ? `क्रमशः ${a}%, ${b}% और ${c}% बढ़ाई जाती हैं` : `इस प्रकार बदली जाती हैं: लंबाई ${Math.abs(a)}% ${a > 0 ? "अधिक" : "कम"}, चौड़ाई ${Math.abs(b)}% ${b > 0 ? "अधिक" : "कम"}, ऊँचाई ${Math.abs(c)}% ${c > 0 ? "अधिक" : "कम"}`}। उसके आयतन में क्या परिवर्तन होता है?`, o, 0, () => net(a, b, c),
    `Volume = length × breadth × height: ${f(a)} × ${f(b)} × ${f(c)} = ${n(after(1, a, b, c))}: ${said(net(a, b, c))}.`, `आयतन = लंबाई × चौड़ाई × ऊँचाई: ${f(a)} × ${f(b)} × ${f(c)} = ${n(after(1, a, b, c))}, ${saidH(net(a, b, c))}।`),
};

module.exports = { H };
