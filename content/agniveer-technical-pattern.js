// Agniveer Army Technical exam pattern (Common Entrance Exam).
//
// Paper: 50 questions, 200 marks, +4 right, -1 wrong, 60 minutes.
// Pattern and syllabus: the official "Syllabus for Agniveer Technical" (Indian
// Army, PDF the user supplied 2026-10-29): General Knowledge & Reasoning 10,
// Maths 15, Physics 15, Chemistry 10, in that order. A real past paper the
// user supplied shows GK & Reasoning as 5 + 5 and every question bilingual.
// The official PDF also lists Biology topics, but its pattern table has no
// Biology section, so none is set.
//
// Physics and Chemistry are sections of their own, as on the real paper, and
// subjects of their own - not the GD-level chapters of "Science": Agniveer
// Technical content is a different book. Their Subject documents are added together
// with that content.
//
//   node content/agniveer-technical-pattern.js           dry run, writes nothing
//   node content/agniveer-technical-pattern.js --apply   writes it; an existing pattern keeps its
//                                                        visibility, a new one is created hidden
//   add --show or --hide to set visibility explicitly

const path = require("path");
const SV = path.join(__dirname, "..", "server");
require(path.join(SV, "node_modules", "dotenv")).config({ path: path.join(SV, ".env") });
const mongoose = require(path.join(SV, "node_modules", "mongoose"));
const ExamPattern = require(path.join(SV, "models", "ExamPattern"));

const t = (topic, ...subTopics) => ({ topic, subTopics });
const mix = (easy, medium, hard) => ({ easy, medium, hard });

