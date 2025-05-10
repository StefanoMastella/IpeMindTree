import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  settings: jsonb("settings")
});

// Ideas table
export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

// Images table
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  alt_text: text("alt_text"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  filename: text("filename"),
  file_size: integer("file_size"),
  mime_type: text("mime_type")
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  idea_id: integer("idea_id").references(() => ideas.id),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow()
});

// Idea images table (junction table)
export const idea_images = pgTable("idea_images", {
  id: serial("id").primaryKey(),
  idea_id: integer("idea_id").references(() => ideas.id).notNull(),
  image_id: integer("image_id").references(() => images.id).notNull(),
  is_main_image: boolean("is_main_image").default(false),
  order: integer("order").default(0),
  created_at: timestamp("created_at").defaultNow()
});

// Obsidian nodes table
export const obsidian_nodes = pgTable("obsidian_nodes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  path: text("path"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  tags: text("tags").array(),
  metadata: jsonb("metadata")
});

// Obsidian links table
export const obsidian_links = pgTable("obsidian_links", {
  id: serial("id").primaryKey(),
  source_id: integer("source_id").references(() => obsidian_nodes.id).notNull(),
  target_id: integer("target_id").references(() => obsidian_nodes.id).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  strength: integer("strength")
});

// Resources table
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url"),
  content: text("content"),
  resource_type: text("resource_type"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  tags: text("tags").array()
});

// Subprompts table
export const subprompts = pgTable("subprompts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  usage_count: integer("usage_count").default(0),
  branch: text("branch"),
  keywords: text("keywords").array(),
  active: boolean("active").default(true),
  description: text("description")
});

// Import logs table
export const import_logs = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  success: boolean("success").default(true),
  details: text("details"),
  created_at: timestamp("created_at").defaultNow(),
  user_id: integer("user_id").references(() => users.id)
});

// Chat sessions table
export const chat_sessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  session_id: text("session_id").notNull().unique(),
  title: text("title"),
  user_id: integer("user_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata"),
  is_active: boolean("is_active").default(true)
});

// Chat messages table
export const chat_messages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  message_id: text("message_id").notNull().unique(),
  session_id: text("session_id").references(() => chat_sessions.session_id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  created_at: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata")
});

// Export insert schemas and types
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});

export const insertIdeaSchema = createInsertSchema(ideas).pick({
  title: true,
  content: true,
  user_id: true
});

export const insertChatSessionSchema = createInsertSchema(chat_sessions).pick({
  session_id: true,
  title: true,
  user_id: true
});

export const insertChatMessageSchema = createInsertSchema(chat_messages).pick({
  message_id: true,
  session_id: true,
  content: true,
  role: true
});

export const insertSubpromptSchema = createInsertSchema(subprompts).pick({
  title: true,
  content: true,
  category: true,
  user_id: true,
  usage_count: true,
  branch: true,
  keywords: true,
  active: true,
  description: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertSubprompt = z.infer<typeof insertSubpromptSchema>;

export type User = typeof users.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type Image = typeof images.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type IdeaImage = typeof idea_images.$inferSelect;
export type ObsidianNode = typeof obsidian_nodes.$inferSelect;
export type ObsidianLink = typeof obsidian_links.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Subprompt = typeof subprompts.$inferSelect;
export type ImportLog = typeof import_logs.$inferSelect;
export type ChatSession = typeof chat_sessions.$inferSelect;
export type ChatMessage = typeof chat_messages.$inferSelect;
