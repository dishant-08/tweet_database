// controllers/followController.js
const { follow } = require("../models");
const { Op } = require("sequelize");
const { enrichPostsWithData, fetchPostPage } = require("./feedController");

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
const followingFeed = async (req, res) => {
  try {
    const followRows = await follow.findAll({
      where: { follower_user_id: req.current_user.id },
      attributes: ["following_user_id"],
      raw: true,
    });
    const followingUserIds = followRows.map((row) => row.following_user_id);

    const { posts, pagination } = await fetchPostPage(
      {
        user_id: { [Op.in]: followingUserIds },
        reply_id: null,
        repost_id: null,
      },
      req.query
    );

    const enrichedPosts = await enrichPostsWithData(posts, req.current_user.id);

    res.status(200).json({
      user: followingUserIds,
      posts: enrichedPosts,
      pagination,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error at Fetching user and posts", error);
    res.status(500).send({ error: "Failed to fetch user and posts" });
  }
};

module.exports = { followUser, unfollowUser, checkFollowStatus, followingFeed };
