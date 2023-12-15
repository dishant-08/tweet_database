const express = require("express");
// const sequelize = require("sequelize");
const { User, Post, like } = require("./models");
const db = require("./models/index.js");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
require("dotenv").config();
const cors = require("cors");

const app = express(); // Instance of the server
const port = process.env.PORT;
// app.use(cors());

app.use(express.json());
app.use(cookieParser());
// origin: [
//   "http://localhost:5173",
//   "https://react-week-1-dishant-08-hbrg-gv3jw5f72-dishant-08s-projects.vercel.app",
// ],

const corsOptions = {
  origin: true,
  credentials: true,
  exposedHeaders: ["Set-Cookie"], // Expose the Set-Cookie header
};

app.use(cors(corsOptions));

app.get("/healthcheck", async (req, res) => {
  try {
    await db.sequelize.authenticate();
    // Sync models with the database
    // await db.sequelize.sync();
    console.log("Database synced");
    res.status(200).send("I'm healthy");
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).send("Server internal error");
  }
});

app.post("/api/signup", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // The second argument is the saltRounds

    await User.create({
      username: req.body.username,
      email: req.body.email,
      display_name: req.body.display_name || req.body.name, // Use req.body.display_name if available, otherwise fallback to req.body.name
      date_of_birth: req.body.date_of_birth,
      password_hash: hashedPassword,
    });

    res.status(201).send({ message: "User Created" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send({ error: "Failed to create user" });
  }
});

app.post("/api/login", async (req, res) => {
  // console.log("Request Body:", req.body); // Add this line for debugging
  const { email, password } = req.body;
  try {
    const abhiWlaUser = await User.findOne({ where: { email } });
    if (!abhiWlaUser) {
      return res.status(400).send("Invalid email");
    }

    const validPassword = await bcrypt.compare(
      password,
      abhiWlaUser.password_hash
    );

    if (!validPassword) {
      return res.status(404).send("Invalid Password");
    }

    res.cookie("cur_user", abhiWlaUser.id, {
      httpOnly: true,
      maxAge: 3600000,
      secure: true, // Required for "None" sameSite in most browsers
      sameSite: "None",
    });

    res.status(200).send("Logged in Successfully");
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Server Error");
  }
});

const authenticateUser = async (req, res, next) => {
  const validUser = req.cookies.cur_user;

  if (!validUser) {
    return res.status(401).send("Unauthorizzed");
  }
  try {
    req.current_user = await User.findOne({ where: { id: validUser } });
    console.log(req.current_user);
    next();
  } catch (error) {
    res.status(401).send("Invalid Token");
  }
};

app.get("/api/feed", authenticateUser, async (req, res) => {
  try {
    const posts = await Post.findAll();
    res.status(200).json({ posts: posts, email: req.current_user.email });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

app.post("/api/post", authenticateUser, async (req, res) => {
  try {
    await Post.create({
      content: req.body.koko,
      posted_at: new Date(),
      user_id: req.current_user.id,
    });
    res.status(201).send({ message: "Post Created" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send({ error: "Failed to create post" });
  }
});

app.post("/api/like", authenticateUser, async (req, res) => {
  try {
    await like.create({
      user_id: req.current_user.id,
      post_id: req.body.post_id,

      liked_at: new Date(),
    });
    res.status(201).send({ message: "Post Liked " });
  } catch (error) {
    console.error("Error  in Liking the post:", error);
    res.status(500).send({ error: "Failed to liked post" });
  }
});
app.delete("/api/unlike/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await like.destroy({
      where: { user_id: req.current_user.id, post_id: curr_post_id },
    });
    res.status(204).send({ message: "Post Unliked " });
  } catch (error) {
    console.error("Error  in Unliking the post:", error);
    res.status(500).send({ error: "Failed to Unliked post" });
  }
});

app.get("/api/getLike/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const LikeCount = await like.count({
      where: {
        post_id: curr_post_id,
      },
    });
    const LikeEntry = await like.findOne({
      where: {
        post_id: curr_post_id,
        user_id: req.current_user.id,
      },
    });
    res.status(200).json({ count: LikeCount, likedPost: !!LikeEntry });
  } catch (error) {
    console.error("Error at Fetching Like Count", error);
    res.status(500).send({ error: "Failed to fetch liked post" });
  }
});
app.get("/api/curuser", authenticateUser, async (req, res) => {
  try {
    const UserDetails = await User.findOne({
      where: {
        id: req.current_user.id,
      },
    });
    res.status(200).json({
      currUser: UserDetails.username,
      disName: UserDetails.display_name,
    });
  } catch (error) {
    console.error("Error at Fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
});
app.get("/api/getUser/:username", authenticateUser, async (req, res) => {
  const curr_user_username = req.params.username;
  try {
    const UserDetails = await User.findOne({
      where: {
        username: curr_user_username,
      },
    });
    res.status(200).json({ user: UserDetails });
  } catch (error) {
    console.error("Error at Fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
});

app.put("/api/editUser", authenticateUser, async (req, res) => {
  try {
    await User.update(
      {
        display_name: req.body.display_name,
        bio: req.body.bio,
        location: req.body.location,
        website: req.body.website,
        profile_picture: req.body.profile_picture,
        cover_picture: req.body.cover_picture,
      },
      {
        where: {
          id: req.current_user.id,
        },
      }
    );
    res.status(200).send({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ error: "Failed to update user" });
  }
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
