# Database Schema



![image](https://github.com/dishant-08/tweet_database/assets/60565337/95c3693c-409b-4106-b395-bbbdfa8ab4ad)



## Users Table

- **id**: Auto-incrementing identifier (`bigserial`).
- **username**: User's username (`varchar`, max length 255, not null).
- **email**: User's email address (`varchar`, max length 255, not null).
- **display_name**: User's display name (`varchar`, max length 255, not null).
- **bio**: User's biography (`text`, nullable).
- **createdAt**: Timestamp of creation (`timestamp with time zone`, not null).
- **updatedAt**: Timestamp of the last update (`timestamp with time zone`, not null).

**Constraints:**
- Primary Key: `Users_pkey` (`id`).

## Posts Table

- **id**: Auto-incrementing identifier (`bigserial`).
- **content**: Post content (`text`, not null).
- **posted_at**: Timestamp of posting (`timestamp with time zone`, not null, default current timestamp).
- **repost_id**: Identifier for reposted posts (`bigint`, nullable).
- **user_id**: Identifier of the user who made the post (`bigint`, not null).
- **reply_id**: Identifier for replied posts (`bigint`, nullable).
- **createdAt**: Timestamp of creation (`timestamp with time zone`, not null).
- **updatedAt**: Timestamp of the last update (`timestamp with time zone`, not null).

**Constraints:**
- Primary Key: `Posts_pkey` (`id`).
- Foreign Key: `Posts_user_id_fkey` (`user_id`) references `Users` (`id`).

## Follows Table

- **id**: Auto-incrementing identifier (`bigserial`).
- **follower_user_id**: Identifier of the follower user (`bigint`, not null).
- **following_user_id**: Identifier of the user being followed (`bigint`, not null).
- **followed_at**: Timestamp of when the follow occurred (`timestamp with time zone`, not null, default current timestamp).
- **createdAt**: Timestamp of creation (`timestamp with time zone`, not null).
- **updatedAt**: Timestamp of the last update (`timestamp with time zone`, not null).

**Constraints:**
- Primary Key: `follows_pkey` (`id`).
- Foreign Key: `follows_follower_user_id_fkey` (`follower_user_id`) references `Users` (`id`).
- Foreign Key: `follows_following_user_id_fkey` (`following_user_id`) references `Users` (`id`).
- Check Constraint: `follow_check` (`following_user_id <> follower_user_id`).

## Likes Table

- **id**: Auto-incrementing identifier (`bigserial`).
- **user_id**: Identifier of the user who liked the post (`bigint`, not null).
- **post_id**: Identifier of the liked post (`bigint`, not null).
- **liked_at**: Timestamp of when the like occurred (`timestamp with time zone`, not null, default current timestamp).
- **createdAt**: Timestamp of creation (`timestamp with time zone`, not null).
- **updatedAt**: Timestamp of the last update (`timestamp with time zone`, not null).

**Constraints:**
- Primary Key: `likes_pkey` (`id`).
- Foreign Key: `likes_post_id_fkey` (`post_id`) references `Posts` (`id`).
- Foreign Key: `likes_user_id_fkey` (`user_id`) references `Users` (`id`).


