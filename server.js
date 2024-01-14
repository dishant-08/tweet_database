const express = require("express");
const sequelize = require("sequelize");
const { User, Post, like, follow } = require("./models");
const db = require("./models/index.js");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
require("dotenv").config();
const cors = require("cors");
const OpenAI = require("openai");

const app = express(); // Instance of the server
const port = process.env.PORT;
// app.use(cors());
const multer = require("multer");
// const post = require("./models/post.js");

const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 300 });
// const GetAllPost = new NodeCache({ stdTTL: 300 });

// const upload = multer({ dest: "uploads/" });
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

    const cacheKey = `userDetails_${abhiWlaUser.id}`;
    myCache.del(cacheKey);

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
app.post("/api/guest-login", async (req, res) => {
  // console.log("Request Body:", req.body); // Add this line for debugging
  // const { email, password } = req.body;
  const email = "randomEmail@example.com";
  const password = "randomPassword";
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

    const cacheKey = `userDetails_${abhiWlaUser.id}`;
    myCache.del(cacheKey);

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
  const allPosts = `getAllPost_${req.current_user.id}`;

  const cachePost = myCache.get(allPosts);
  if (cachePost) {
    return res.status(200).json(cachePost);
  }

  try {
    const posts = await Post.findAll({
      where: {
        reply_id: null,
        repost_id: null,
      },
    });

    myCache.set(allPosts, {
      posts: posts,
      email: req.current_user.email,
    });

    res.status(200).json({ posts: posts, email: req.current_user.email });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});
app.get("/api/replyfeed/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const posts = await Post.findAll({
      where: {
        reply_id: curr_post_id,
      },
    });
    const count = await Post.count({
      where: {
        reply_id: curr_post_id,
      },
    });
    res.status(200).json({ posts: posts, count: count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});
app.get("/api/userfeed/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const posts = await Post.findAll({
      where: {
        user_id: curr_post_id,
        reply_id: null,
        repost_id: null,
      },
    });

    res.status(200).json({ posts: posts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// app.get("/api/feed", authenticateUser, async (req, res) => {
//   try {
//     const posts = await Post.findAll();
//     res.status(200).json({ posts: posts, email: req.current_user.email });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch posts" });
//   }
// });

app.post("/api/post", authenticateUser, async (req, res) => {
  try {
    await Post.create({
      content: req.body.koko,
      posted_at: new Date(),
      user_id: req.current_user.id,
    });
    const allPosts = `getAllPost_${req.current_user.id}`;
    myCache.del(allPosts);
    res.status(201).send({ message: "Post Created" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send({ error: "Failed to create post" });
  }
});
app.post("/api/reply/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await Post.create({
      reply_id: curr_post_id,
      content: req.body.koko,
      posted_at: new Date(),
      user_id: req.current_user.id,
    });
    res.status(201).send({ message: "reply Created" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send({ error: "Failed to create reply" });
  }
});

app.post("/api/follow", authenticateUser, async (req, res) => {
  try {
    await follow.create({
      follower_user_id: req.current_user.id,
      following_user_id: req.body.following_id,
    });
    res.status(201).send({ message: " You Succesfully followed " });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).send({ error: "Failed to follow" });
  }
});

app.post("/api/unfollow", authenticateUser, async (req, res) => {
  try {
    await follow.destroy({
      where: {
        follower_user_id: req.current_user.id,
        following_user_id: req.body.following_id,
      },
    });
    res.status(204).send({ message: " You Succesfully Unfollowed " });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).send({ error: "Failed to follow" });
  }
});

