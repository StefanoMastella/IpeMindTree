import { pgTable, text, serial, integer, timestamp, varchar, jsonb, boolean } from "drizzle-orm/pg-core";
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

// Tabela para armazenar os dados importados do Obsidian
export const obsidianNodes = pgTable("obsidian_nodes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  path: text("path").notNull().unique(),
  tags: text("tags").array(),
  sourceType: text("source_type").default("obsidian").notNull(),
  isImported: boolean("is_imported").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export type ObsidianNode = typeof obsidianNodes.$inferSelect;
export const insertObsidianNodeSchema = createInsertSchema(obsidianNodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertObsidianNode = z.infer<typeof insertObsidianNodeSchema>;

// Tabela para armazenar as conexões entre nós do Obsidian
export const obsidianLinks = pgTable("obsidian_links", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => obsidianNodes.id).notNull(),
  targetId: integer("target_id").references(() => obsidianNodes.id).notNull(),
  type: text("type").default("link").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export type ObsidianLink = typeof obsidianLinks.$inferSelect;
export const insertObsidianLinkSchema = createInsertSchema(obsidianLinks).omit({
  id: true,
  createdAt: true,
});
export type InsertObsidianLink = z.infer<typeof insertObsidianLinkSchema>;

// Tabela para registrar importações
export const importLogs = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  importSource: text("import_source").notNull(),
  nodesCount: integer("nodes_count").notNull(),
  linksCount: integer("links_count").notNull(),
  success: boolean("success").notNull(),
  error: text("error"),
  metadata: jsonb("metadata"),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  importedBy: text("imported_by").notNull()
});

export type ImportLog = typeof importLogs.$inferSelect;
export const insertImportLogSchema = createInsertSchema(importLogs).omit({
  id: true,
  importedAt: true,
});
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
