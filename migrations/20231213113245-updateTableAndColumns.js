"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename the table
    await queryInterface.renameTable("Users", "users");

    // Rename columns to use snake_case
    await queryInterface.renameColumn("users", "passwordHash", "password_hash");
    await queryInterface.renameColumn(
      "users",
      "profilePicture",
      "profile_picture"
    );
    await queryInterface.renameColumn("users", "coverPicture", "cover_picture");
    await queryInterface.renameColumn("users", "dateOfBirth", "date_of_birth");
  },

  down: async (queryInterface, Sequelize) => {
    // Revert column renames
    await queryInterface.renameColumn("users", "password_hash", "passwordHash");
    await queryInterface.renameColumn(
      "users",
      "profile_picture",
      "profilePicture"
    );
    await queryInterface.renameColumn("users", "cover_picture", "coverPicture");
    await queryInterface.renameColumn("users", "date_of_birth", "dateOfBirth");

    // Revert table rename
    await queryInterface.renameTable("users", "Users");
  },
};
