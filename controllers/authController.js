const bcrypt = require("bcrypt");
const { User } = require("../models");
const NodeCache = require("node-cache");
const {
  issueAuthCookie,
  clearAuthCookie,
} = require("../middleware/authenticateUser");
const myCache = new NodeCache({ stdTTL: 300 });

const USERNAME_RE = /^[a-zA-Z0-9_]{3,15}$/;

const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!USERNAME_RE.test(username || "")) {
      return res.status(400).send({
        error: "Username must be 3-15 characters: letters, numbers, underscore",
      });
    }
    if (!email || !password || password.length < 8) {
      return res
        .status(400)
        .send({ error: "Email and a password of at least 8 characters are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // The second argument is the saltRounds

    await User.create({
      username,
      email,
      display_name: req.body.display_name || req.body.name, // Use req.body.display_name if available, otherwise fallback to req.body.name
      date_of_birth: req.body.date_of_birth,
      password_hash: hashedPassword,
    });
    res.status(201).send({ message: "User Created" });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const source = `${error.errors?.[0]?.path || ""} ${error.parent?.constraint || ""}`;
      const message = source.includes("email")
        ? "Email already registered"
        : "Username already taken";
      return res.status(409).send({ error: message });
    }
    console.error("Error creating user:", error);
    res.status(500).send({ error: "Failed to create user" });
  }
};

const authenticateWithPassword = async (res, email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    res.status(400).send("Invalid email");
    return;
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    res.status(404).send("Invalid Password");
    return;
  }

  myCache.del(`userDetails_${user.id}`);
  issueAuthCookie(res, user);
  res.status(200).send("Logged in Successfully");
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    await authenticateWithPassword(res, email, password);
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Server Error");
  }
};

const guestLogin = async (req, res) => {
  try {
    await authenticateWithPassword(
      res,
      "randomEmail@example.com",
      "randomPassword"
    );
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Server Error");
  }
};

const logout = async (req, res) => {
  try {
    clearAuthCookie(res);
    res.status(200).send("Logged out successfully");
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  signup,
  login,
  logout,
  guestLogin,
  myCache,
};