const PATTERN = {
  examType: "AGNIVEER_TECHNICAL",
  displayName: "Agniveer Army Technical",
  examGroup: "Agniveer",
  postName: "Agniveer Technical",
  durationMinutes: 60,
  marksPerQuestion: 4,
  negativeMarking: 1,
  examLevel:
    "Indian Army Agniveer Technical CEE, for 10+2 PCM candidates; official syllabus (joinindianarmy). Questions stay " +
    "within the CBSE syllabus. Physics and Chemistry are basic Class 9-11 concepts, laws, units, everyday applications " +
    "and short numericals. Maths mixes fundamental arithmetic word problems with Class 11-12 algebra, matrices and " +
    "determinants, coordinate geometry, trigonometry, differential and integral calculus, probability and statistics. " +
    "The first section is General Knowledge & Reasoning: about half static GK on India and its neighbours, half short " +
    "SSC-style reasoning (odd pair, letter series, blood relation, sign interchange, ranking). No Biology section. " +
    "4 marks per question, 1 mark deducted for a wrong answer.",
  sections: [
    {
      // "General Knowledge & Reasoning" on the official table.
      subject: "GK", questionCount: 10, sources: ["Current Affairs", "Reasoning"], difficultyMix: mix(40, 45, 15),
      syllabus: [
        t("Ancient India", "history of India and its neighbours", "culture"),
        t("Medieval India", "rulers, battles and monuments"),
        t("Modern India", "who's who of modern India"),
        t("Freedom Movement", "prominent personalities"),
        t("Constitution", "the Constitution of India"),
        t("Parliament & Judiciary", "President, Parliament and courts"),
        t("Physical Geography", "continents and sub-continents", "oceans and the solar system"),
        t("Indian Geography", "geography of India and its neighbours", "states and capitals"),
        t("Indian Economy", "economic terminology"),
        t("Books, Awards & Sports", "abbreviations", "sports and terminology", "awards and prizes", "books and authors", "inventions and discoveries", "international organisations", "Indian Armed Forces"),
        t("National Affairs", "important recent events in India"),
        t("International Affairs", "current important world events"),
        t("Sports News", "recent sports events"),
        t("Awards & Honours", "recent awards"),
        // Reasoning - about half of this section on the real paper.
        t("Classification", "odd number pair", "odd word or letter group"),
        t("Number & Letter Series", "letter-cluster series", "number series"),
        t("Blood Relation", "pointing to a photograph"),
        t("Coding-Decoding", "interchanging signs to balance an equation", "letter coding"),
        t("Seating Arrangement", "ranking by height or marks", "linear order"),
        t("Analogy", "number and word analogy"),
        t("Direction Sense", "distance and direction"),
      ],
    },
    {
      // Official list: Algebra, Matrices & Determinants, Analytical Geometry,
      // Trigonometry, Integral and Differential Calculus, Probability and
      // Statistics, Number Systems, Fundamental arithmetical operations,
      // Mensuration, Area, Volume and Surface Area.
      subject: "Maths", questionCount: 15, sources: [], difficultyMix: mix(30, 50, 20),
      syllabus: [
        t("Algebra", "identities and factorisation", "linear and quadratic equations", "functions and composition", "sequences and progressions", "nCr and nPr"),
        t("Matrices & Determinants", "matrix operations", "value of a determinant", "inverse and adjoint"),
        t("Geometry", "coordinate geometry: distance, section formula, slope", "straight lines and circles", "triangles and circles"),
        t("Trigonometry", "ratios and standard values", "identities", "heights and distances"),
        t("Calculus", "limits", "derivatives of polynomials, products and quotients", "maxima and minima", "standard integrals", "definite integrals"),
        t("Probability & Statistics", "probability of events and complements", "coins, dice and cards", "mean, median and mode", "variance and standard deviation"),
        t("Number System", "types of numbers", "divisibility and remainders", "unit digit"),
        t("Simplification", "BODMAS", "fractions and decimals", "surds and indices"),
        t("HCF & LCM", "HCF and LCM"),
        t("Percentage", "percentage, commission and wages"),
        t("Profit & Loss", "marked price and discount"),
        t("Ratio & Proportion", "mixtures and alloys in a ratio", "dividing into parts"),
        t("Average", "average and innings problems"),
        t("Time & Work", "men and days"),
        t("Time, Speed & Distance", "speed, time and distance"),
        t("Simple & Compound Interest", "simple and compound interest"),
        t("Mensuration 2D & 3D", "perimeter and area", "volume and surface area", "wire bent into another shape"),
      ],
    },
    {
      // Official list. Topic names are the chapters the Physics subject will carry.
      subject: "Physics", questionCount: 15, sources: [], difficultyMix: mix(30, 50, 20),
      syllabus: [
        t("Units & Measurement", "SI units", "dimensional formulae"),
        t("Matter & Its Properties", "physical properties and states of matter", "mass, weight, volume", "density and specific gravity", "viscosity and surface tension"),
        t("Pressure & Archimedes Principle", "pressure and barometer", "Archimedes principle and floatation", "boiling point and pressure"),
        t("Motion", "motion of objects", "velocity and acceleration", "equations of motion", "projectile range"),
        t("Force & Laws of Motion", "Newton's laws of motion", "force and momentum", "parallelogram of forces", "stability and equilibrium of bodies"),
        t("Gravitation", "law of gravitation", "acceleration due to gravity", "weight on other planets"),
        t("Work, Power & Energy", "work", "power", "kinetic and potential energy", "conservation of energy"),
        t("Heat", "heat and its effects", "temperature scales", "expansion and specific heat", "transfer of heat"),
        t("Sound", "sound waves and their properties", "speed of sound in media", "echo and frequency"),
        t("Light", "reflection and refraction", "spherical mirrors", "lenses", "refractive index"),
        t("Magnetism", "types and properties of magnets", "magnetic effect of current", "electromagnetic induction"),
        t("Electricity", "static electricity", "current electricity", "conductors and non-conductors", "Ohm's law", "simple electrical circuits and resistances", "heating effect of current"),
        t("Modern Physics & Electronics", "semiconductors", "atom and nucleus"),
      ],
    },
    {
      // Official list. Topic names are the chapters the Chemistry subject will carry.
      subject: "Chemistry", questionCount: 10, sources: [], difficultyMix: mix(30, 50, 20),
      syllabus: [
        t("Matter & Its Changes", "physical and chemical changes", "elements, mixtures and compounds"),
        t("Symbols, Formulae & Equations", "symbols and formulae", "simple chemical equations", "law of chemical combination"),
        t("Atomic Structure", "elementary structure of the atom", "isotopes and isobars", "atomic, equivalent and molecular weights", "valency"),
        t("Periodic Table", "Mendeleev and modern periodic law", "periodic trends"),
        t("Air & Water", "properties of air and water", "composition of air", "hard and soft water"),
        t("Hydrogen, Oxygen, Nitrogen & CO2", "preparation and properties of hydrogen", "oxygen", "nitrogen", "carbon dioxide"),
        t("Oxidation & Reduction", "oxidation and reduction", "oxidation state"),
        t("Acids, Bases & Salts", "acids, bases and salts", "pH", "common salts and their uses"),
        t("Carbon & Its Forms", "allotropes of carbon", "carbon compounds", "hydrogenation and everyday chemistry"),
        t("Fertilizers", "natural and artificial fertilizers"),
        t("Chemical Reactions", "types of reactions", "exothermic and endothermic reactions"),
        t("Metals & Non-metals", "properties of metals and non-metals", "metalloids"),
      ],
    },
  ],
};

