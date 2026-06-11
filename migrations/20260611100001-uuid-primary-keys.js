"use strict";

// Converts all BIGINT auto-increment PKs to UUIDs (uuid_generate_v4) while
// preserving every row: new UUID columns are generated, every FK column
// (Posts.user_id/repost_id/reply_id, likes.user_id/post_id,
// follows.follower_user_id/following_user_id) is remapped old-id -> new-uuid
// via joins, then old BIGINT columns are dropped and the UUID columns renamed
// into place. Runs in a single transaction. A pre-migration snapshot lives in
// the backup_pre_uuid schema.
//
// Known data note: replies whose parent post no longer exists (orphans) end up
// with reply_id = NULL under the new FK constraints.

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const run = (sql) => queryInterface.sequelize.query(sql, { transaction });

      await run(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

      // 1. New UUID identity columns
      await run(`ALTER TABLE "users" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT uuid_generate_v4();`);
      await run(`ALTER TABLE "Posts" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT uuid_generate_v4();`);
      await run(`ALTER TABLE "follows" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT uuid_generate_v4();`);
      await run(`ALTER TABLE "likes" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT uuid_generate_v4();`);

      // 2. New UUID FK columns
      await run(`ALTER TABLE "Posts" ADD COLUMN "user_id_uuid" uuid, ADD COLUMN "repost_id_uuid" uuid, ADD COLUMN "reply_id_uuid" uuid;`);
      await run(`ALTER TABLE "likes" ADD COLUMN "user_id_uuid" uuid, ADD COLUMN "post_id_uuid" uuid;`);
      await run(`ALTER TABLE "follows" ADD COLUMN "follower_user_id_uuid" uuid, ADD COLUMN "following_user_id_uuid" uuid;`);

      // 3. Remap old ids -> new uuids
      await run(`UPDATE "Posts" p SET "user_id_uuid" = u."id_uuid" FROM "users" u WHERE p."user_id" = u."id";`);
      await run(`UPDATE "Posts" p SET "repost_id_uuid" = t."id_uuid" FROM "Posts" t WHERE p."repost_id" = t."id";`);
      await run(`UPDATE "Posts" p SET "reply_id_uuid" = t."id_uuid" FROM "Posts" t WHERE p."reply_id" = t."id";`);
      await run(`UPDATE "likes" l SET "user_id_uuid" = u."id_uuid" FROM "users" u WHERE l."user_id" = u."id";`);
      await run(`UPDATE "likes" l SET "post_id_uuid" = p."id_uuid" FROM "Posts" p WHERE l."post_id" = p."id";`);
      await run(`UPDATE "follows" f SET "follower_user_id_uuid" = u."id_uuid" FROM "users" u WHERE f."follower_user_id" = u."id";`);
      await run(`UPDATE "follows" f SET "following_user_id_uuid" = u."id_uuid" FROM "users" u WHERE f."following_user_id" = u."id";`);

      // 4. Abort if any required FK failed to remap
      await run(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM "Posts" WHERE "user_id_uuid" IS NULL)
            OR EXISTS (SELECT 1 FROM "likes" WHERE "user_id_uuid" IS NULL OR "post_id_uuid" IS NULL)
            OR EXISTS (SELECT 1 FROM "follows" WHERE "follower_user_id_uuid" IS NULL OR "following_user_id_uuid" IS NULL)
          THEN
            RAISE EXCEPTION 'UUID remap incomplete: required foreign key failed to resolve';
          END IF;
        END $$;
      `);

      // 5. Drop old constraints, then old columns (sequences are owned by the
      //    dropped id columns and go with them)
      await run(`ALTER TABLE "Posts" DROP CONSTRAINT "Posts_user_id_fkey";`);
      await run(`ALTER TABLE "likes" DROP CONSTRAINT "likes_user_id_fkey", DROP CONSTRAINT "likes_post_id_fkey";`);
      await run(`ALTER TABLE "follows" DROP CONSTRAINT "follows_follower_user_id_fkey", DROP CONSTRAINT "follows_following_user_id_fkey", DROP CONSTRAINT "follow_check";`);
      await run(`ALTER TABLE "Posts" DROP CONSTRAINT "Posts_pkey";`);
      await run(`ALTER TABLE "users" DROP CONSTRAINT "Users_pkey";`);
      await run(`ALTER TABLE "follows" DROP CONSTRAINT "follows_pkey";`);
      await run(`ALTER TABLE "likes" DROP CONSTRAINT "likes_pkey";`);

      await run(`ALTER TABLE "users" DROP COLUMN "id";`);
      await run(`ALTER TABLE "Posts" DROP COLUMN "id", DROP COLUMN "user_id", DROP COLUMN "repost_id", DROP COLUMN "reply_id";`);
      await run(`ALTER TABLE "likes" DROP COLUMN "id", DROP COLUMN "user_id", DROP COLUMN "post_id";`);
      await run(`ALTER TABLE "follows" DROP COLUMN "id", DROP COLUMN "follower_user_id", DROP COLUMN "following_user_id";`);

      // 6. Rename UUID columns into place
      await run(`ALTER TABLE "users" RENAME COLUMN "id_uuid" TO "id";`);
      await run(`ALTER TABLE "Posts" RENAME COLUMN "id_uuid" TO "id";`);
      await run(`ALTER TABLE "Posts" RENAME COLUMN "user_id_uuid" TO "user_id";`);
      await run(`ALTER TABLE "Posts" RENAME COLUMN "repost_id_uuid" TO "repost_id";`);
      await run(`ALTER TABLE "Posts" RENAME COLUMN "reply_id_uuid" TO "reply_id";`);
      await run(`ALTER TABLE "likes" RENAME COLUMN "id_uuid" TO "id";`);
      await run(`ALTER TABLE "likes" RENAME COLUMN "user_id_uuid" TO "user_id";`);
      await run(`ALTER TABLE "likes" RENAME COLUMN "post_id_uuid" TO "post_id";`);
      await run(`ALTER TABLE "follows" RENAME COLUMN "id_uuid" TO "id";`);
      await run(`ALTER TABLE "follows" RENAME COLUMN "follower_user_id_uuid" TO "follower_user_id";`);
      await run(`ALTER TABLE "follows" RENAME COLUMN "following_user_id_uuid" TO "following_user_id";`);

      // 7. Restore PKs, NOT NULLs, FKs and the self-follow check
      await run(`ALTER TABLE "users" ADD CONSTRAINT "Users_pkey" PRIMARY KEY ("id");`);
      await run(`ALTER TABLE "Posts" ADD CONSTRAINT "Posts_pkey" PRIMARY KEY ("id");`);
      await run(`ALTER TABLE "follows" ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");`);
      await run(`ALTER TABLE "likes" ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");`);

      await run(`ALTER TABLE "Posts" ALTER COLUMN "user_id" SET NOT NULL;`);
      await run(`ALTER TABLE "likes" ALTER COLUMN "user_id" SET NOT NULL, ALTER COLUMN "post_id" SET NOT NULL;`);
      await run(`ALTER TABLE "follows" ALTER COLUMN "follower_user_id" SET NOT NULL, ALTER COLUMN "following_user_id" SET NOT NULL;`);

      await run(`ALTER TABLE "Posts" ADD CONSTRAINT "Posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");`);
      await run(`ALTER TABLE "Posts" ADD CONSTRAINT "Posts_repost_id_fkey" FOREIGN KEY ("repost_id") REFERENCES "Posts"("id") ON DELETE SET NULL;`);
      await run(`ALTER TABLE "Posts" ADD CONSTRAINT "Posts_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "Posts"("id") ON DELETE SET NULL;`);
      await run(`ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");`);
      await run(`ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Posts"("id");`);
      await run(`ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_user_id_fkey" FOREIGN KEY ("follower_user_id") REFERENCES "users"("id");`);
      await run(`ALTER TABLE "follows" ADD CONSTRAINT "follows_following_user_id_fkey" FOREIGN KEY ("following_user_id") REFERENCES "users"("id");`);
      await run(`ALTER TABLE "follows" ADD CONSTRAINT "follow_check" CHECK ("following_user_id" <> "follower_user_id");`);

      await run(`DROP SEQUENCE IF EXISTS "Users_id_seq", "Posts_id_seq", "follows_id_seq", "likes_id_seq";`);
    });
  },

  async down() {
    throw new Error(
      "Irreversible: BIGINT ids were dropped. Restore from the backup_pre_uuid schema or the pg dump."
    );
  },
};
