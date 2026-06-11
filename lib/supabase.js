const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

let client = null;

function getStorageClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const err = new Error(
      "Image uploads are disabled: SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL) must be set in .env"
    );
    err.code = "STORAGE_NOT_CONFIGURED";
    throw err;
  }
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return client;
}

const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Uploads an image buffer to <bucket>/<userId>/<timestamp>.<ext> and returns
// its public URL. Timestamped paths keep URLs immutable so browser caches
// never serve a stale image after a profile update.
async function uploadUserImage(bucket, userId, { buffer, mimetype }) {
  const supabase = getStorageClient();
  const ext = MIME_EXTENSIONS[mimetype];
  if (!ext) {
    const err = new Error(`Unsupported image type: ${mimetype}`);
    err.code = "UNSUPPORTED_IMAGE_TYPE";
    throw err;
  }
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimetype });
  if (error) {
    throw new Error(`Storage upload failed (${bucket}/${path}): ${error.message}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Best-effort delete of a previously uploaded object given its public URL.
// Failures are logged and swallowed: a leaked object must never fail a
// profile update.
async function removeUserImageByUrl(bucket, publicUrl) {
  if (!publicUrl) return;
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  try {
    const supabase = getStorageClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.error(`Failed to remove old image ${bucket}/${path}:`, error.message);
  } catch (err) {
    console.error(`Failed to remove old image ${bucket}/${path}:`, err.message);
  }
}

module.exports = { getStorageClient, uploadUserImage, removeUserImageByUrl, MIME_EXTENSIONS };
