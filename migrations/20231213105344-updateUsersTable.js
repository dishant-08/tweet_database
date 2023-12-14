"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Users", "passwordHash", {
      type: Sequelize.STRING(512),
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "location", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "website", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "profilePicture", {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "coverPicture", {
      type: Sequelize.STRING(1024),
      allowNull: true,
    });

    await queryInterface.addColumn("Users", "dateOfBirth", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // If needed, define the reverse migration to remove the new columns
    await queryInterface.removeColumn("Users", "passwordHash");
    await queryInterface.removeColumn("Users", "location");
    await queryInterface.removeColumn("Users", "website");
    await queryInterface.removeColumn("Users", "profilePicture");
    await queryInterface.removeColumn("Users", "coverPicture");
    await queryInterface.removeColumn("Users", "dateOfBirth");
  },
};