// Agniveer GD's level note said "NO negative marking", but the real paper
// (and its own pattern) takes 0.5 off a wrong answer.
const GD_LEVEL_OLD = "NO negative marking.";
const GD_LEVEL_NEW = "0.5 mark deducted for a wrong answer.";

(async () => {
  const apply = process.argv.includes("--apply");
  const show = process.argv.includes("--show");
  const hide = process.argv.includes("--hide");
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const old = await ExamPattern.findOne({ examType: PATTERN.examType }).lean();
  const total = PATTERN.sections.reduce((a, s) => a + s.questionCount, 0);
  console.log(old ? `EXISTS (${old.isActive === false ? "hidden" : "visible"}) - will be replaced: ${old.sections.map((x) => x.subject + " " + x.questionCount).join(", ")}` : "NEW pattern");
  console.log(`${PATTERN.displayName}: ${total} questions, ${total * PATTERN.marksPerQuestion} marks, ${PATTERN.durationMinutes} min, -${PATTERN.negativeMarking} per wrong`);
  const gd = await ExamPattern.findOne({ examType: "AGNIVEER_GD" }).lean();
  const gdFix = !!(gd && gd.examLevel && gd.examLevel.includes(GD_LEVEL_OLD));
  console.log(gdFix ? `GD note: "${GD_LEVEL_OLD}" -> "${GD_LEVEL_NEW}"` : "GD note: nothing to fix");
  for (const s of PATTERN.sections) console.log(`  ${s.subject} ${s.questionCount}: ${s.syllabus.map((x) => x.topic).join(", ")}`);
  if (total !== 50) throw new Error("paper must be 50 questions");
  if (!apply) { console.log("\nDry run - nothing written. Add --apply to write it."); process.exit(0); }
  await ExamPattern.findOneAndUpdate(
    { examType: PATTERN.examType },
    { ...PATTERN, isActive: show ? true : hide ? false : old ? old.isActive !== false : false },
    { upsert: true, new: true, runValidators: true },
  );
  if (gdFix) await ExamPattern.updateOne({ examType: "AGNIVEER_GD" }, { examLevel: gd.examLevel.replace(GD_LEVEL_OLD, GD_LEVEL_NEW) });
  const now = await ExamPattern.findOne({ examType: PATTERN.examType }).lean();
  console.log(`Saved, ${now.isActive ? "VISIBLE in the app" : "hidden (isActive false)"}.`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
