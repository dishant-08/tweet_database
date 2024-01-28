// controllers/followController.js
// const follow = require("./models"); // Import your follow model
const { User, Post, like, follow } = require("../models");
const authenticateUser = require("../middleware/authenticateUser");
const sequelize = require("sequelize");

const followUser = async (req, res) => {
  try {
    await follow.create({
      follower_user_id: req.current_user.id,
      following_user_id: req.body.following_id,
    });
    res.status(201).send({ message: "You Successfully followed" });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).send({ error: "Failed to follow" });
  }
};

const unfollowUser = async (req, res) => {
  try {
    await follow.destroy({
      where: {
        follower_user_id: req.current_user.id,
        following_user_id: req.body.following_id,
      },
    });
    res.status(204).send({ message: "You Successfully Unfollowed" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).send({ error: "Failed to follow" });
  }
};

const checkFollowStatus = async (req, res) => {
  try {
    const followEntry = await follow.findOne({
      where: {
        follower_user_id: req.current_user.id,
        following_user_id: req.query.following_id,
      },
    });
    res.status(200).json({ status: !!followEntry });
  } catch (error) {
    console.error("Error getting Status", error);
    res.status(500).send({ error: "Failed to get status" });
  }
};
follow.belongsTo(User, {
  foreignKey: "following_user_id",
  as: "followingUser",
});
const followingFeed = async (req, res) => {
  try {
    // Retrieve followers along with associated users
    const followers = await follow.findAll({
      where: {
        follower_user_id: req.current_user.id,
      },
      include: [
        {
          model: User,
          as: "followingUser",
          attributes: ["id"], // Include only necessary attributes
        },
      ],
    });

    // Extract the following_user_id from each follower instance
    const followingUserIds = followers.map(
      (follower) => follower.followingUser.id
    );

    // Retrieve posts related to the followers, ordered by posted_at in descending order
    const posts = await Post.findAll({
      where: {
        user_id: { [sequelize.Op.in]: followingUserIds },
        reply_id: null,
        repost_id: null,
      },
      order: [["posted_at", "DESC"]], // Add this line for ordering
    });

    res.status(200).json({
      user: followingUserIds,
      posts,
    });
  } catch (error) {
    console.error("Error at Fetching user and posts", error);
    res.status(500).send({ error: "Failed to fetch user and posts" });
  }
};

module.exports = { followUser, unfollowUser, checkFollowStatus, followingFeed };
