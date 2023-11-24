const { User, Post, like } = require("./models");
//create
async function createUser() {
  const user = await User.create({
    username: "Zoro",
    display_name: "Pirate Hunter",
    email: "onepiece.king@gmail.com",
    bio: "Strongest Swordsman of the world",
  });

  const post = await Post.create({
    content: "Onigiri , Three thousand ",
    posted_at: new Date(),
    user_id: user.id,
  });

  const Like = await like.create({
    user_id: user.id,
    post_id: post.id,

    liked_at: new Date(),
  });
}

createUser();

//read
// async function fetchData() {
//   const user = await User.findAll();
//   console.log(JSON.stringify(user, null, 2));
// }

// fetchData();

// //update
// async function updateData() {
//   await User.update(
//     { username: "Mihawk", display_name: "Dracula" },
//     {
//       where: {
//         id: 2,
//       },
//     }
//   );
// }
// updateData();

// //delete
// async function deleteData() {
//   await like.destroy({
//     where: {
//       post_id: 2,
//     },
//   }),
//     await Post.destroy({
//       where: {
//         id: 2,
//       },
//     });
// }

// deleteData();
