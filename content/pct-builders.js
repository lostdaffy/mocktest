// Builders for Percentage questions of the Successive Percentage Change
// kinds: each takes a test title and its own numbers, writes the English and
// Hindi question and solution, and works the answer out again in v.
const L = require("./lib");
const P = require("./pct");
const Q = (t, q, qh, o, a, value, s, sh, oh) => ({ t, q, qh, o, ...(oh ? { oh } : {}), a, v: () => L.only(o, a, String(value())), s, sh });
const C = (t, q, qh, o, a, value, s, sh) => Q(t, q, qh, o, a, () => P.chg(value()), s, sh, o.map(P.chgH));
const { net, after, pct, rs, n, clean } = P;
const f = (x) => n(1 + x / 100); // a change as a multiplier, written out: 20 -> "1.2"
const sgn = (x) => (x >= 0 ? `increased by ${x}%` : `decreased by ${-x}%`);
const sgnH = (x) => (x >= 0 ? `${x}% बढ़ाया` : `${-x}% घटाया`);
const said = (x) => (Math.abs(clean(x)) < 1e-9 ? "so there is no change" : `${P.an(P.chg(x))} ${P.chg(x)}`);
const saidH = (x) => (Math.abs(clean(x)) < 1e-9 ? "अतः कोई परिवर्तन नहीं" : `यानी ${P.chgH(P.chg(x))}`);
const sgnHf = (x) => (x >= 0 ? `${x}% बढ़ाई` : `${-x}% घटाई`);
const growsHf = (x) => (x >= 0 ? `${x}% बढ़ जाती` : `${-x}% घट जाती`);
const BETTER = ["The two successive discounts", "The single discount", "Both are the same", "It depends on the price"];
const BETTER_HI = ["दो क्रमिक छूटें", "एकल छूट", "दोनों समान हैं", "मूल्य पर निर्भर है"];
const better = (single, a, b) => { const two = clean(-net(-a, -b)); return two > single ? BETTER[0] : two < single ? BETTER[1] : BETTER[2]; };

