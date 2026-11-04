import { pgTable, uuid, text, integer, bigint, boolean, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  username: text("username").notNull().unique(),
  bio: text("bio").default("").notNull(),
  avatarUrl: text("avatar_url").default("").notNull(),
  role: text("role").default("user").notNull(),
  status: text("status").default("active").notNull(),
  notifyLikes: boolean("notify_likes").default(true).notNull(),
  notifyComments: boolean("notify_comments").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const videos = pgTable("videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(()=>users.id,{onDelete:"cascade"}),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  category: text("category").default("Entertainment").notNull(),
  visibility: text("visibility").default("public").notNull(), // public|unlisted|private
  sourceType: text("source_type").default("upload").notNull(), // upload|youtube
  youtubeId: text("youtube_id").default("").notNull(),
  youtubeChannel: text("youtube_channel").default("").notNull(),
  creatorCountry: text("creator_country").default("").notNull(),
  sourceUrl: text("source_url").default("").notNull(),
  sourcePage: text("source_page").default("").notNull(),
  license: text("license").default("").notNull(),
  attribution: text("attribution").default("").notNull(),
  // Real transcoded quality variants (240p/360p/480p/1080p...) so the player can
  // switch quality like a streaming service instead of offering one flat file.
  renditions: jsonb("renditions").default([]).notNull(),
  fileName: text("file_name").default("").notNull(),
  thumbnailUrl: text("thumbnail_url").default("").notNull(),
  durationSec: integer("duration_sec").default(0).notNull(),
  views: bigint("views", { mode: "number" }).default(0).notNull(),
  isShort: boolean("is_short").default(false).notNull(),
  allowDownload: boolean("allow_download").default(true).notNull(),
  status: text("status").default("ready").notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t)=>[uniqueIndex("videos_youtube_id_unique").on(t.youtubeId).where(sql`${t.sourceType} = 'youtube' AND ${t.youtubeId} <> ''`)]);
export const adminLogs = pgTable("admin_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(()=>users.id,{onDelete:"set null"}),
  action: text("action").notNull(),
  targetType: text("target_type").default("").notNull(),
  targetId: text("target_id").default("").notNull(),
  detail: text("detail").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const youtubeCatalogBatches = pgTable("youtube_catalog_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchIndex: integer("batch_index").notNull().unique(),
  discoveredCount: integer("discovered_count").default(0).notNull(),
  addedCount: integer("added_count").default(0).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});
export const reactions = pgTable("reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  videoId: uuid("video_id").notNull().references(()=>videos.id,{onDelete:"cascade"}),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t)=>[uniqueIndex("reactions_user_video").on(t.userId,t.videoId)]);

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  videoId: uuid("video_id").references(()=>videos.id,{onDelete:"cascade"}),
  postId: uuid("post_id"),
  parentId: uuid("parent_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const commentLikes = pgTable("comment_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  commentId: uuid("comment_id").notNull().references(()=>comments.id,{onDelete:"cascade"}),
}, (t)=>[uniqueIndex("cl_user_comment").on(t.userId,t.commentId)]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  followerId: uuid("follower_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  creatorId: uuid("creator_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t)=>[uniqueIndex("sub_unique").on(t.followerId,t.creatorId)]);

export const playlists = pgTable("playlists", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  title: text("title").notNull(),
  visibility: text("visibility").default("public").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const playlistVideos = pgTable("playlist_videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  playlistId: uuid("playlist_id").notNull().references(()=>playlists.id,{onDelete:"cascade"}),
  videoId: uuid("video_id").notNull().references(()=>videos.id,{onDelete:"cascade"}),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t)=>[uniqueIndex("pv_unique").on(t.playlistId,t.videoId)]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  actorId: uuid("actor_id").references(()=>users.id,{onDelete:"cascade"}),
  type: text("type").notNull(),
  message: text("message").notNull(),
  videoId: uuid("video_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const history = pgTable("history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  videoId: uuid("video_id").notNull().references(()=>videos.id,{onDelete:"cascade"}),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
}, (t)=>[uniqueIndex("hist_unique").on(t.userId,t.videoId)]);

export const viewEvents = pgTable("view_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  videoId: uuid("video_id").notNull().references(()=>videos.id,{onDelete:"cascade"}),
  userId: uuid("user_id"),
  anonId: text("anon_id").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  content: text("content").notNull(),
  imageUrl: text("image_url").default("").notNull(),
  pollQuestion: text("poll_question").default("").notNull(),
  pollOptions: jsonb("poll_options").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const postLikes = pgTable("post_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  postId: uuid("post_id").notNull().references(()=>posts.id,{onDelete:"cascade"}),
}, (t)=>[uniqueIndex("pl_unique").on(t.userId,t.postId)]);
export const pollVotes = pgTable("poll_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  postId: uuid("post_id").notNull().references(()=>posts.id,{onDelete:"cascade"}),
  optionIndex: integer("option_index").notNull(),
}, (t)=>[uniqueIndex("pvote_unique").on(t.userId,t.postId)]);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const liveStreams = pgTable("live_streams", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  visibility: text("visibility").default("public").notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled|live|ended
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const liveMessages = pgTable("live_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  streamId: uuid("stream_id").notNull().references(()=>liveStreams.id,{onDelete:"cascade"}),
  userId: uuid("user_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const blocks = pgTable("blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  blockerId: uuid("blocker_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
  blockedId: uuid("blocked_id").notNull().references(()=>users.id,{onDelete:"cascade"}),
}, (t)=>[uniqueIndex("block_unique").on(t.blockerId,t.blockedId)]);
