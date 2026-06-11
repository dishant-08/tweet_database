const { User, Post, like } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("sequelize");

const { myCache } = require("./authController");

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

const AUTHOR_INCLUDE = {
  model: User,
  as: "author",
  attributes: ["username", "display_name", "profile_picture"],
};

const parseLimit = (raw) => {
  const limit = parseInt(raw, 10);
  if (!Number.isInteger(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
};

// Cursor = base64url("<posted_at ISO ms>|<post uuid>"). Pagination keys on
// (posted_at, id) DESC so identical timestamps can't skip or duplicate rows.
// posted_at is always written client-side by this API with millisecond
// precision, so the ISO ms string round-trips losslessly.
const encodeCursor = (post) =>
  Buffer.from(
    `${new Date(post.posted_at).toISOString()}|${post.id}`,
    "utf8"
  ).toString("base64url");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const decodeCursor = (raw) => {
  if (!raw) return null;
  const decoded = Buffer.from(String(raw), "base64url").toString("utf8");
  const [ts, id] = decoded.split("|");
  const postedAt = new Date(ts);
  if (Number.isNaN(postedAt.getTime()) || !UUID_RE.test(id || "")) {
    const err = new Error("Invalid cursor");
    err.status = 400;
    throw err;
  }
  return { postedAt, id };
};

const cursorWhere = (cursor) => ({
  [Op.or]: [
    { posted_at: { [Op.lt]: cursor.postedAt } },
    { posted_at: cursor.postedAt, id: { [Op.lt]: cursor.id } },
  ],
});

// Fetches one page ordered by (posted_at, id) DESC. Fetches limit+1 rows so
// hasMore needs no COUNT query. When the legacy `offset` param is used
// (and no cursor), falls back to the old offset envelope for backward compat.
const fetchPostPage = async (baseWhere, query) => {
  const limit = parseLimit(query.limit);
  const cursor = decodeCursor(query.cursor);
  const legacyOffset =
    !query.cursor && query.offset !== undefined
      ? parseInt(query.offset, 10) || 0
      : null;

  const order = [
    ["posted_at", "DESC"],
    ["id", "DESC"],
  ];

  if (legacyOffset !== null) {
    const { count, rows } = await Post.findAndCountAll({
      where: baseWhere,
      include: [AUTHOR_INCLUDE],
      order,
      limit,
      offset: legacyOffset,
      distinct: true,
    });
    return {
      posts: rows,
      pagination: {
        total: count,
        offset: legacyOffset,
        limit,
        hasMore: legacyOffset + rows.length < count,
        nextOffset: legacyOffset + rows.length,
      },
    };
  }

  const where = cursor
    ? { [Op.and]: [baseWhere, cursorWhere(cursor)] }
    : baseWhere;

  const rows = await Post.findAll({
    where,
    include: [AUTHOR_INCLUDE],
    order,
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  const posts = hasMore ? rows.slice(0, limit) : rows;
  return {
    posts,
    pagination: {
      limit,
      hasMore,
      nextCursor: hasMore ? encodeCursor(posts[posts.length - 1]) : null,
    },
  };
};

// Adds like/repost/reply counts and the current user's like/repost state to a
// page of posts (author already eager-loaded). One grouped query per metric.
const enrichPostsWithData = async (posts, currentUserId) => {
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  const [likeCounts, userLikes, repostCounts, userReposts, replyCounts] =
    await Promise.all([
      like.findAll({
        where: { post_id: { [Op.in]: postIds } },
        attributes: [
          "post_id",
          [sequelize.fn("COUNT", sequelize.col("post_id")), "count"],
        ],
        group: ["post_id"],
        raw: true,
      }),
      like.findAll({
        where: { post_id: { [Op.in]: postIds }, user_id: currentUserId },
        attributes: ["post_id"],
        raw: true,
      }),
      Post.findAll({
        where: { repost_id: { [Op.in]: postIds } },
        attributes: [
          "repost_id",
          [sequelize.fn("COUNT", sequelize.col("repost_id")), "count"],
        ],
        group: ["repost_id"],
        raw: true,
      }),
      Post.findAll({
        where: { repost_id: { [Op.in]: postIds }, user_id: currentUserId },
        attributes: ["repost_id"],
        raw: true,
      }),
      Post.findAll({
        where: { reply_id: { [Op.in]: postIds } },
        attributes: [
          "reply_id",
          [sequelize.fn("COUNT", sequelize.col("reply_id")), "count"],
        ],
        group: ["reply_id"],
        raw: true,
      }),
    ]);

  const likeCountMap = {};
  likeCounts.forEach((lc) => {
    likeCountMap[lc.post_id] = parseInt(lc.count, 10);
  });
  const userLikedSet = new Set(userLikes.map((ul) => ul.post_id));

  const repostCountMap = {};
  repostCounts.forEach((rc) => {
    repostCountMap[rc.repost_id] = parseInt(rc.count, 10);
  });
  const userRepostedSet = new Set(userReposts.map((ur) => ur.repost_id));

  const replyCountMap = {};
  replyCounts.forEach((rc) => {
    replyCountMap[rc.reply_id] = parseInt(rc.count, 10);
  });

  return posts.map((post) => {
    const postData = post.toJSON ? post.toJSON() : post;
    const { author, ...rest } = postData;
    return {
      ...rest,
      user: {
        username: author?.username,
        display_name: author?.display_name,
        profile_picture: author?.profile_picture,
      },
      likeCount: likeCountMap[postData.id] || 0,
      isLiked: userLikedSet.has(postData.id),
      repostCount: repostCountMap[postData.id] || 0,
      isReposted: userRepostedSet.has(postData.id),
      replyCount: replyCountMap[postData.id] || 0,
    };
  });
};

const handleFeedError = (res, error, label) => {
  if (error.status === 400) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`Error fetching ${label}:`, error);
  res.status(500).json({ error: `Failed to fetch ${label}` });
};

// Pure reposts have null content and are surfaced via repostCount, never as
// rows, so every feed filters them out server-side.
const CONTENT_PRESENT = { content: { [Op.ne]: null } };

const getFeed = async (req, res) => {
  try {
    const { posts, pagination } = await fetchPostPage(
      { reply_id: null, repost_id: null, ...CONTENT_PRESENT },
      req.query
    );
    const enrichedPosts = await enrichPostsWithData(posts, req.current_user.id);

    res.status(200).json({
      posts: enrichedPosts,
      email: req.current_user.email,
      pagination,
    });
  } catch (error) {
    handleFeedError(res, error, "feed");
  }
};

const getReplyFeed = async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const posts = await Post.findAll({
      where: { reply_id: curr_post_id, ...CONTENT_PRESENT },
      include: [AUTHOR_INCLUDE],
      order: [
        ["posted_at", "DESC"],
        ["id", "DESC"],
      ],
    });

    const enrichedPosts = await enrichPostsWithData(posts, req.current_user.id);

    res.status(200).json({ posts: enrichedPosts, count: posts.length });
  } catch (error) {
    handleFeedError(res, error, "reply feed");
  }
};

const getUserFeed = async (req, res) => {
  const curr_user_id = req.params.id;
  try {
    const { posts, pagination } = await fetchPostPage(
      { user_id: curr_user_id, reply_id: null, repost_id: null, ...CONTENT_PRESENT },
      req.query
    );
    const enrichedPosts = await enrichPostsWithData(posts, req.current_user.id);

    res.status(200).json({ posts: enrichedPosts, pagination });
  } catch (error) {
    handleFeedError(res, error, "user feed");
  }
};

const createPost = async (req, res) => {
  try {
    await Post.create({
      content: req.body.content,
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
      content: req.body.content,
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
  fetchPostPage,
};
