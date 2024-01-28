// middleware/authenticateUser.js
const User = require("../models");

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

module.exports = authenticateUser;
