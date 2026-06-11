"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class like extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  like.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      post_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Posts",
          key: "id",
        },
      },
      liked_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "like",
      tableName: "likes",
    }
  );
  return like;
};
