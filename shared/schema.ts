import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Modelo Idea
export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  tags: text("tags").notNull().default('[]'),  // Armazenado como JSON string, default array vazio
  author: text("author").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  connections: text("connections").notNull().default('[]'),  // Armazenado como JSON string
});

export const insertIdeaSchema = createInsertSchema(ideas)
  .pick({
    title: true,
    description: true,
    author: true,
  })
  .extend({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    tags: z.array(z.string()).optional().default([]), // Tags são opcionais
  });

export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideas.$inferSelect;

// Comment model
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").notNull().references(() => ideas.id),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(comments)
  .pick({
    ideaId: true,
    author: true,
    content: true,
  })
  .extend({
    content: z.string().min(1),
  });

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Resource model (for suggested resources)
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
});

export type Resource = typeof resources.$inferSelect;
