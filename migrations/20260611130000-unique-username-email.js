"use strict";

// Usernames and emails were never unique (signup auto-generated username as
// display name + "08", producing duplicates). This migration:
//   1. deletes duplicate rows of the same (username, email) pair that have no
//      activity (no posts, likes, or follows) — keeper is the row with the
//      most activity, then the oldest
//   2. suffixes usernames that still collide across different emails
//      (accounts preserved, e.g. "100x08" -> "100x08_2")
//   3. aborts if any duplicate emails remain (would need manual resolution)
//   4. adds unique indexes on users(username) and users(email)

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const run = (sql) => queryInterface.sequelize.query(sql, { transaction });

      await run(`
        WITH activity AS (
          SELECT u.id,
            (SELECT count(*) FROM "Posts" p WHERE p.user_id = u.id)
            + (SELECT count(*) FROM "likes" l WHERE l.user_id = u.id)
            + (SELECT count(*) FROM "follows" f
               WHERE f.follower_user_id = u.id OR f.following_user_id = u.id) AS refs
          FROM "users" u
        ),
        ranked AS (
          SELECT u.id, a.refs,
            row_number() OVER (
              PARTITION BY u.username, u.email
              ORDER BY a.refs DESC, u."createdAt" ASC, u.id ASC
            ) AS rn
          FROM "users" u JOIN activity a ON a.id = u.id
        )
        DELETE FROM "users"
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1 AND refs = 0);
      `);

      await run(`
        WITH ranked AS (
          SELECT id,
            row_number() OVER (
              PARTITION BY username ORDER BY "createdAt" ASC, id ASC
            ) AS rn
          FROM "users"
        )
        UPDATE "users" u SET username = u.username || '_' || r.rn
        FROM ranked r
        WHERE u.id = r.id AND r.rn > 1;
      `);

      await run(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM "users" GROUP BY username HAVING count(*) > 1) THEN
            RAISE EXCEPTION 'duplicate usernames remain after dedup';
          END IF;
          IF EXISTS (SELECT 1 FROM "users" GROUP BY email HAVING count(*) > 1) THEN
            RAISE EXCEPTION 'duplicate emails remain; resolve manually before adding the unique index';
          END IF;
        END $$;
      `);

      await run(`CREATE UNIQUE INDEX "users_username_unique" ON "users" (username);`);
      await run(`CREATE UNIQUE INDEX "users_email_unique" ON "users" (email);`);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "users_username_unique";`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "users_email_unique";`);
    // deleted duplicate rows and renamed usernames are not restored
  },
};
