const path = require("path");
const Question = require("../models/Question");
const QuestionImage = require("../models/QuestionImage");
const { normaliseFigure, figureSvg } = require("./visuals");

// The picture for a figure question, drawn from its spec.
//
// Every figure question waited for somebody to upload a picture - 77 were
// uploaded by hand, most of them as the reference drawing itself ("Use the
// reference drawing as the picture"). Where the code has already proved the
// marked answer follows from the figure (answerCheck "checked"), the drawing
// is exactly the question, so it goes on as soon as the question is made.
// A figure whose answer only a person can judge ("by_eye": odd one out)
// still waits on the Images page - one of those turned out to have two
// defensible answers.

// Bundled, not a system font: the server has none to rely on. DejaVu Sans,
// free licence alongside it in assets/fonts.
const FONT = path.join(__dirname, "..", "assets", "fonts", "DejaVuSans.ttf");

function figurePng(spec) {
  // Loaded on first use, so nothing that never draws a figure pays for it.
  const { Resvg } = require("@resvg/resvg-js");
  const svg = figureSvg(normaliseFigure(spec));
  const out = new Resvg(svg, {
    fitTo: { mode: "zoom", value: 2 },
    background: "#ffffff",
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: "DejaVu Sans" },
  }).render();
  return { data: out.asPng(), width: out.width, height: out.height };
}

// Puts the drawing on each given question that is a checked figure without a
// picture. Never throws: a drawing that fails leaves the question on the
// Images page, as before. Returns how many were attached.
async function attachDrawings(questionIds) {
  const qs = await Question.find({
    _id: { $in: questionIds },
    "visual.kind": "figure",
    "visual.figure.answerCheck": "checked",
    $or: [{ "visual.figure.imageId": { $exists: false } }, { "visual.figure.imageId": null }],
  })
    .select("visual")
    .lean();
  let attached = 0;
  for (const q of qs) {
    try {
      const png = figurePng(q.visual.figure.spec);
      const image = await QuestionImage.create({
        question: q._id,
        mime: "image/png",
        data: png.data,
        bytes: png.data.length,
        width: png.width,
        height: png.height,
        uploadedBy: "reference drawing (automatic)",
      });
      await Question.updateOne(
        { _id: q._id },
        { $set: { "visual.figure.imageId": image._id, "visual.figure.uploadedAt": new Date(), "visual.figure.uploadedBy": "reference drawing (automatic)" } }
      );
      attached++;
    } catch (err) {
      console.log(`Figure drawing for ${q._id} failed, left for the Images page: ${err.message}`);
    }
  }
  return attached;
}

module.exports = { figurePng, attachDrawings };
