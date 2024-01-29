// controllers/feedWorker.js
const { parentPort, workerData } = require("worker_threads");
const { User, Post, like, follow } = require("../models");

const fetchPosts = async (userId) => {
  try {
    const posts = await Post.findAll({
      where: {
        user_id: userId,
        reply_id: null,
        repost_id: null,
      },
    });
    return posts;
  } catch (error) {
    console.error("Error fetching posts in worker thread:", error);
    return [];
  }
};

const startWorker = async () => {
  const { userId } = workerData;
  const posts = await fetchPosts(userId);
  parentPort.postMessage(posts);
};

startWorker();