app.get("/api/checkFollowStatus", authenticateUser, async (req, res) => {
  try {
    const followEntry = await follow.findOne({
      where: {
        follower_user_id: req.current_user.id,
        following_user_id: req.query.following_id,
      },
    });
    res.status(200).json({ status: !!followEntry });
  } catch (error) {
    console.error("Error getting Status", error);
    res.status(500).send({ error: "Failed to get status" });
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

app.post("/api/retweet/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await Post.create({
      repost_id: curr_post_id,
      posted_at: new Date(),
      user_id: req.current_user.id,
    });
    res.status(201).send({ message: "rePost Created" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send({ error: "Failed to create repost" });
  }
});

app.delete("/api/unretweet/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    await Post.destroy({
      where: { user_id: req.current_user.id, repost_id: curr_post_id },
    });
    res.status(204).send({ message: "Post sucessfully unrepost " });
  } catch (error) {
    console.error("Error  in Unrepost the post:", error);
    res.status(500).send({ error: "Failed to Unrepost post" });
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
app.get("/api/getretweet/:id", authenticateUser, async (req, res) => {
  const curr_post_id = req.params.id;
  try {
    const RepostCount = await Post.count({
      where: {
        repost_id: curr_post_id,
      },
    });
    const RepostEntry = await Post.findOne({
      where: {
        user_id: req.current_user.id,
        repost_id: curr_post_id,
      },
    });
    res.status(200).json({ repostCount: RepostCount, isRePost: !!RepostEntry });
  } catch (error) {
    console.error("Error at Fetching repost Count", error);
    res.status(500).send({ error: "Failed to fetch repost" });
  }
});

app.get("/api/curuser", authenticateUser, async (req, res) => {
  const cacheKey = `userDetails_${req.current_user.id}`;

  // Check the cache first
  const cachedUserDetails = myCache.get(cacheKey);
  if (cachedUserDetails) {
    console.log("User details retrieved from cache");
    return res.status(200).json(cachedUserDetails);
  }

  try {
    // If not in cache, fetch user details from the database
    // const UserDetails = await User.findOne({
    //   where: {
    //     id: req.current_user.id,
    //   },
    // });

    // Cache the user details for future requests
    myCache.set(cacheKey, {
      id: req.current_user.id,
      currUser: req.current_user.username,
      disName: req.current_user.display_name,
      dp: req.current_user.profile_picture,
    });

    res.status(200).json({
      id: req.current_user.id,
      currUser: req.current_user.username,
      disName: req.current_user.display_name,
      dp: req.current_user.profile_picture,
    });
  } catch (error) {
    console.error("Error at Fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
});
app.get("/api/geteditcuruser", authenticateUser, async (req, res) => {
  try {
    // const UserDetails = await User.findOne({
    //   where: {
    //     id: req.current_user.id,
    //   },
    // });
    res.status(200).json({
      user: req.current_user,
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
    const following = await follow.count({
      where: {
        follower_user_id: UserDetails.id,
      },
    });
    const follower = await follow.count({
      where: {
        following_user_id: UserDetails.id,
      },
    });
    res
      .status(200)
      .json({ user: UserDetails, follower: follower, following: following });
  } catch (error) {
    console.error("Error at Fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
});
app.get("/api/getUserbyId/:id", authenticateUser, async (req, res) => {
  const curr_user_id = req.params.id;
  try {
    const UserDetails = await User.findOne({
      where: {
        id: curr_user_id,
      },
    });
    res.status(200).json({
      currUser: UserDetails.username,
      disName: UserDetails.display_name,
      dp: UserDetails.profile_picture,
    });
  } catch (error) {
    console.error("Error at Fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
});

const storage = multer.memoryStorage(); // Store files in memory as buffers
const upload = multer({ storage: storage });

// ...

app.put(
  "/api/editUser",
  authenticateUser,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "cover_picture", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { display_name, bio, location, website } = req.body;

      // Check if files were uploaded
      const profilePictureBuffer =
        req.files["profile_picture"]?.[0]?.buffer || null;
      const coverPictureBuffer =
        req.files["cover_picture"]?.[0]?.buffer || null;

      // Your file handling logic here (e.g., saving to disk, processing, etc.)

      // Update user information in the database
      const updateFields = {
        display_name,
        bio,
        location,
        website,
      };

      // Only update image fields if new images are provided
      if (profilePictureBuffer) {
        updateFields.profile_picture = profilePictureBuffer;
      }

      if (coverPictureBuffer) {
        updateFields.cover_picture = coverPictureBuffer;
      }

      await User.update(updateFields, {
        where: {
          id: req.current_user.id,
        },
      });

      // Optionally, you can send back the updated user details
      const updatedUser = await User.findByPk(req.current_user.id);
      res
        .status(200)
        .send({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).send({ error: "Failed to update user" });
    }
  }
);

app.get("/api/getUserbyId/:id", authenticateUser, async (req, res) => {
  const curr_user_id = req.params.id;
  try {
    const UserDetails = await User.findOne({
      where: {
        id: curr_user_id,
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

// app.put("/api/editUser", authenticateUser, async (req, res) => {
//   try {
//     await User.update(
//       {
//         display_name: req.body.display_name,
//         bio: req.body.bio,
//         location: req.body.location,
//         website: req.body.website,
//         profile_picture: req.body.profile_picture,
//         cover_picture: req.body.cover_picture,
//       },
//       {
//         where: {
//           id: req.current_user.id,
//         },
//       }
//     );
//     res.status(200).send({ message: "User updated successfully" });
//   } catch (error) {
//     console.error("Error updating user:", error);
//     res.status(500).send({ error: "Failed to update user" });
//   }
// });

app.get("/api/geteditcuruser", authenticateUser, async (req, res) => {
  try {
    const UserDetails = await User.findOne({
      where: {
        id: req.current_user.id,
      },
    });
    res.status(200).json({
      user: UserDetails,
    });
  } catch (error) {
    console.error("Error at Fetching user", error);
    res.status(500).send({ error: "Failed to fetch user" });
  }
});

const openai = new OpenAI({ apiKey: process.env.VITE_API_KEY });

// Define the route for text completion
app.get("/complete-text", authenticateUser, async (req, res) => {
  // Extract the user input from the request query parameters
  // const userInput = req.query.input;
  const userInput = `Generate Short and concise Twitter Post about ${req.query.input}`;

  // Validate the user input
  if (!userInput) {
    return res.status(400).send("Missing input query parameter.");
  }

  try {
    // Send a request to the OpenAI API to complete the text
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a Social Media Manager and Expert at Viral Tweets.",
        },
        { role: "user", content: userInput },
      ],
      model: "gpt-3.5-turbo",
    });

    // Extract the completed text from the OpenAI API response
    const completedText = chatCompletion.choices[0].message.content;

    // Send the completed text as the response
    res.json({ completedText });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const generateVerificationOtp = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  // host: process.env.SMTP_HOST,
  //  port:process.env.SMPT_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PASS,
  },
});

app.post("/sendmail", async (req, res) => {
  VerificationOpt = generateVerificationOtp();
  res.status(303).send(`${VerificationOpt}`);

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: req.body.email,
    subject: "Your 100x Verification Code",
    text: `Welcome to 100x microblogging platform ! Your verification code is ${VerificationOpt} `,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error, info);
    } else {
      console.log("Email send successfully!");
    }
  });
});

app.post("/verifymail", async (req, res) => {
  if (VerificationOpt == req.body.otp) {
    res.status(230).send({ msg: "Your are verified" });
  } else {
    res.status(530).send({ msg: "OTP is wrong" });
  }
});

// res.send(fool);
// Assuming your follow model has a belongsTo association with the User model
follow.belongsTo(User, {
  foreignKey: "following_user_id",
  as: "followingUser",
});

app.get("/followingfeed", authenticateUser, async (req, res) => {
  try {
    // Retrieve followers along with associated users
    const followers = await follow.findAll({
      where: {
        follower_user_id: req.current_user.id,
      },
      include: [
        {
          model: User,
          as: "followingUser",
          attributes: ["id"], // Include only necessary attributes
        },
      ],
    });

    // Extract the following_user_id from each follower instance
    const followingUserIds = followers.map(
      (follower) => follower.followingUser.id
    );

    // Retrieve posts related to the followers, ordered by posted_at in descending order
    const posts = await Post.findAll({
      where: {
        user_id: { [sequelize.Op.in]: followingUserIds },
        reply_id: null,
        repost_id: null,
      },
      order: [["posted_at", "DESC"]], // Add this line for ordering
    });

    res.status(200).json({
      user: followingUserIds,
      posts,
    });
  } catch (error) {
    console.error("Error at Fetching user and posts", error);
    res.status(500).send({ error: "Failed to fetch user and posts" });
  }
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
