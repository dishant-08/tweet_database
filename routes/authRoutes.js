// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  guestLogin,
  logout,
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);
router.post("/guest-login", guestLogin);
router.post("/logout", logout);

module.exports = router;
