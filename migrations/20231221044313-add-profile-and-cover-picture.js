"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "profile_picture", {
      type: Sequelize.BLOB("long"),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "cover_picture", {
      type: Sequelize.BLOB("long"),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "profile_picture");
    await queryInterface.removeColumn("users", "cover_picture");
  },
};
