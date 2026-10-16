const express = require("express");
const router = express.Router();
const { addReference, listReferences, updateReference, retryReference, deleteReference } = require("../controllers/referenceController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Admin: reference papers the AI learns the level and style from.
router.get("/", protect, adminOnly, asyncRoute(listReferences));
router.post("/", protect, adminOnly, asyncRoute(addReference));
router.patch("/:id", protect, adminOnly, asyncRoute(updateReference));
router.post("/:id/retry", protect, adminOnly, asyncRoute(retryReference));
router.delete("/:id", protect, adminOnly, asyncRoute(deleteReference));

module.exports = router;
