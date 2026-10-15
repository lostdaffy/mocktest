const express = require("express");
const router = express.Router();
const { listFigures, getFigure, uploadFigure, removeFigure, serveImage, rekeyFigures, autoAttach } = require("../controllers/questionImageController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Admin: the Images pending page.
router.get("/figures", protect, adminOnly, asyncRoute(listFigures));
router.get("/question/:questionId", protect, adminOnly, asyncRoute(getFigure));
router.post("/question/:questionId", protect, adminOnly, asyncRoute(uploadFigure));
router.delete("/question/:questionId", protect, adminOnly, asyncRoute(removeFigure));
router.post("/rekey", protect, adminOnly, asyncRoute(rekeyFigures)); // figure keys by figure; lists repeats in tests
router.post("/auto-attach", protect, adminOnly, asyncRoute(autoAttach)); // reference drawings onto checked figures

// Public: the picture itself, for the app (see serveImage).
router.get("/:id", asyncRoute(serveImage));

module.exports = router;
