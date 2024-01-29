// controllers/interactionController.js
// const like = require("../models/like"); // Import your like model
// const Post = require("../models/post");
const authenticateUser = require("../middleware/authenticateUser");
const { User, Post, like, follow } = require("../models");

const likePost = async (req, res) => {
  try {
    await like.create({
      user_id: req.current_user.id,
      post_id: req.body.post_id,
      liked_at: new Date(),
    });
    res.status(201).send({ message: "Post Liked" });
  } catch (error) {
    console.error("Error in Liking the post:", error);
    res.status(500).send({ error: "Failed to like post" });
  }
};

const retweetPost = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await Post.create({
      repost_id: curr_post_id,
      posted_at: new Date(),
      user_id: req.current_user.id,
    });
    res.status(201).send({ message: "RePost Created" });
  } catch (error) {
    console.error("Error creating repost:", error);
    res.status(500).send({ error: "Failed to create repost" });
  }
};

const unretweetPost = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await Post.destroy({
      where: { user_id: req.current_user.id, repost_id: curr_post_id },
    });
    res.status(204).send({ message: "Post successfully unreposted" });
  } catch (error) {
    console.error("Error in Unreposting the post:", error);
    res.status(500).send({ error: "Failed to unrepost post" });
  }
};

const unlikePost = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await like.destroy({
      where: { user_id: req.current_user.id, post_id: curr_post_id },
    });
    res.status(204).send({ message: "Post Unliked" });
  } catch (error) {
    console.error("Error in Unliking the post:", error);
    res.status(500).send({ error: "Failed to unlike post" });
  }
};

const getLikeCount = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const LikeCount = await like.count({
      where: {
        post_id: curr_post_id,
      },
    });
    const LikeEntry = await like.findOne({
      where: {
        post_id: curr_post_id,
        user_id: req.current_user.id,
      },
    });
    res.status(200).json({ count: LikeCount, likedPost: !!LikeEntry });
  } catch (error) {
    console.error("Error at Fetching Like Count", error);
    res.status(500).send({ error: "Failed to fetch liked post" });
  }
};

const getRetweetCount = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const RepostCount = await Post.count({
      where: {
        repost_id: curr_post_id,
      },
    });
    const RepostEntry = await Post.findOne({
      where: {
        user_id: req.current_user.id,
        repost_id: curr_post_id,
      },
    });
    res.status(200).json({ repostCount: RepostCount, isRePost: !!RepostEntry });
  } catch (error) {
    console.error("Error at Fetching repost Count", error);
    res.status(500).send({ error: "Failed to fetch repost" });
  }
};

module.exports = {
  likePost,
  retweetPost,
  unretweetPost,
  unlikePost,
  getLikeCount,
  getRetweetCount,
};
