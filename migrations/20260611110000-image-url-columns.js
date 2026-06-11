"use strict";

// Switches profile_picture/cover_picture from BLOB storage to Supabase Storage
// URLs. The bytea columns are renamed to *_blob (data preserved) and replaced
// by varchar URL columns under the original names. Existing BLOBs are migrated
// to Storage and the *_blob columns dropped by scripts/migrate-blob-images.js
// (requires SUPABASE_SERVICE_ROLE_KEY).

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.renameColumn("users", "profile_picture", "profile_picture_blob", { transaction });
      await queryInterface.renameColumn("users", "cover_picture", "cover_picture_blob", { transaction });
      await queryInterface.addColumn(
        "users",
        "profile_picture",
        { type: Sequelize.STRING(1024), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        "users",
        "cover_picture",
        { type: Sequelize.STRING(1024), allowNull: true },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("users", "profile_picture", { transaction });
      await queryInterface.removeColumn("users", "cover_picture", { transaction });
      await queryInterface.renameColumn("users", "profile_picture_blob", "profile_picture", { transaction });
      await queryInterface.renameColumn("users", "cover_picture_blob", "cover_picture", { transaction });
    });
  },
};
