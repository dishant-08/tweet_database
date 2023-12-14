"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change the allowNull property for the passwordHash column
    await queryInterface.changeColumn("Users", "passwordHash", {
      type: Sequelize.STRING(512),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // If needed, define a down function to revert the change
    await queryInterface.changeColumn("Users", "passwordHash", {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
  },
};
