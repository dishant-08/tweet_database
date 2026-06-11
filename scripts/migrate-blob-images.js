// One-time migration of legacy BLOB profile/cover images to Supabase Storage.
// Requires SUPABASE_SERVICE_ROLE_KEY in .env. Idempotent: safe to re-run; it
// only processes rows that still have *_blob data, and only drops the legacy
// columns once nothing is left to migrate.
//
// Usage: node scripts/migrate-blob-images.js

require("dotenv").config();
const db = require("../models");
const { uploadUserImage } = require("../lib/supabase");

const MAGIC_MIMES = [
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" }, // RIFF....WEBP
];

function detectMime(buffer) {
  for (const { bytes, mime } of MAGIC_MIMES) {
    if (bytes.every((b, i) => buffer[i] === b)) return mime;
  }
  return "image/jpeg";
}

async function main() {
  const { sequelize } = db;
  const [columns] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('profile_picture_blob', 'cover_picture_blob')
  `);
  if (columns.length === 0) {
    console.log("Legacy blob columns already dropped — nothing to migrate.");
    return;
  }

  const [rows] = await sequelize.query(`
    SELECT id, profile_picture_blob, cover_picture_blob FROM users
    WHERE profile_picture_blob IS NOT NULL OR cover_picture_blob IS NOT NULL
  `);
  console.log(`${rows.length} user(s) with legacy blob images`);

  for (const row of rows) {
    for (const [blobCol, urlCol, bucket] of [
      ["profile_picture_blob", "profile_picture", "avatars"],
      ["cover_picture_blob", "cover_picture", "covers"],
    ]) {
      const blob = row[blobCol];
      if (!blob) continue;
      const buffer = Buffer.from(blob);
      const url = await uploadUserImage(bucket, row.id, {
        buffer,
        mimetype: detectMime(buffer),
      });
      await sequelize.query(
        `UPDATE users SET "${urlCol}" = :url, "${blobCol}" = NULL WHERE id = :id`,
        { replacements: { url, id: row.id } }
      );
      console.log(`user ${row.id}: ${blobCol} -> ${url}`);
    }
  }

  const [[remaining]] = await sequelize.query(`
    SELECT count(*)::int AS n FROM users
    WHERE profile_picture_blob IS NOT NULL OR cover_picture_blob IS NOT NULL
  `);
  if (remaining.n === 0) {
    await sequelize.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS profile_picture_blob, DROP COLUMN IF EXISTS cover_picture_blob`
    );
    console.log("All blobs migrated; legacy columns dropped.");
  } else {
    console.log(`${remaining.n} blob(s) left unmigrated; columns kept.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
  });
