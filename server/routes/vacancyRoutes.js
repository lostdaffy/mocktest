const express = require("express");
const router = express.Router();
const {
  listVacancies,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  queueVacancyMock,
  adoptMocks,
  renumberMocks,
  vacancyMocks,
  seriesForStudent,
} = require("../controllers/vacancyController");
const { protect, adminOnly } = require("../middleware/auth");
const asyncRoute = require("../utils/asyncRoute");

// Student: the Upcoming / Previous exam mock series.
router.get("/series", protect, asyncRoute(seriesForStudent));

// Admin.
router.get("/", protect, adminOnly, asyncRoute(listVacancies));
router.post("/", protect, adminOnly, asyncRoute(createVacancy));
router.patch("/:id", protect, adminOnly, asyncRoute(updateVacancy));
router.delete("/:id", protect, adminOnly, asyncRoute(deleteVacancy));
router.post("/:id/build-mock", protect, adminOnly, asyncRoute(queueVacancyMock));
router.post("/:id/adopt-mocks", protect, adminOnly, asyncRoute(adoptMocks));
router.post("/:id/renumber", protect, adminOnly, asyncRoute(renumberMocks));
router.get("/:id/mocks", protect, adminOnly, asyncRoute(vacancyMocks));

module.exports = router;
