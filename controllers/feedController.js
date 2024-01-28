const { User, Post, like, follow } = require("../models");
// const NodeCache = require("node-cache");
// const myCache = new NodeCache({ stdTTL: 300 });

const { myCache } = require("./authController");

const getFeed = async (req, res) => {
  const allPosts = `getAllPost_${req.current_user.id}`;

  const cachePost = myCache.get(allPosts);
  if (cachePost) {
    return res.status(200).json(cachePost);
  }

  try {
    const posts = await Post.findAll({
      where: {
        reply_id: null,
        repost_id: null,
      },
    });

    myCache.set(allPosts, {
      posts: posts,
      email: req.current_user.email,
    });

    res.status(200).json({ posts: posts, email: req.current_user.email });
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
};

const getReplyFeed = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const posts = await Post.findAll({
      where: {
        reply_id: curr_post_id,
      },
    });
    const count = await Post.count({
      where: {
        reply_id: curr_post_id,
      },
    });
    res.status(200).json({ posts: posts, count: count });
  } catch (error) {
    console.error("Error fetching reply feed:", error);
    res.status(500).json({ error: "Failed to fetch reply feed" });
  }
};

const getUserFeed = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const posts = await Post.findAll({
      where: {
        user_id: curr_post_id,
        reply_id: null,
        repost_id: null,
      },
    });

    res.status(200).json({ posts: posts });
  } catch (error) {
    console.error("Error fetching user feed:", error);
    res.status(500).json({ error: "Failed to fetch user feed" });
  }
};

const createPost = async (req, res) => {
  try {
    await Post.create({
      content: req.body.koko,
      posted_at: new Date(),
      user_id: req.current_user.id,
    });
    const allPosts = `getAllPost_${req.current_user.id}`;
    myCache.del(allPosts);
    res.status(201).send({ message: "Post Created" });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

const createReply = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await Post.create({
      reply_id: curr_post_id,
      content: req.body.koko,
      posted_at: new Date(),
      user_id: req.current_user.id,
    });
    res.status(201).send({ message: "reply Created" });
  } catch (error) {
    console.error("Error creating reply:", error);
    res.status(500).json({ error: "Failed to create reply" });
  }
};

module.exports = {
  getFeed,
  getReplyFeed,
  getUserFeed,
  createPost,
  createReply,
};
