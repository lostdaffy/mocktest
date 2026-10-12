// Questions that need a picture: Data Interpretation charts and figure-based
// (non-verbal) reasoning.
//
// Two different kinds, handled two different ways:
//
//  - A CHART is data. The question stores the numbers and the app draws the
//    chart itself, so there is nothing to upload and nothing to go wrong in a
//    drawing. The numbers are checked here: every question in a set carries a
//    small formula over the chart, the formula is worked out in code, and a
//    question whose marked answer does not match the arithmetic is thrown out.
//
//  - A FIGURE is drawn. The model describes it as a precise spec (shapes on a
//    grid), and from that spec this file writes, deterministically, the prompt
//    the admin gives an image AI, and a reference drawing the admin compares
//    the uploaded picture against. Nothing about the prompt is left to the
//    model's wording. Where the figure follows a rule this file understands
//    (rotation, mirror image, water image), the marked answer is worked out in
//    code too.
//
// Until its picture is uploaded, a figure question keeps its test from being
// published - see imagesPendingIn().

// ===================================================================
//  CHARTS
// ===================================================================

const CHART_TYPES = ["bar", "line", "pie", "table", "mixed", "caselet"];

const num = (v) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, "")));

/** Cleans a chart the model returned; throws with a readable reason if it is unusable. */
function normaliseChart(raw) {
  if (!raw || typeof raw !== "object") throw new Error("no chart");
  const type = String(raw.type || "").toLowerCase();
  if (!CHART_TYPES.includes(type)) throw new Error(`unknown chart type "${raw.type}"`);

  const chart = {
    type,
    title: String(raw.title || "").trim(),
    titleHi: String(raw.titleHi || "").trim() || undefined,
    unit: String(raw.unit || "").trim() || undefined,
    xLabel: String(raw.xLabel || "").trim() || undefined,
    yLabel: String(raw.yLabel || "").trim() || undefined,
  };

  if (type === "caselet") {
    chart.caselet = String(raw.caselet || "").trim();
    chart.caseletHi = String(raw.caseletHi || "").trim() || undefined;
    if (chart.caselet.length < 80) throw new Error("caselet text is missing or too short");
    return chart;
  }

  const categories = (raw.categories || []).map((c) => String(c ?? "").trim());
  if (categories.length < 2 || categories.length > 10) throw new Error("a chart needs 2 to 10 categories");
  if (new Set(categories.map((c) => c.toLowerCase())).size !== categories.length) throw new Error("two categories have the same name");
  if (categories.some((c) => !c)) throw new Error("a category has no name");

  const series = (raw.series || []).map((s) => ({
    name: String(s?.name ?? "").trim(),
    values: (s?.values || []).map(num),
    as: s?.as === "line" ? "line" : s?.as === "bar" ? "bar" : undefined,
  }));
  if (!series.length || series.length > 6) throw new Error("a chart needs 1 to 6 data series");
  for (const s of series) {
    if (!s.name) throw new Error("a data series has no name");
    if (s.values.length !== categories.length) throw new Error(`"${s.name}" has ${s.values.length} values for ${categories.length} categories`);
    if (s.values.some((v) => !Number.isFinite(v))) throw new Error(`"${s.name}" has a value that is not a number`);
  }
  if (new Set(series.map((s) => s.name.toLowerCase())).size !== series.length) throw new Error("two data series have the same name");

  if (type === "pie") {
    if (series.length !== 1) throw new Error("a pie chart has exactly one data series");
    if (series[0].values.some((v) => v <= 0)) throw new Error("a pie slice must be positive");
  }
  if (type === "mixed") {
    for (const s of series) s.as = s.as || "bar";
    if (!series.some((s) => s.as === "bar") || !series.some((s) => s.as === "line")) {
      throw new Error("a mixed chart needs at least one bar series and one line series");
    }
  }
  chart.categories = categories;
  chart.series = series;
  return chart;
}

/** The chart as plain text: what the checking model reads in place of a picture. */
function chartAsText(chart) {
  if (!chart) return "";
  if (chart.type === "caselet") return `${chart.title ? chart.title + "\n" : ""}${chart.caselet}`;
  const unit = chart.unit ? ` (${chart.unit})` : "";
  const head = ["", ...chart.series.map((s) => s.name + (chart.type === "mixed" ? ` [${s.as}]` : ""))];
  const rows = chart.categories.map((c, i) => [c, ...chart.series.map((s) => String(s.values[i]))]);
  const line = (cells) => `| ${cells.join(" | ")} |`;
  return [
    `${chart.type.toUpperCase()} CHART: ${chart.title || "data"}${unit}`,
    line(head),
    line(head.map(() => "---")),
    ...rows.map(line),
  ].join("\n");
}

