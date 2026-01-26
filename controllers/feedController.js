const { User, Post, like, follow } = require("../models");
const { Op } = require("sequelize");
// const NodeCache = require("node-cache");
// const myCache = new NodeCache({ stdTTL: 300 });

const { myCache } = require("./authController");

// Helper function to enrich posts with user, like, repost, and reply data
const enrichPostsWithData = async (posts, currentUserId) => {
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const userIds = [...new Set(posts.map((p) => p.user_id))];

  // Fetch all users for these posts in one query
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ["id", "username", "display_name", "profile_picture"],
  });
  const userMap = {};
  users.forEach((u) => {
    userMap[u.id] = {
      username: u.username,
      display_name: u.display_name,
      profile_picture: u.profile_picture,
    };
  });

  // Fetch like counts for all posts in one query
  const likeCounts = await like.findAll({
    where: { post_id: { [Op.in]: postIds } },
    attributes: [
      "post_id",
      [require("sequelize").fn("COUNT", require("sequelize").col("post_id")), "count"],
    ],
    group: ["post_id"],
    raw: true,
  });
  const likeCountMap = {};
  likeCounts.forEach((lc) => {
    likeCountMap[lc.post_id] = parseInt(lc.count, 10);
  });

  // Fetch current user's likes in one query
  const userLikes = await like.findAll({
    where: { post_id: { [Op.in]: postIds }, user_id: currentUserId },
    attributes: ["post_id"],
    raw: true,
  });
  const userLikedSet = new Set(userLikes.map((ul) => ul.post_id));

  // Fetch repost counts for all posts in one query
  const repostCounts = await Post.findAll({
    where: { repost_id: { [Op.in]: postIds } },
    attributes: [
      "repost_id",
      [require("sequelize").fn("COUNT", require("sequelize").col("repost_id")), "count"],
    ],
    group: ["repost_id"],
    raw: true,
  });
  const repostCountMap = {};
  repostCounts.forEach((rc) => {
    repostCountMap[rc.repost_id] = parseInt(rc.count, 10);
  });

  // Fetch current user's reposts in one query
  const userReposts = await Post.findAll({
    where: { repost_id: { [Op.in]: postIds }, user_id: currentUserId },
    attributes: ["repost_id"],
    raw: true,
  });
  const userRepostedSet = new Set(userReposts.map((ur) => ur.repost_id));

  // Fetch reply counts for all posts in one query
  const replyCounts = await Post.findAll({
    where: { reply_id: { [Op.in]: postIds } },
    attributes: [
      "reply_id",
      [require("sequelize").fn("COUNT", require("sequelize").col("reply_id")), "count"],
    ],
    group: ["reply_id"],
    raw: true,
  });
  const replyCountMap = {};
  replyCounts.forEach((rc) => {
    replyCountMap[rc.reply_id] = parseInt(rc.count, 10);
  });

  // Enrich posts with all the data
  return posts.map((post) => {
    const postData = post.toJSON ? post.toJSON() : post;
    const user = userMap[postData.user_id] || {};
    return {
      ...postData,
      user: {
        username: user.username,
        display_name: user.display_name,
        profile_picture: user.profile_picture,
      },
      likeCount: likeCountMap[postData.id] || 0,
      isLiked: userLikedSet.has(postData.id),
      repostCount: repostCountMap[postData.id] || 0,
      isReposted: userRepostedSet.has(postData.id),
      replyCount: replyCountMap[postData.id] || 0,
    };
  });
};

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
      order: [["posted_at", "DESC"]],
    });

    const enrichedPosts = await enrichPostsWithData(posts, req.current_user.id);

    const responseData = {
      posts: enrichedPosts,
      email: req.current_user.email,
    };

    myCache.set(allPosts, responseData);

    res.status(200).json(responseData);
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
      order: [["posted_at", "DESC"]],
    });

    const enrichedPosts = await enrichPostsWithData(posts, req.current_user.id);

    res.status(200).json({ posts: enrichedPosts, count: posts.length });
  } catch (error) {
    console.error("Error fetching reply feed:", error);
    res.status(500).json({ error: "Failed to fetch reply feed" });
  }
};

const getUserFeed = async (req, res) => {
  const curr_user_id = req.params.id;
  try {
    const posts = await Post.findAll({
      where: {
        user_id: curr_user_id,
        reply_id: null,
        repost_id: null,
      },
      order: [["posted_at", "DESC"]],
    });

    const enrichedPosts = await enrichPostsWithData(posts, req.current_user.id);

    res.status(200).json({ posts: enrichedPosts });
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
  enrichPostsWithData,
};
