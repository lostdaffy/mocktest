// The admin's messages to students (broadcasts) and the payments view.
// One admin runs the panel, so every route here is simply admin-only.
const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");
const Broadcast = require("../models/Broadcast");
const { preview, startBroadcast } = require("../services/broadcast");
const { listPayments, paymentSummary, exportPayments } = require("../controllers/adminPaymentController");

// Only these paths: the router is mounted at /api/admin beside other admin routers.
router.use(["/broadcasts", "/payments"], protect, adminOnly);

// ---- broadcasts
// POST /api/admin/broadcasts/preview { audience } -> how many it reaches, and the exams to pick from
router.post("/broadcasts/preview", asyncRoute(async (req, res) => res.json(await preview(req.body.audience))));

// GET /api/admin/broadcasts -> the last 50 sent, newest first
router.get(
  "/broadcasts",
  asyncRoute(async (req, res) => res.json({ items: await Broadcast.find({}).sort({ createdAt: -1 }).limit(50).lean() }))
);

// POST /api/admin/broadcasts { title, body, audience: { kind, exam }, screen }
router.post(
  "/broadcasts",
  asyncRoute(async (req, res) => {
    try {
      const doc = await startBroadcast(req.body);
      res.status(201).json({ message: `Sending to ${doc.students} student(s)`, broadcast: doc });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ message: err.message });
      throw err;
    }
  })
);

// ---- payments
router.get("/payments/summary", asyncRoute(paymentSummary));
router.get("/payments/export", asyncRoute(exportPayments));
router.get("/payments", asyncRoute(listPayments));

module.exports = router;
