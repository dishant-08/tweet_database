// models/user.js

"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Post, { foreignKey: "user_id", as: "posts" });
      User.hasMany(models.like, { foreignKey: "user_id", as: "likes" });
      User.hasMany(models.follow, {
        foreignKey: "follower_user_id",
        as: "following",
      });
      User.hasMany(models.follow, {
        foreignKey: "following_user_id",
        as: "followers",
      });
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      display_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      password_hash: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      profile_picture: {
        type: DataTypes.STRING(1024), // public Supabase Storage URL
        allowNull: true,
      },
      cover_picture: {
        type: DataTypes.STRING(1024), // public Supabase Storage URL
        allowNull: true,
      },
      date_of_birth: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users", // Ensure the correct table name is set
    }
  );
  return User;
};
