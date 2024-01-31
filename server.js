const express = require("express");
const sequelize = require("sequelize");
const { User, Post, like, follow } = require("./models");
const db = require("./models/index.js");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
require("dotenv").config();
const cors = require("cors");
const OpenAI = require("openai");
const authRoutes = require("./routes/authRoutes");

const { myCache } = require("./controllers/authController");

// const authenticateUser = require("./middleware/authenticateUser");
const {
  getFeed,
  getReplyFeed,
  getUserFeed,
  createPost,
  createReply,
} = require("./controllers/feedController");

const {
  followUser,
  unfollowUser,
  checkFollowStatus,
  followingFeed,
} = require("./controllers/followController");

const {
  likePost,
  retweetPost,
  unretweetPost,
  unlikePost,
  getLikeCount,
  getRetweetCount,
} = require("./controllers/interactionController");

const {
  getEditCurrentUser,
  getUserByUsername,
  getUserById,
} = require("./controllers/userController");

const app = express(); // Instance of the server
const port = process.env.PORT;
// app.use(cors());
const multer = require("multer");
// const post = require("./models/post.js");

// const NodeCache = require("node-cache");
// const myCache = new NodeCache({ stdTTL: 300 });
// const GetAllPost = new NodeCache({ stdTTL: 300 });

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
    // console.log("Database synced");
    res.status(200).send("I'm healthy");
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).send("Server internal error");
  }
});

app.use("/api", authRoutes);
const authenticateUser = async (req, res, next) => {
  const validUser = req.cookies.cur_user;

  if (!validUser) {
    return res.status(401).send("Unauthorizzed");
  }
  try {
    req.current_user = await User.findOne({ where: { id: validUser } });
    // console.log(req.current_user);
    next();
  } catch (error) {
    res.status(401).send("Invalid Token");
  }
};

// Feed Routes
app.get("/api/feed", authenticateUser, getFeed);
app.get("/api/replyfeed/:id", authenticateUser, getReplyFeed);
app.get("/api/userfeed/:id", authenticateUser, getUserFeed);
app.post("/api/post", authenticateUser, createPost);
app.post("/api/reply/:id", authenticateUser, createReply);

// Follow Routes
app.post("/api/follow", authenticateUser, followUser);
app.post("/api/unfollow", authenticateUser, unfollowUser);
app.get("/api/checkFollowStatus", authenticateUser, checkFollowStatus);
app.get("/followingfeed", authenticateUser, followingFeed);

// Interaction Routes
app.post("/api/like", authenticateUser, likePost);
app.post("/api/retweet/:id", authenticateUser, retweetPost);
app.delete("/api/unretweet/:id", authenticateUser, unretweetPost);
app.delete("/api/unlike/:id", authenticateUser, unlikePost);
app.get("/api/getLike/:id", authenticateUser, getLikeCount); // Use the new endpoint
app.get("/api/getretweet/:id", authenticateUser, getRetweetCount); // Use the new endpoint

app.get("/api/curuser", authenticateUser, async (req, res) => {
  const cacheKey = `userDetails_${req.current_user.id}`;

  // Check the cache first
  const cachedUserDetails = myCache.get(cacheKey);
  if (cachedUserDetails) {
    // console.log("User details retrieved from cache");
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

// User Routes
app.get("/api/geteditcuruser", authenticateUser, getEditCurrentUser);
app.get("/api/getUser/:username", authenticateUser, getUserByUsername);
app.get("/api/getUserbyId/:id", authenticateUser, getUserById);

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

const openai = new OpenAI({ apiKey: process.env.VITE_API_KEY });

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

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   host: "smtp.gmail.com",
//   // host: process.env.SMTP_HOST,
//   //  port:process.env.SMPT_PORT,

//   auth: {
//     user: process.env.MAIL_ID,
//     pass: process.env.MAIL_PASS,
//   },
// });

let configOptions = {
  service: "gmail",
  host: "smtp.gmail.com", // Update with your SMTP server's host
  // port: 465,
  secure: true,
  tls: {
    servername: "smtp.gmail.com",
    // Add additional TLS options if needed
  },
  auth: {
    user: process.env.MAIL_ID, // Your Gmail email address
    pass: process.env.MAIL_PASS, // Your Gmail password or App Password
  },
};

const transporter = nodemailer.createTransport(configOptions);

let verificationOpt;

app.post("/sendmail", async (req, res) => {
  const email = req.body.email;

  // if (!isValidEmail(email)) {
  //   return res.status(400).send("Invalid email address");
  // }

  verificationOpt = generateVerificationOtp();

  try {
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: "Your 100x Verification Code",
      text: `Welcome to 100x microblogging platform! Your verification code is ${verificationOpt}`,
    };

    await transporter.sendMail(mailOptions);
    // console.log("Email sent successfully!");

    res.status(200).send(`${verificationOpt}`);
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Error sending email");
  }
});

app.post("/verifymail", async (req, res) => {
  try {
    const userEnteredOtp = req.body.otp;

    // Uncomment the following block if you want to check for invalid OTP format
    // if (!userEnteredOtp || typeof userEnteredOtp !== "string") {
    //   return res.status(400).send({ msg: "Invalid OTP format" });
    // }

    // console.log("Entered OTP:", userEnteredOtp);
    // console.log("Expected OTP:", verificationOpt);

    if (verificationOpt == userEnteredOtp) {
      console.log("verified");
      // Successful verification
      // Consider resetting or invalidating the OTP to prevent multiple use
      verificationOpt = null;
      res.status(200).send({ msg: "You are verified" });
    } else {
      console.log("Incorrect OTP");
      res.status(401).send({ msg: "Incorrect OTP" });
    }
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).send({ msg: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
