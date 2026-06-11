"use strict";

// Indexes for the hot feed paths: FK lookups on Posts (user/reply/repost),
// the (posted_at, id) composite that backs cursor pagination, plus the
// like-count and following-feed lookups.

const INDEXES = [
  { table: "Posts", fields: ["user_id"], name: "posts_user_id_idx" },
  { table: "Posts", fields: ["reply_id"], name: "posts_reply_id_idx" },
  { table: "Posts", fields: ["repost_id"], name: "posts_repost_id_idx" },
  {
    table: "Posts",
    fields: [
      { name: "posted_at", order: "DESC" },
      { name: "id", order: "DESC" },
    ],
    name: "posts_posted_at_id_idx",
  },
  { table: "likes", fields: ["post_id"], name: "likes_post_id_idx" },
  {
    table: "follows",
    fields: ["follower_user_id"],
    name: "follows_follower_user_id_idx",
  },
];

module.exports = {
  async up(queryInterface) {
    for (const { table, fields, name } of INDEXES) {
      await queryInterface.addIndex(table, fields, { name });
    }
  },

  async down(queryInterface) {
    for (const { table, name } of INDEXES) {
      await queryInterface.removeIndex(table, name);
    }
  },
};
