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

const getLikeAndRetweetInfo = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const likeCount = await like.count({
      where: { post_id: curr_post_id },
    });

    const likeEntry = await like.findOne({
      where: { post_id: curr_post_id, user_id: req.current_user.id },
    });

    const repostCount = await Post.count({
      where: { repost_id: curr_post_id },
    });

    const repostEntry = await Post.findOne({
      where: { user_id: req.current_user.id, repost_id: curr_post_id },
    });

    res.status(200).json({
      likeCount,
      likedPost: !!likeEntry,
      repostCount,
      isRePost: !!repostEntry,
    });
  } catch (error) {
    console.error("Error fetching like and repost info:", error);
    res.status(500).send({ error: "Failed to fetch like and repost info" });
  }
};

module.exports = {
  likePost,
  retweetPost,
  unretweetPost,
  unlikePost,
  getLikeAndRetweetInfo,
};
