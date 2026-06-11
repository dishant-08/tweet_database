"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Post.belongsTo(models.User, { foreignKey: "user_id", as: "author" });
      Post.hasMany(models.like, { foreignKey: "post_id", as: "likes" });
      Post.belongsTo(models.Post, { foreignKey: "repost_id", as: "repostOf" });
      Post.hasMany(models.Post, { foreignKey: "repost_id", as: "reposts" });
      Post.belongsTo(models.Post, { foreignKey: "reply_id", as: "replyTo" });
      Post.hasMany(models.Post, { foreignKey: "reply_id", as: "replies" });
    }
  }
  Post.init(
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      posted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      repost_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      reply_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Post",
    }
  );
  return Post;
};
