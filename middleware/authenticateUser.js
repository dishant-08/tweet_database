// middleware/authenticateUser.js
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const COOKIE_NAME = "cur_user";
const TOKEN_TTL_SECONDS = 60 * 60; // matches the cookie maxAge

const issueAuthCookie = (res, user) => {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    secure: true,
    sameSite: "None",
  });
};

const clearAuthCookie = (res) => {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    secure: true,
    sameSite: "None",
  });
};

const authenticateUser = async (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).send("Invalid Token");
  }

  try {
    const user = await User.findByPk(payload.sub, {
      attributes: { exclude: ["password_hash"] },
    });
    if (!user) {
      return res.status(401).send("Invalid Token");
    }
    req.current_user = user;
    next();
  } catch (error) {
    console.error("Error loading authenticated user:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = authenticateUser;
module.exports.issueAuthCookie = issueAuthCookie;
module.exports.clearAuthCookie = clearAuthCookie;
