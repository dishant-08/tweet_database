"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      display_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      passwordHash: {
        type: Sequelize.STRING(512),
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      website: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      profilePicture: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      coverPicture: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      dateOfBirth: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");
  },
};