// ---- one builder per kind of question; each test passes its own numbers
const K = {
  three: (t, [a, b, c], o) => C(t, `A price is ${sgn(a)}, then ${sgn(b)} and then ${sgn(c)}. What is the overall change?`, `एक मूल्य ${sgnH(a)}, फिर ${sgnH(b)} और फिर ${sgnH(c)} जाता है। कुल परिवर्तन क्या है?`, o, 0, () => net(a, b, c),
    `${f(a)} × ${f(b)} × ${f(c)} = ${n(after(1, a, b, c))}: ${net(a, b, c) === 0 ? "no change" : "a " + P.chg(net(a, b, c))}.`, `${f(a)} × ${f(b)} × ${f(c)} = ${n(after(1, a, b, c))}, ${saidH(net(a, b, c))}।`),
  needed: (t, item, itemH, first, target, o) => {
    const r = clean((1 + target / 100) / (1 + first / 100) * 100 - 100);
    const word = r >= 0 ? "raised" : "cut";
    return Q(t, `The price of ${item} is ${first > 0 ? "raised" : "cut"} by ${Math.abs(first)}%. By what percentage must the new price be ${word} so that the final price is ${Math.abs(target)}% ${target >= 0 ? "above" : "below"} the original?`, `${itemH} का मूल्य ${Math.abs(first)}% ${first > 0 ? "बढ़ाया" : "घटाया"} जाता है। नए मूल्य को कितने प्रतिशत ${r >= 0 ? "बढ़ाया" : "घटाया"} जाए कि अंतिम मूल्य मूल से ${Math.abs(target)}% ${target >= 0 ? "अधिक" : "कम"} हो?`, o, 0, () => pct(Math.abs(r)),
      `${f(first)} × (new factor) = ${f(target)}, so the factor is ${f(target)} ÷ ${f(first)} = ${n(1 + r / 100)}: the new price must be ${word} by ${pct(Math.abs(r))}.`, `${f(first)} × (नया गुणक) = ${f(target)}, अतः गुणक ${f(target)} ÷ ${f(first)} = ${n(1 + r / 100)}: नया मूल्य ${pct(Math.abs(r))} ${r >= 0 ? "बढ़ाना" : "घटाना"} होगा।`);
  },
  diff: (t, a, b, d, o) => {
    const m = clean((1 + a / 100) * (1 + b / 100) - 1);
    return Q(t, `A number is ${sgn(a)} and the result is ${sgn(b)}. The final number is ${n(d)} more than the original. What was the original number?`, `एक संख्या को ${sgnH(a)} जाता है और परिणाम को ${sgnH(b)} जाता है। अंतिम संख्या मूल से ${n(d)} अधिक है। मूल संख्या क्या थी?`, o, 0, () => n(d / m),
      `${f(a)} × ${f(b)} = ${n(1 + m)}, an increase of ${n(m)} of the number. ${n(m)} × N = ${n(d)} gives N = ${n(d / m)}.`, `${f(a)} × ${f(b)} = ${n(1 + m)}, यानी संख्या की ${n(m)} गुना वृद्धि। ${n(m)} × N = ${n(d)} से N = ${n(d / m)}।`);
  },
  rise: (t, what, whatH, a, b, d, o) => {
    const m = clean((1 + a / 100) * (1 + b / 100) - 1);
    return Q(t, `A ${what} is ${sgn(a)} and then ${sgn(b)}. It is now ₹${n(d)} more than at first. What was it at first?`, `एक ${whatH} पहले ${sgnH(a)} और फिर ${sgnH(b)} जाता है। अब यह शुरुआत से ₹${n(d)} अधिक है। शुरुआत में यह कितना था?`, o, 0, () => rs(d / m),
      `${f(a)} × ${f(b)} = ${n(1 + m)}, so the rise is ${pct(m * 100)} of the starting amount: ${n(d)} ÷ ${n(m)} = ₹${n(d / m)}.`, `${f(a)} × ${f(b)} = ${n(1 + m)}, अतः वृद्धि शुरुआती राशि का ${pct(m * 100)} है: ${n(d)} ÷ ${n(m)} = ₹${n(d / m)}।`);
  },
  solid: (t, q, qh, ch, o, s, sh) => C(t, q, qh, o, 0, () => net(...ch), s, sh),
  ratio: (t, a, b, o) => C(t, `x is ${sgn(a)} and y is ${sgn(b)}. What is the change in x/y?`, `x को ${sgnH(a)} जाता है और y को ${sgnH(b)} जाता है। x/y में क्या परिवर्तन होता है?`, o, 0, () => clean(((1 + a / 100) / (1 + b / 100) - 1) * 100),
    `x/y becomes ${f(a)} ÷ ${f(b)} = ${n((1 + a / 100) / (1 + b / 100))} times itself: ${said(((1 + a / 100) / (1 + b / 100) - 1) * 100)}.`, `x/y अपना ${f(a)} ÷ ${f(b)} = ${n((1 + a / 100) / (1 + b / 100))} गुना हो जाता है, ${saidH(((1 + a / 100) / (1 + b / 100) - 1) * 100)}।`),
  product: (t, a, b, o) => C(t, `Of two numbers, the first is ${sgn(a)} and the second is ${sgn(b)}. What is the change in their product?`, `दो संख्याओं में पहली को ${sgnH(a)} जाता है और दूसरी को ${sgnH(b)} जाता है। उनके गुणनफल में क्या परिवर्तन होता है?`, o, 0, () => net(a, b),
    `The product is multiplied by ${f(a)} × ${f(b)} = ${n(after(1, a, b))}: ${said(net(a, b))}.`, `गुणनफल ${f(a)} × ${f(b)} = ${n(after(1, a, b))} से गुणा होता है, ${saidH(net(a, b))}।`),
  equal: (t, single, o) => {
    const up = single > 0;
    const r = clean((Math.sqrt(1 + single / 100) - 1) * 100);
    return Q(t, `Two equal successive percentage ${up ? "increases" : "decreases"} are together equal to a single ${up ? "increase" : "decrease"} of ${Math.abs(single)}%. What is each ${up ? "increase" : "decrease"}?`, `दो समान क्रमिक प्रतिशत ${up ? "वृद्धियाँ" : "कमियाँ"} मिलकर ${Math.abs(single)}% की एकल ${up ? "वृद्धि" : "कमी"} के बराबर हैं। प्रत्येक ${up ? "वृद्धि" : "कमी"} कितनी है?`, o, 0, () => pct(Math.abs(r)),
      `(1 ${up ? "+" : "−"} r)² = ${f(single)}, so 1 ${up ? "+" : "−"} r = ${n(1 + r / 100)} and r = ${pct(Math.abs(r))}.`, `(1 ${up ? "+" : "−"} r)² = ${f(single)}, अतः 1 ${up ? "+" : "−"} r = ${n(1 + r / 100)} और r = ${pct(Math.abs(r))}।`);
  },
  updown: (t, what, whatH, loss, o) => Q(t, `A ${what} is raised by some percentage and later cut by the same percentage, ending ${n(loss)}% below where it began. What was the percentage?`, `एक ${whatH} किसी प्रतिशत से बढ़ाया और बाद में उसी प्रतिशत से घटाया जाता है, जिससे वह शुरुआत से ${n(loss)}% कम रह जाता है। वह प्रतिशत क्या था?`, o, 0, () => pct(clean(Math.sqrt(loss * 100))),
    `An increase of a% then a decrease of a% gives a net change of −a²/100. a²/100 = ${n(loss)} gives a² = ${n(loss * 100)} and a = ${pct(clean(Math.sqrt(loss * 100)))}.`, `a% वृद्धि फिर a% कमी का कुल परिवर्तन −a²/100 है। a²/100 = ${n(loss)} से a² = ${n(loss * 100)} और a = ${pct(clean(Math.sqrt(loss * 100)))}।`),
  marked: (t, item, itemH, d1, d2, paid, o) => Q(t, `After two successive discounts of ${d1}% and ${d2}%, ${item} is sold for ₹${n(paid)}. What is its marked price?`, `${d1}% और ${d2}% की दो क्रमिक छूटों के बाद ${itemH} ₹${n(paid)} में बिकता है। उसका अंकित मूल्य क्या है?`, o, 0, () => rs(paid / ((1 - d1 / 100) * (1 - d2 / 100))),
    `The buyer pays ${f(-d1)} × ${f(-d2)} = ${n((1 - d1 / 100) * (1 - d2 / 100))} of the marked price. Marked price = ${n(paid)} ÷ ${n((1 - d1 / 100) * (1 - d2 / 100))} = ₹${n(paid / ((1 - d1 / 100) * (1 - d2 / 100)))}.`, `ख़रीदार अंकित मूल्य का ${f(-d1)} × ${f(-d2)} = ${n((1 - d1 / 100) * (1 - d2 / 100))} भाग देता है। अंकित मूल्य = ${n(paid)} ÷ ${n((1 - d1 / 100) * (1 - d2 / 100))} = ₹${n(paid / ((1 - d1 / 100) * (1 - d2 / 100)))}।`),
  area: (t, side, sideH, other, otherH, a, target, o) => {
    const r = clean(((1 + target / 100) / (1 + a / 100) - 1) * 100);
    return C(t, `The ${side} of a rectangle is ${sgn(a)}. How must its ${other} change so that the area ${target === 0 ? "stays the same" : target > 0 ? `increases by ${target}%` : `decreases by ${-target}%`}?`, `एक आयत की ${sideH} ${sgnHf(a)} जाती है। उसकी ${otherH} में कितना परिवर्तन हो कि क्षेत्रफल ${target === 0 ? "उतना ही रहे" : target > 0 ? `${target}% बढ़े` : `${-target}% घटे`}?`, o, 0, () => r,
      `${f(a)} × (${other} factor) = ${f(target)}, so the factor is ${f(target)} ÷ ${f(a)} = ${n(1 + r / 100)}: ${said(r)} in the ${other}.`, `${f(a)} × (${otherH} का गुणक) = ${f(target)}, अतः गुणक ${f(target)} ÷ ${f(a)} = ${n(1 + r / 100)}, ${saidH(r)}।`);
  },
  three_d: (t, [a, b, c], o) => Q(t, `Three successive discounts of ${a}%, ${b}% and ${c}% are equal to a single discount of:`, `${a}%, ${b}% और ${c}% की तीन क्रमिक छूटें किस एकल छूट के बराबर हैं?`, o, 0, () => pct(-net(-a, -b, -c)),
    `The buyer pays ${f(-a)} × ${f(-b)} × ${f(-c)} = ${n(after(1, -a, -b, -c))} of the price, so the single discount is ${pct(-net(-a, -b, -c))}.`, `ख़रीदार मूल्य का ${f(-a)} × ${f(-b)} × ${f(-c)} = ${n(after(1, -a, -b, -c))} भाग देता है, अतः एकल छूट ${pct(-net(-a, -b, -c))} है।`),
  // A's <noun> is a% more/less than B's, and B's is b% more/less than C's.
  // fem: the Hindi noun is feminine (की आय, की बचत) - else masculine (का
  // स्कोर, oblique के स्कोर).
  chain: (t, noun, nounH, fem, a, b, o) => {
    const c = net(a, b);
    const of = (p) => `${p} ${fem ? "की" : "का"} ${nounH}`;
    const ofO = (p) => `${p} ${fem ? "की" : "के"} ${nounH}`;
    const more = (x) => (x > 0 ? "more" : "less");
    const moreH = (x) => (x > 0 ? "अधिक" : "कम");
    return Q(t, `A's ${noun} is ${Math.abs(a)}% ${more(a)} than B's, and B's ${noun} is ${Math.abs(b)}% ${more(b)} than C's. By what percentage is A's ${noun} ${c >= 0 ? "more" : "less"} than C's?`,
      `${of("A")} ${ofO("B")} से ${Math.abs(a)}% ${moreH(a)} है, और ${of("B")} ${ofO("C")} से ${Math.abs(b)}% ${moreH(b)} है। ${of("A")} ${ofO("C")} से कितने प्रतिशत ${c >= 0 ? "अधिक" : "कम"} है?`, o, 0, () => pct(Math.abs(c)),
      `Take C's ${noun} = 100. B's = ${n(100 * (1 + b / 100))} and A's = ${n(100 * (1 + b / 100))} × ${f(a)} = ${n(after(100, b, a))}, so A's is ${pct(Math.abs(c))} ${c >= 0 ? "more" : "less"} than C's.`,
      `${of("C")} = 100 लें। B ${fem ? "की" : "का"} = ${n(100 * (1 + b / 100))} और A ${fem ? "की" : "का"} = ${n(100 * (1 + b / 100))} × ${f(a)} = ${n(after(100, b, a))}, अतः ${of("A")} ${ofO("C")} से ${pct(Math.abs(c))} ${c >= 0 ? "अधिक" : "कम"} है।`);
  },
  tax: (t, price, up, tx, d, o) => Q(t, `A ₹${n(price)} item is marked up by ${up}%, a ${tx}% tax is added to the marked price, and then a ${d}% discount is given on the total. What does the buyer pay?`, `₹${n(price)} की एक वस्तु पर ${up}% अधिक मूल्य अंकित होता है, अंकित मूल्य पर ${tx}% कर जुड़ता है, और फिर कुल पर ${d}% छूट दी जाती है। ख़रीदार कितना चुकाता है?`, o, 0, () => rs(after(price, up, tx, -d)),
    `${n(price)} × ${f(up)} = ₹${n(after(price, up))}; with tax ₹${n(after(price, up, tx))}; after the discount ₹${n(after(price, up, tx, -d))}.`, `${n(price)} × ${f(up)} = ₹${n(after(price, up))}; कर सहित ₹${n(after(price, up, tx))}; छूट के बाद ₹${n(after(price, up, tx, -d))}।`),
  offer: (t, single, a, b) => {
    const two = clean(-net(-a, -b));
    const ans = better(single, a, b);
    return Q(t, `A shop offers either a single discount of ${single}% or two successive discounts of ${a}% and ${b}%. Which is better for the buyer?`, `एक दुकान या तो ${single}% की एकल छूट देती है या ${a}% और ${b}% की दो क्रमिक छूटें। ख़रीदार के लिए कौन-सा बेहतर है?`, BETTER, BETTER.indexOf(ans), () => ans,
      `Two successive discounts of ${a}% and ${b}% = ${a} + ${b} − (${a} × ${b})/100 = ${n(two)}%, against a single ${single}%. ${ans === BETTER[2] ? "They are the same." : ans === BETTER[0] ? "The two successive discounts give more." : "The single discount gives more."}`,
      `${a}% और ${b}% की क्रमिक छूट = ${a} + ${b} − (${a} × ${b})/100 = ${n(two)}%, सामने एकल ${single}%। ${ans === BETTER[2] ? "दोनों समान हैं।" : ans === BETTER[0] ? "दो क्रमिक छूटें अधिक देती हैं।" : "एकल छूट अधिक देती है।"}`, BETTER_HI);
  },
  revenue: (t, item, itemH, taxCh, consCh, o) => C(t, `The tax on ${item} is ${sgn(taxCh)} and, as a result, its consumption is ${sgn(consCh)}. What is the change in the tax collected on it?`, `${itemH} पर कर ${sgnH(taxCh)} जाता है और इससे उसकी खपत ${growsHf(consCh)} है। उस पर वसूले गए कर में क्या परिवर्तन होता है?`, o, 0, () => net(taxCh, consCh),
    `Tax collected = tax rate × consumption: ${f(taxCh)} × ${f(consCh)} = ${n(after(1, taxCh, consCh))}, ${said(net(taxCh, consCh))}.`, `वसूला गया कर = कर की दर × खपत: ${f(taxCh)} × ${f(consCh)} = ${n(after(1, taxCh, consCh))}, ${saidH(net(taxCh, consCh))}।`),
  other: (t, a, total, o) => {
    const up = total > 0;
    const r = clean(((1 + total / 100) / (1 + a / 100) - 1) * 100);
    return Q(t, `Two successive ${up ? "increases" : "decreases"}, one of ${Math.abs(a)}% and the other unknown, together equal a single ${up ? "increase" : "decrease"} of ${Math.abs(total)}%. What is the other ${up ? "increase" : "decrease"}?`, `दो क्रमिक ${up ? "वृद्धियाँ" : "कमियाँ"}, एक ${Math.abs(a)}% और दूसरी अज्ञात, मिलकर ${Math.abs(total)}% की एकल ${up ? "वृद्धि" : "कमी"} के बराबर हैं। दूसरी ${up ? "वृद्धि" : "कमी"} कितनी है?`, o, 0, () => pct(Math.abs(r)),
      `${f(a)} × (other factor) = ${f(total)}, so the other factor is ${f(total)} ÷ ${f(a)} = ${n(1 + r / 100)}: ${pct(Math.abs(r))}.`, `${f(a)} × (दूसरा गुणक) = ${f(total)}, अतः दूसरा गुणक ${f(total)} ÷ ${f(a)} = ${n(1 + r / 100)}: ${pct(Math.abs(r))}।`);
  },
  cut: (t, item, itemH, priceUp, spendCh, o) => {
    const c = clean((1 - (1 + spendCh / 100) / (1 + priceUp / 100)) * 100);
    return Q(t, `The price of ${item} rises by ${priceUp}%, and a family's spending on it ${spendCh >= 0 ? `rises by only ${spendCh}%` : `falls by ${-spendCh}%`}. By what percentage did the family cut its consumption?`, `${itemH} का मूल्य ${priceUp}% बढ़ता है, और उस पर परिवार का खर्च ${spendCh >= 0 ? `केवल ${spendCh}% बढ़ता है` : `${-spendCh}% घटता है`}। परिवार ने अपनी खपत कितने प्रतिशत घटाई?`, o, 0, () => pct(c),
      `Spending = price × consumption: ${f(priceUp)} × c = ${f(spendCh)}, so c = ${n(1 - c / 100)} and consumption fell by ${pct(c)}.`, `खर्च = मूल्य × खपत: ${f(priceUp)} × c = ${f(spendCh)}, अतः c = ${n(1 - c / 100)} और खपत ${pct(c)} घटी।`);
  },
  speed: (t, who, whoH, sp, tm, o) => C(t, `${who} ${sp >= 0 ? `raises the speed by ${sp}%` : `lowers the speed by ${-sp}%`} and travels for ${Math.abs(tm)}% ${tm >= 0 ? "more" : "less"} time. What is the change in the distance covered?`, `${whoH} गति ${Math.abs(sp)}% ${sp >= 0 ? "बढ़ाता" : "घटाता"} है और ${Math.abs(tm)}% ${tm >= 0 ? "अधिक" : "कम"} समय चलता है। तय दूरी में क्या परिवर्तन होता है?`, o, 0, () => net(sp, tm),
    `Distance = speed × time: ${f(sp)} × ${f(tm)} = ${n(after(1, sp, tm))}, ${said(net(sp, tm))}.`, `दूरी = गति × समय: ${f(sp)} × ${f(tm)} = ${n(after(1, sp, tm))}, ${saidH(net(sp, tm))}।`),
  shape: (t, shape, shapeH, part, partH, areaCh, o) => {
    const up = areaCh > 0;
    const r = clean((Math.sqrt(1 + areaCh / 100) - 1) * 100);
    return Q(t, `The ${part} of a ${shape} is ${up ? "increased" : "decreased"} by some percentage and its area ${up ? "increases" : "decreases"} by ${Math.abs(areaCh)}%. By what percentage was the ${part} ${up ? "increased" : "decreased"}?`, `एक ${shapeH} की ${partH} किसी प्रतिशत से ${up ? "बढ़ाई" : "घटाई"} जाती है और उसका क्षेत्रफल ${Math.abs(areaCh)}% ${up ? "बढ़" : "घट"} जाता है। ${partH} कितने प्रतिशत ${up ? "बढ़ाई" : "घटाई"} गई?`, o, 0, () => pct(Math.abs(r)),
      `The area depends on ${part} × ${part}: (1 ${up ? "+" : "−"} r)² = ${f(areaCh)}, so 1 ${up ? "+" : "−"} r = ${n(1 + r / 100)} and the ${part} changed by ${pct(Math.abs(r))}.`, `क्षेत्रफल ${partH} × ${partH} पर निर्भर है: (1 ${up ? "+" : "−"} r)² = ${f(areaCh)}, अतः 1 ${up ? "+" : "−"} r = ${n(1 + r / 100)} और ${partH} ${pct(Math.abs(r))} बदली।`);
  },
};

module.exports = { K, Q, C, P, L, better, BETTER, BETTER_HI };