// ---- the formula each DI question carries -------------------------------
//
// A tiny arithmetic language, parsed here by hand - never eval. Numbers,
// + - * / ^, brackets, and these functions over the chart:
//   v("series", "category")   one value
//   sum("series")             a series' total        (sum() = whole chart)
//   avg("series")             a series' average
//   max("series") / min(...)  a series' largest / smallest value
//   cat("category")           all series added up for one category
//   pct(a, b)                 a as a percentage of b
//   abs(x), round(x)

function tokenize(src) {
  const out = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_]\w*)|(.))/g;
  let m;
  while ((m = re.exec(src)) && m[0].length) {
    if (m[1]) out.push({ t: "num", v: Number(m[1]) });
    else if (m[2]) out.push({ t: "str", v: m[2].slice(1, -1) });
    else if (m[3]) out.push({ t: "id", v: m[3] });
    else if (m[4] && m[4].trim()) out.push({ t: "op", v: m[4] });
  }
  return out;
}

function evaluateFormula(formula, chart) {
  const toks = tokenize(String(formula || ""));
  let i = 0;
  const peek = () => toks[i];
  const take = (v) => {
    const t = toks[i];
    if (!t || (v && t.v !== v)) throw new Error(`formula: expected ${v || "more"} near token ${i + 1}`);
    i++;
    return t;
  };
  const series = (name) => {
    const s = chart.series.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
    if (!s) throw new Error(`formula: no series "${name}"`);
    return s;
  };
  const catIndex = (name) => {
    const k = chart.categories.findIndex((c) => c.toLowerCase() === String(name).toLowerCase());
    if (k < 0) throw new Error(`formula: no category "${name}"`);
    return k;
  };
  const all = () => chart.series.flatMap((s) => s.values);
  const fns = {
    v: (s, c) => series(s).values[catIndex(c)],
    sum: (s) => (s === undefined ? all() : series(s).values).reduce((a, b) => a + b, 0),
    avg: (s) => {
      const vals = s === undefined ? all() : series(s).values;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    },
    max: (s) => Math.max(...(s === undefined ? all() : series(s).values)),
    min: (s) => Math.min(...(s === undefined ? all() : series(s).values)),
    cat: (c) => chart.series.reduce((n, s) => n + s.values[catIndex(c)], 0),
    pct: (a, b) => (a / b) * 100,
    abs: (x) => Math.abs(x),
    round: (x) => Math.round(x),
  };

  function primary() {
    const t = peek();
    if (!t) throw new Error("formula ends too early");
    if (t.t === "num") return take().v;
    if (t.t === "str") return take().v;
    if (t.v === "(") {
      take("(");
      const v = expr();
      take(")");
      return v;
    }
    if (t.v === "-") {
      take("-");
      return -unary();
    }
    if (t.t === "id") {
      const name = take().v;
      const fn = fns[name];
      if (!fn) throw new Error(`formula: unknown function ${name}`);
      take("(");
      const args = [];
      if (peek()?.v !== ")") {
        args.push(expr());
        while (peek()?.v === ",") {
          take(",");
          args.push(expr());
        }
      }
      take(")");
      return fn(...args);
    }
    throw new Error(`formula: unexpected "${t.v}"`);
  }
  function unary() {
    return primary();
  }
  function power() {
    let v = unary();
    while (peek()?.v === "^") {
      take("^");
      v = Math.pow(v, unary());
    }
    return v;
  }
  function term() {
    let v = power();
    while (peek() && (peek().v === "*" || peek().v === "/")) {
      const op = take().v;
      const r = power();
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function expr() {
    let v = term();
    while (peek() && (peek().v === "+" || peek().v === "-")) {
      const op = take().v;
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  const value = expr();
  if (i !== toks.length) throw new Error(`formula: unexpected "${toks[i].v}"`);
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("formula does not give a number");
  return value;
}

// The number an option states: "42.5%", "₹ 1,250", "3 : 4" (as 0.75), "12 lakh".
function optionNumber(text) {
  const s = String(text ?? "").replace(/,/g, "").trim();
  const ratio = s.match(/^(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)$/);
  if (ratio) return Number(ratio[1]) / Number(ratio[2]);
  const frac = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const plain = s.match(/(-?\d+(?:\.\d+)?)/);
  return plain ? Number(plain[1]) : null;
}

// Does the computed value say what the option says? Exam options are
// rounded - 33.33% for a third, 16.7 for 16.666 - so the value is rounded to
// as many decimals as the option shows. A ratio or fraction is compared as
// the number it stands for. Nothing looser: 330 and 331 are different
// answers, however large the numbers.
function matches(computed, optionText) {
  const stated = optionNumber(optionText);
  if (stated === null) return false;
  const s = String(optionText ?? "").replace(/,/g, "").trim();
  if (/^-?\d+(?:\.\d+)?\s*[:/]\s*\d|^-?\d+\s+\d+\s*\/\s*\d/.test(s)) {
    return Math.abs(computed - stated) <= Math.max(1e-6, Math.abs(stated) * 1e-4);
  }
  const decimals = (s.match(/-?\d+\.(\d+)/)?.[1] || "").length;
  const f = 10 ** decimals;
  return Math.abs(Math.round(computed * f) / f - stated) < 1e-9 || Math.abs(computed - stated) < 1e-9;
}

/**
 * Works a DI question out from its chart. Returns { ok, reason }.
 * ok === null means the question cannot be checked in code (a non-numeric
 * answer, such as "2019"); the AI check still applies to it.
 */
function checkChartAnswer(q, chart) {
  if (chart.type === "caselet") return { ok: null, reason: "caselet answers are checked by the AI only" };
  const options = q.options || [];
  const stated = optionNumber(options[q.correctIndex]);
  if (stated === null) {
    // A category answer ("Which year had the highest sales?"): a formula can
    // still name it, as the category whose value it is.
    return { ok: null, reason: "the answer is not a number" };
  }
  if (!q.formula) return { ok: false, reason: "no formula to check the answer with" };
  let computed;
  try {
    computed = evaluateFormula(q.formula, chart);
  } catch (err) {
    return { ok: false, reason: err.message };
  }
  if (!matches(computed, options[q.correctIndex])) {
    return { ok: false, reason: `the chart gives ${+computed.toFixed(3)}, the marked answer says ${options[q.correctIndex]}` };
  }
  const twin = options.findIndex((o, k) => k !== q.correctIndex && matches(computed, o));
  if (twin >= 0) return { ok: false, reason: `option ${"ABCD"[twin]} also equals the answer` };
  return { ok: true };
}

// ===================================================================
//  FIGURES
// ===================================================================

const SHAPES = ["circle", "square", "triangle", "arrow", "star", "plus", "line", "dot", "semicircle", "pentagon", "hexagon", "heart", "cross"];
const FILLS = ["black", "white", "striped"];
const SIZES = ["small", "medium", "large"];
const LAYOUTS = ["series", "mirror", "water", "odd_one_out", "analogy"];

// How far a shape turns before it looks the same again (degrees). A circle
// looks the same at any angle; an arrow only after a full turn.
const SYMMETRY = { circle: 1, dot: 1, square: 90, plus: 90, cross: 90, line: 180, star: 72, pentagon: 72, hexagon: 60, triangle: 120, arrow: 360, semicircle: 360, heart: 360 };

const mod = (a, n) => ((a % n) + n) % n;

/** Cleans a figure spec; throws with a readable reason if it is unusable. */
function normaliseFigure(raw) {
  if (!raw || typeof raw !== "object") throw new Error("no figure spec");
  const layout = String(raw.layout || "").toLowerCase();
  if (!LAYOUTS.includes(layout)) throw new Error(`unknown figure layout "${raw.layout}"`);
  const grid = Number(raw.grid) || 3;
  if (![2, 3, 4].includes(grid)) throw new Error("grid must be 2, 3 or 4");

  const panel = (p, where) => {
    const elements = (p?.elements || p || []).map((e) => ({
      shape: String(e?.shape || "").toLowerCase(),
      row: Number(e?.row),
      col: Number(e?.col),
      fill: String(e?.fill || "white").toLowerCase(),
      size: String(e?.size || "medium").toLowerCase(),
      rotate: mod(Math.round(Number(e?.rotate) || 0), 360),
    }));
    if (!elements.length) throw new Error(`${where} is empty`);
    if (elements.length > grid * grid) throw new Error(`${where} has more shapes than cells`);
    const cells = new Set();
    for (const e of elements) {
      if (!SHAPES.includes(e.shape)) throw new Error(`${where}: unknown shape "${e.shape}"`);
      if (!FILLS.includes(e.fill)) throw new Error(`${where}: unknown fill "${e.fill}"`);
      if (!SIZES.includes(e.size)) throw new Error(`${where}: unknown size "${e.size}"`);
      if (!(e.row >= 1 && e.row <= grid && e.col >= 1 && e.col <= grid)) throw new Error(`${where}: a shape is outside the ${grid}x${grid} grid`);
      if (e.rotate % 45) throw new Error(`${where}: turns must be multiples of 45 degrees`);
      const key = `${e.row},${e.col}`;
      if (cells.has(key)) throw new Error(`${where}: two shapes share row ${e.row}, column ${e.col}`);
      cells.add(key);
    }
    return { elements };
  };

  const question = (raw.question || []).map((p, k) => panel(p, `problem figure ${k + 1}`));
  const options = (raw.options || []).map((p, k) => panel(p, `option ${"ABCD"[k]}`));
  const wantQuestion = { series: [3, 5], analogy: [3, 3], mirror: [1, 1], water: [1, 1], odd_one_out: [0, 0] }[layout];
  if (question.length < wantQuestion[0] || question.length > wantQuestion[1]) {
    throw new Error(`a ${layout} figure needs ${wantQuestion[0] === wantQuestion[1] ? wantQuestion[0] : `${wantQuestion[0]}-${wantQuestion[1]}`} problem figure(s)`);
  }
  if (options.length !== 4) throw new Error("a figure question needs exactly 4 answer figures");

  const ruleType = String(raw.rule?.type || "none").toLowerCase();
  const rule = { type: ruleType };
  if (ruleType === "rotate") {
    rule.by = mod(Number(raw.rule.by) || 0, 360);
    if (!rule.by || rule.by % 90) throw new Error("a whole-figure rotation must be 90, 180 or 270 degrees");
  } else if (ruleType === "turn_shapes") {
    rule.by = mod(Number(raw.rule.by) || 0, 360);
    if (!rule.by || rule.by % 45) throw new Error("shapes must turn by a multiple of 45 degrees");
  } else if (!["none", "mirror", "water"].includes(ruleType)) {
    throw new Error(`unknown rule "${raw.rule?.type}"`);
  }
  if (layout === "mirror" && ruleType !== "mirror") rule.type = "mirror";
  if (layout === "water" && ruleType !== "water") rule.type = "water";

  const spec = { layout, grid, question, options, rule };
  // Two identical answer figures make the question unanswerable.
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) {
      if (samePanel(options[a], options[b])) throw new Error(`options ${"ABCD"[a]} and ${"ABCD"[b]} are the same figure`);
    }
  }
  return spec;
}

function normEl(e) {
  const sym = SYMMETRY[e.shape] || 360;
  return `${e.shape}|${e.row}|${e.col}|${e.fill}|${e.size}|${sym === 1 ? 0 : mod(e.rotate, sym)}`;
}
function samePanel(a, b) {
  const x = a.elements.map(normEl).sort().join(";");
  const y = b.elements.map(normEl).sort().join(";");
  return x === y;
}

// The whole figure turned clockwise about its centre.
function rotatePanel(p, by, grid) {
  return {
    elements: p.elements.map((e) => {
      let { row, col } = e;
      for (let k = 0; k < by / 90; k++) [row, col] = [col, grid + 1 - row];
      return { ...e, row, col, rotate: mod(e.rotate + by, 360) };
    }),
  };
}
function turnShapes(p, by) {
  return { elements: p.elements.map((e) => ({ ...e, rotate: mod(e.rotate + by, 360) })) };
}
// A mirror standing to the right of the figure: left and right swap.
function mirrorPanel(p, grid) {
  return { elements: p.elements.map((e) => ({ ...e, col: grid + 1 - e.col, rotate: mod(-e.rotate, 360) })) };
}
// Water below the figure: top and bottom swap.
function waterPanel(p, grid) {
  return { elements: p.elements.map((e) => ({ ...e, row: grid + 1 - e.row, rotate: mod(180 - e.rotate, 360) })) };
}

/**
 * Works the figure's answer out where the rule allows it.
 * { ok: true } - the marked option is exactly what the rule produces, and no
 *               other option is.
 * { ok: false, reason } - it is not.
 * { ok: null, reason } - this kind of figure cannot be worked out in code
 *               (odd one out, a free pattern); the admin must check it by eye.
 */
function checkFigureAnswer(spec, correctIndex) {
  const { rule, grid, question, options, layout } = spec;
  let expected;
  if (rule.type === "mirror") expected = mirrorPanel(question[0], grid);
  else if (rule.type === "water") expected = waterPanel(question[0], grid);
  else if (layout === "series" && (rule.type === "rotate" || rule.type === "turn_shapes")) {
    const step = (p) => (rule.type === "rotate" ? rotatePanel(p, rule.by, grid) : turnShapes(p, rule.by));
    // The rule has to hold across the problem figures too, or it is not the rule.
    for (let k = 1; k < question.length; k++) {
      if (!samePanel(step(question[k - 1]), question[k])) {
        return { ok: false, reason: `problem figure ${k + 1} does not follow the stated rule from figure ${k}` };
      }
    }
    expected = step(question[question.length - 1]);
  } else {
    return { ok: null, reason: "this kind of figure is not checked in code - check the answer by eye" };
  }
  if (!samePanel(options[correctIndex], expected)) {
    const right = options.findIndex((o) => samePanel(o, expected));
    return {
      ok: false,
      reason: right >= 0 ? `the rule gives option ${"ABCD"[right]}, not ${"ABCD"[correctIndex]}` : "no option is what the rule produces",
    };
  }
  return { ok: true };
}

// ---- words for the prompt -----------------------------------------------

const DIRECTIONS = { 0: "pointing straight up", 45: "pointing to the upper right", 90: "pointing right", 135: "pointing to the lower right", 180: "pointing straight down", 225: "pointing to the lower left", 270: "pointing left", 315: "pointing to the upper left" };
const LINE_DIRECTIONS = { 0: "vertical", 45: "diagonal, from bottom-left to top-right", 90: "horizontal", 135: "diagonal, from top-left to bottom-right" };
const FILL_WORDS = { black: "solid black", white: "outline only, white inside", striped: "outlined, filled with thin diagonal stripes" };
const SIZE_WORDS = { small: "small", medium: "medium-sized", large: "large" };
const SHAPE_WORDS = { circle: "circle", square: "square", triangle: "equilateral triangle", arrow: "arrow", star: "five-pointed star", plus: "plus sign", line: "straight line", dot: "dot", semicircle: "semicircle", pentagon: "regular pentagon", hexagon: "regular hexagon", heart: "heart", cross: "X (cross) sign" };

function cellName(row, col, grid) {
  const r = grid === 3 ? ["top", "middle", "bottom"][row - 1] : grid === 2 ? ["top", "bottom"][row - 1] : null;
  const c = grid === 3 ? ["left", "centre", "right"][col - 1] : grid === 2 ? ["left", "right"][col - 1] : null;
  const named = r && c ? (r === "middle" && c === "centre" ? "the exact centre" : `${r}-${c}`) : null;
  return `row ${row}, column ${col}${named ? ` (${named})` : ""}`;
}

function describeElement(e, grid) {
  const sym = SYMMETRY[e.shape] || 360;
  const turn = sym === 1 ? 0 : mod(e.rotate, sym);
  let orientation = "";
  if (e.shape === "line") orientation = `, ${LINE_DIRECTIONS[mod(e.rotate, 180)]}`;
  else if (["triangle", "arrow", "semicircle"].includes(e.shape)) {
    const what = e.shape === "semicircle" ? "its curved side" : "its tip";
    orientation = `, ${what} ${DIRECTIONS[e.rotate]}`;
  } else if (e.shape === "heart") {
    // An upright heart has its point at the bottom.
    orientation = `, its point ${DIRECTIONS[mod(e.rotate + 180, 360)].replace("pointing", "facing")}`;
  } else if (turn) orientation = `, turned ${turn} degrees clockwise${e.shape === "square" && turn === 45 ? " so it stands on one corner (a diamond)" : ""}`;
  const fill = ["line", "plus", "cross", "dot"].includes(e.shape) ? "black" : FILL_WORDS[e.fill];
  const size = e.shape === "dot" ? "" : `${SIZE_WORDS[e.size]} `;
  return `a ${size}${SHAPE_WORDS[e.shape]} (${fill})${orientation}, in ${cellName(e.row, e.col, grid)}`;
}

function describePanel(p, grid) {
  const sorted = [...p.elements].sort((a, b) => a.row - b.row || a.col - b.col);
  return sorted.map((e) => `    - ${describeElement(e, grid)}`).join("\n");
}

/** The exact prompt for an image AI. Built from the spec alone - nothing is reworded by a model. */
function figurePrompt(spec) {
  const { layout, grid, question, options } = spec;
  const boxes = [];
  if (layout === "series") {
    boxes.push(`- TOP ROW, left to right: ${question.length} boxes labelled ${question.map((_, k) => `"${k + 1}"`).join(", ")} underneath, then one more box of the same size containing only a large question mark "?".`);
  } else if (layout === "analogy") {
    boxes.push(`- TOP ROW, left to right, in exactly this order: box "1", a ":" sign, box "2", a "::" sign, box "3", a ":" sign, then one more box of the same size containing only a large question mark "?".`);
  } else if (layout === "mirror") {
    boxes.push(`- TOP ROW: one box labelled "Question figure" underneath. Directly to its right, a vertical dashed line the same height as the box, labelled "M" at its top (this is the mirror).`);
  } else if (layout === "water") {
    boxes.push(`- TOP ROW: one box labelled "Question figure" underneath. Directly below that box (above the label), a horizontal wavy line the same width as the box (this is the water surface).`);
  }
  boxes.push(`- ${layout === "odd_one_out" ? "ONE ROW" : "BOTTOM ROW"}, left to right: 4 boxes labelled "(A)", "(B)", "(C)", "(D)" underneath.`);

  const lines = [];
  question.forEach((p, k) => lines.push(`  Box ${layout === "mirror" || layout === "water" ? '"Question figure"' : `"${k + 1}"`}:\n${describePanel(p, grid)}`));
  options.forEach((p, k) => lines.push(`  Box "(${"ABCD"[k]})":\n${describePanel(p, grid)}`));

  return `Create ONE image: a clean, flat, black-and-white diagram for a printed competitive-exam reasoning question.

STYLE
- Pure white background. Thin, crisp black lines. Flat 2D only - no shading, no gradients, no 3D, no colour, no hand-drawn look, no decorations, no watermark.
- Every box is the same size: a square with a thin black border. Leave clear space between boxes.
- Labels in a plain sans-serif font, centred under each box. No other text anywhere.

LAYOUT
${boxes.join("\n")}

POSITIONS INSIDE A BOX
- Treat every box as an invisible ${grid} x ${grid} grid. Do NOT draw the grid lines.
- Rows are numbered 1 to ${grid} from top to bottom; columns 1 to ${grid} from left to right. Row 1, column 1 is the top-left cell.
- Draw each shape centred in its cell. "Large" fills about three-quarters of the cell, "medium" about half, "small" about a quarter.
- Directions are as seen on the page: "up" is towards the top edge of the image.

WHAT GOES IN EACH BOX (exactly these shapes - nothing more, nothing less)
${lines.join("\n")}

BEFORE YOU FINISH, CHECK
- Each box has exactly the number of shapes listed for it.
- Each shape is in exactly the stated row and column, facing exactly the stated direction, with exactly the stated fill.
- Boxes that are meant to differ really do differ, and no box has an extra mark.`;
}

/** The figure as words: what the checking model reads in place of a picture. */
function figureAsText(spec) {
  const { layout, grid, question, options, rule } = spec;
  const parts = [`FIGURE (${layout.replace(/_/g, " ")}, each box a ${grid}x${grid} grid, row 1 = top, column 1 = left):`];
  question.forEach((p, k) => parts.push(`Problem figure ${layout === "mirror" || layout === "water" ? "" : k + 1}:\n${describePanel(p, grid)}`));
  options.forEach((p, k) => parts.push(`Answer figure (${"ABCD"[k]}):\n${describePanel(p, grid)}`));
  if (layout === "mirror") parts.push("The mirror stands to the RIGHT of the question figure.");
  if (layout === "water") parts.push("The water surface is BELOW the question figure.");
  if (rule?.type === "none" && layout === "series") parts.push("Find the figure that comes next in the series.");
  return parts.join("\n");
}

// ---- the reference drawing ----------------------------------------------

const BOX = 120;
const GAP = 26;
const LABEL = 22;

function shapePath(shape, r) {
  const pts = (n, start = -90, rad = r) =>
    Array.from({ length: n }, (_, k) => {
      const a = ((start + (360 / n) * k) * Math.PI) / 180;
      return `${(rad * Math.cos(a)).toFixed(2)},${(rad * Math.sin(a)).toFixed(2)}`;
    }).join(" ");
  switch (shape) {
    case "circle":
      return `<circle r="${r}"/>`;
    case "dot":
      return `<circle r="${Math.max(3, r * 0.22)}" data-dot="1"/>`;
    case "square":
      return `<rect x="${-r * 0.8}" y="${-r * 0.8}" width="${r * 1.6}" height="${r * 1.6}"/>`;
    case "triangle":
      return `<polygon points="${pts(3)}"/>`;
    case "pentagon":
      return `<polygon points="${pts(5)}"/>`;
    case "hexagon":
      return `<polygon points="${pts(6)}"/>`;
    case "star": {
      const outer = Array.from({ length: 10 }, (_, k) => {
        const a = ((-90 + 36 * k) * Math.PI) / 180;
        const rad = k % 2 ? r * 0.42 : r;
        return `${(rad * Math.cos(a)).toFixed(2)},${(rad * Math.sin(a)).toFixed(2)}`;
      }).join(" ");
      return `<polygon points="${outer}"/>`;
    }
    case "arrow":
      return `<polygon points="0,${-r} ${r * 0.62},${-r * 0.2} ${r * 0.22},${-r * 0.2} ${r * 0.22},${r} ${-r * 0.22},${r} ${-r * 0.22},${-r * 0.2} ${-r * 0.62},${-r * 0.2}"/>`;
    case "semicircle":
      return `<path d="M ${-r} ${r * 0.35} A ${r} ${r} 0 0 1 ${r} ${r * 0.35} Z"/>`;
    case "heart":
      return `<path d="M 0 ${r * 0.9} C ${-r * 1.3} ${-r * 0.1} ${-r * 0.6} ${-r * 1.0} 0 ${-r * 0.35} C ${r * 0.6} ${-r * 1.0} ${r * 1.3} ${-r * 0.1} 0 ${r * 0.9} Z"/>`;
    case "plus":
      return `<path d="M 0 ${-r} V ${r} M ${-r} 0 H ${r}" data-stroke="1"/>`;
    case "cross":
      return `<path d="M ${-r * 0.75} ${-r * 0.75} L ${r * 0.75} ${r * 0.75} M ${r * 0.75} ${-r * 0.75} L ${-r * 0.75} ${r * 0.75}" data-stroke="1"/>`;
    case "line":
      return `<path d="M 0 ${-r} V ${r}" data-stroke="1"/>`;
    default:
      return "";
  }
}

function panelSvg(p, grid, x, y, label) {
  const cell = BOX / grid;
  const size = { small: 0.18, medium: 0.3, large: 0.42 };
  const shapes = p.elements
    .map((e) => {
      const cx = x + (e.col - 0.5) * cell;
      const cy = y + (e.row - 0.5) * cell;
      const r = cell * size[e.size];
      // Stripes run the same way on the page however the shape is turned:
      // the prompt names no stripe direction, so the drawing must not have one.
      let fill = e.fill === "black" ? "#000" : e.fill === "striped" ? `url(#stripes${e.rotate})` : "#fff";
      let body = shapePath(e.shape, r);
      if (/data-stroke/.test(body)) fill = "none";
      if (/data-dot/.test(body)) fill = "#000";
      // A heart's point is its bottom at 0 degrees; everything else points up.
      return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${e.rotate})" fill="${fill}" stroke="#000" stroke-width="2">${body}</g>`;
    })
    .join("");
  return `<rect x="${x}" y="${y}" width="${BOX}" height="${BOX}" fill="#fff" stroke="#000" stroke-width="1.5"/>${shapes}<text x="${x + BOX / 2}" y="${y + BOX + 17}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14">${label}</text>`;
}

// One stripe pattern per turn, each turned back by that much, so the stripes
// always end up at 45 degrees on the page.
const STRIPE_PATTERNS = [0, 45, 90, 135, 180, 225, 270, 315]
  .map(
    (r) =>
      `<pattern id="stripes${r}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(${45 - r})"><rect width="6" height="6" fill="#fff"/><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="1.6"/></pattern>`
  )
  .join("");

/** An SVG of the spec, drawn by code - the reference the uploaded picture is compared against. */
function figureSvg(spec) {
  const { layout, grid, question, options } = spec;
  const parts = [];
  let width = 0;
  let y = 10;
  if (layout !== "odd_one_out") {
    let x = 10;
    if (layout === "series") {
      question.forEach((p, k) => {
        parts.push(panelSvg(p, grid, x, y, String(k + 1)));
        x += BOX + GAP;
      });
      parts.push(`<rect x="${x}" y="${y}" width="${BOX}" height="${BOX}" fill="#fff" stroke="#000" stroke-width="1.5"/><text x="${x + BOX / 2}" y="${y + BOX / 2 + 16}" text-anchor="middle" font-family="Arial, sans-serif" font-size="46">?</text>`);
      x += BOX + GAP;
    } else if (layout === "analogy") {
      const sep = (t) => {
        parts.push(`<text x="${x + 6}" y="${y + BOX / 2 + 8}" font-family="Arial, sans-serif" font-size="24">${t}</text>`);
        x += 34;
      };
      parts.push(panelSvg(question[0], grid, x, y, "1"));
      x += BOX + 8;
      sep(":");
      parts.push(panelSvg(question[1], grid, x, y, "2"));
      x += BOX + 8;
      sep("::");
      parts.push(panelSvg(question[2], grid, x, y, "3"));
      x += BOX + 8;
      sep(":");
      parts.push(`<rect x="${x}" y="${y}" width="${BOX}" height="${BOX}" fill="#fff" stroke="#000" stroke-width="1.5"/><text x="${x + BOX / 2}" y="${y + BOX / 2 + 16}" text-anchor="middle" font-family="Arial, sans-serif" font-size="46">?</text>`);
      x += BOX + GAP;
    } else {
      parts.push(panelSvg(question[0], grid, x, y, "Question figure"));
      if (layout === "mirror") {
        parts.push(`<line x1="${x + BOX + 14}" y1="${y - 4}" x2="${x + BOX + 14}" y2="${y + BOX + 4}" stroke="#000" stroke-width="2" stroke-dasharray="6 4"/><text x="${x + BOX + 14}" y="${y + 8}" dx="6" font-family="Arial, sans-serif" font-size="13">M</text>`);
      } else {
        const wy = y + BOX + 4;
        parts.push(`<path d="M ${x} ${wy} q 7.5 -5 15 0 t 15 0 t 15 0 t 15 0 t 15 0 t 15 0 t 15 0 t 15 0" fill="none" stroke="#000" stroke-width="1.5"/>`);
      }
      x += BOX + GAP + 20;
    }
    width = Math.max(width, x);
    y += BOX + LABEL + 24;
  }
  let x = 10;
  options.forEach((p, k) => {
    parts.push(panelSvg(p, grid, x, y, `(${"ABCD"[k]})`));
    x += BOX + GAP;
  });
  width = Math.max(width, x);
  const height = y + BOX + LABEL + 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${STRIPE_PATTERNS}</defs><rect width="100%" height="100%" fill="#fff"/>${parts.join("")}</svg>`;
}

// ===================================================================
//  SHARED
// ===================================================================

/** What the checking model is shown above a visual question's text. */
function visualAsText(visual) {
  if (!visual?.kind) return "";
  if (visual.kind === "chart") return chartAsText(visual.chart);
  if (visual.kind === "figure") return visual.figure?.spec ? figureAsText(visual.figure.spec) : "";
  return "";
}

/**
 * Part of a visual question's identity. "What is the average of A?" asked
 * about two different charts is two different questions; without this the
 * duplicate check would throw the second one away.
 */
function visualSignature(visual) {
  if (!visual?.kind) return "";
  const src = visual.kind === "chart" ? JSON.stringify(visual.chart || {}) : JSON.stringify(visual.figure?.spec || {});
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0;
  return ` #v${(h >>> 0).toString(36)}`;
}

const figureAwaitingImage = (q) => q?.visual?.kind === "figure" && !q?.visual?.figure?.imageId;

/**
 * How many questions in these tests are still waiting for their picture.
 * A test that holds any of them cannot be published.
 */
async function imagesPendingIn(questionIds) {
  const Question = require("../models/Question");
  if (!questionIds?.length) return 0;
  return Question.countDocuments({
    _id: { $in: questionIds },
    "visual.kind": "figure",
    $or: [{ "visual.figure.imageId": { $exists: false } }, { "visual.figure.imageId": null }],
  });
}

/** Whether these questions include anything an app older than 1.2.0 cannot show. */
async function hasVisuals(questionIds) {
  const Question = require("../models/Question");
  if (!questionIds?.length) return false;
  return !!(await Question.exists({ _id: { $in: questionIds }, "visual.kind": { $in: ["chart", "figure"] } }));
}

// A plain-language reason for the admin when publishing is refused.
const pendingImagesMessage = (n) =>
  `${n} figure question${n === 1 ? " is" : "s are"} still waiting for ${n === 1 ? "its" : "their"} picture. Upload ${n === 1 ? "it" : "them"} on the Images pending page, then publish.`;

module.exports = {
  CHART_TYPES,
  SHAPES,
  LAYOUTS,
  normaliseChart,
  chartAsText,
  evaluateFormula,
  optionNumber,
  checkChartAnswer,
  normaliseFigure,
  checkFigureAnswer,
  figurePrompt,
  figureAsText,
  figureSvg,
  visualAsText,
  visualSignature,
  figureAwaitingImage,
  imagesPendingIn,
  hasVisuals,
  pendingImagesMessage,
  samePanel,
  rotatePanel,
  mirrorPanel,
  waterPanel,
};
