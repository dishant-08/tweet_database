const bcrypt = require("bcrypt");
const { User } = require("../models");
const NodeCache = require("node-cache");
const {
  issueAuthCookie,
  clearAuthCookie,
} = require("../middleware/authenticateUser");
const myCache = new NodeCache({ stdTTL: 300 });

const signup = async (req, res) => {
  try {
    // Your signup logic
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // The second argument is the saltRounds

    await User.create({
      username: req.body.username,
      email: req.body.email,
      display_name: req.body.display_name || req.body.name, // Use req.body.display_name if available, otherwise fallback to req.body.name
      date_of_birth: req.body.date_of_birth,
      password_hash: hashedPassword,
    });
    res.status(201).send({ message: "User Created" });
  } catch (error) {
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
