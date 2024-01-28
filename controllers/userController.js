// controllers/userController.js
// const User = require("../models/user");
// const follow = require("../models/follow"); // Assuming you have a follow model
const authenticateUser = require("../middleware/authenticateUser");
const { User, Post, like, follow } = require("../models");
const getEditCurrentUser = async (req, res) => {
  try {
    res.status(200).json({
      user: req.current_user,
    });
  } catch (error) {
    console.error("Error at fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
};

const getUserByUsername = async (req, res) => {
  const curr_user_username = req.params.username;
  try {
    const userDetails = await User.findOne({
      where: {
        username: curr_user_username,
      },
    });
    const following = await follow.count({
      where: {
        follower_user_id: userDetails.id,
      },
    });
    const follower = await follow.count({
      where: {
        following_user_id: userDetails.id,
      },
    });
    res.status(200).json({
      user: userDetails,
      follower,
      following,
    });
  } catch (error) {
    console.error("Error at fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
};

const getUserById = async (req, res) => {
  const curr_user_id = req.params.id;
  try {
    const userDetails = await User.findOne({
      where: {
        id: curr_user_id,
      },
    });
    res.status(200).json({
      currUser: userDetails.username,
      disName: userDetails.display_name,
      dp: userDetails.profile_picture,
    });
  } catch (error) {
    console.error("Error at fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
};

module.exports = {
  getEditCurrentUser,
  getUserByUsername,
  getUserById,
};
