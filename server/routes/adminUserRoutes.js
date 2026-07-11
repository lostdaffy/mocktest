const express = require("express");
const router = express.Router();
const { searchUsers, adminResetPassword } = require("../controllers/adminUserController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", protect, adminOnly, searchUsers);
router.patch("/:id/reset-password", protect, adminOnly, adminResetPassword);

module.exports = router;