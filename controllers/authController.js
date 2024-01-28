const bcrypt = require("bcrypt");
// const User = require("../models/user");
const { User, Post, like, follow } = require("../models");
const NodeCache = require("node-cache");
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

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const abhiWlaUser = await User.findOne({ where: { email } });
    if (!abhiWlaUser) {
      return res.status(400).send("Invalid email");
    }

    const validPassword = await bcrypt.compare(
      password,
      abhiWlaUser.password_hash
    );

    if (!validPassword) {
      return res.status(404).send("Invalid Password");
    }

    const cacheKey = `userDetails_${abhiWlaUser.id}`;
    myCache.del(cacheKey);

    res.cookie("cur_user", abhiWlaUser.id, {
      httpOnly: true,
      maxAge: 3600000,
      secure: true, // Required for "None" sameSite in most browsers
      sameSite: "None",
    });

    res.status(200).send("Logged in Successfully");
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Server Error");
  }
};

const guestLogin = async (req, res) => {
  const email = "randomEmail@example.com";
  const password = "randomPassword";
  try {
    const abhiWlaUser = await User.findOne({ where: { email } });
    if (!abhiWlaUser) {
      return res.status(400).send("Invalid email");
    }

    const validPassword = await bcrypt.compare(
      password,
      abhiWlaUser.password_hash
    );

    if (!validPassword) {
      return res.status(404).send("Invalid Password");
    }

    const cacheKey = `userDetails_${abhiWlaUser.id}`;
    myCache.del(cacheKey);

    res.cookie("cur_user", abhiWlaUser.id, {
      httpOnly: true,
      maxAge: 3600000,
      secure: true, // Required for "None" sameSite in most browsers
      sameSite: "None",
    });

    res.status(200).send("Logged in Successfully");
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Server Error");
  }
};

const authenticateUser = async (req, res, next) => {
  const validUser = req.cookies.cur_user;

  if (!validUser) {
    return res.status(401).send("Unauthorized");
  }

  try {
    req.current_user = await User.findOne({ where: { id: validUser } });
    console.log(req.current_user);
    next();
  } catch (error) {
    res.status(401).send("Invalid Token");
  }
};

module.exports = { signup, login, guestLogin, myCache, authenticateUser };
