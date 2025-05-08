-- SQL script to create all tables for IpeMindTree database
-- This script recreates the exact structure shown in the screenshots

-- Create sequences for IDs

-- Comments sequence
CREATE SEQUENCE IF NOT EXISTS public.comments_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Idea images sequence
CREATE SEQUENCE IF NOT EXISTS public.idea_images_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Ideas sequence
CREATE SEQUENCE IF NOT EXISTS public.ideas_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Images sequence
CREATE SEQUENCE IF NOT EXISTS public.images_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Import logs sequence
CREATE SEQUENCE IF NOT EXISTS public.import_logs_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Obsidian links sequence
CREATE SEQUENCE IF NOT EXISTS public.obsidian_links_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Obsidian nodes sequence
CREATE SEQUENCE IF NOT EXISTS public.obsidian_nodes_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Resources sequence
CREATE SEQUENCE IF NOT EXISTS public.resources_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Subprompts sequence
CREATE SEQUENCE IF NOT EXISTS public.subprompts_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Users sequence
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 2147483647
    CACHE 1;

-- Create tables

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.comments_id_seq'),
    content TEXT NOT NULL,
    idea_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Idea images table (junction table for ideas and images)
CREATE TABLE IF NOT EXISTS public.idea_images (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.idea_images_id_seq'),
    idea_id INTEGER NOT NULL,
    image_id INTEGER NOT NULL,
    is_main_image BOOLEAN DEFAULT FALSE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ideas table
CREATE TABLE IF NOT EXISTS public.ideas (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.ideas_id_seq'),
    title TEXT NOT NULL,
    content TEXT,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Images table
CREATE TABLE IF NOT EXISTS public.images (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.images_id_seq'),
    url TEXT NOT NULL,
    alt_text TEXT,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    filename TEXT,
    file_size INTEGER,
    mime_type TEXT
);

-- Import logs table
CREATE TABLE IF NOT EXISTS public.import_logs (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.import_logs_id_seq'),
    source TEXT NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER
);

-- Obsidian links table
CREATE TABLE IF NOT EXISTS public.obsidian_links (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.obsidian_links_id_seq'),
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    strength FLOAT
);

-- Obsidian nodes table
CREATE TABLE IF NOT EXISTS public.obsidian_nodes (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.obsidian_nodes_id_seq'),
    title TEXT NOT NULL,
    content TEXT,
    path TEXT,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tags TEXT[],
    metadata JSONB
);

-- Resources table
CREATE TABLE IF NOT EXISTS public.resources (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.resources_id_seq'),
    title TEXT NOT NULL,
    url TEXT,
    content TEXT,
    resource_type TEXT,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tags TEXT[]
);

-- Subprompts table
CREATE TABLE IF NOT EXISTS public.subprompts (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.subprompts_id_seq'),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0
);

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
    id INTEGER PRIMARY KEY DEFAULT nextval('public.users_id_seq'),
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_idea_id ON public.comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_images_idea_id ON public.idea_images(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_images_image_id ON public.idea_images(image_id);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON public.ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_user_id ON public.import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_obsidian_links_source_id ON public.obsidian_links(source_id);
CREATE INDEX IF NOT EXISTS idx_obsidian_links_target_id ON public.obsidian_links(target_id);
CREATE INDEX IF NOT EXISTS idx_obsidian_nodes_user_id ON public.obsidian_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON public.resources(user_id);
CREATE INDEX IF NOT EXISTS idx_subprompts_user_id ON public.subprompts(user_id);

-- Add foreign key constraints
ALTER TABLE public.comments 
    ADD CONSTRAINT fk_comments_idea_id FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;
ALTER TABLE public.comments 
    ADD CONSTRAINT fk_comments_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.idea_images 
    ADD CONSTRAINT fk_idea_images_idea_id FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;
ALTER TABLE public.idea_images 
    ADD CONSTRAINT fk_idea_images_image_id FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;

ALTER TABLE public.ideas 
    ADD CONSTRAINT fk_ideas_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.images 
    ADD CONSTRAINT fk_images_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.import_logs 
    ADD CONSTRAINT fk_import_logs_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.obsidian_links 
    ADD CONSTRAINT fk_obsidian_links_source_id FOREIGN KEY (source_id) REFERENCES public.obsidian_nodes(id) ON DELETE CASCADE;
ALTER TABLE public.obsidian_links 
    ADD CONSTRAINT fk_obsidian_links_target_id FOREIGN KEY (target_id) REFERENCES public.obsidian_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.obsidian_nodes 
    ADD CONSTRAINT fk_obsidian_nodes_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.resources 
    ADD CONSTRAINT fk_resources_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.subprompts 
    ADD CONSTRAINT fk_subprompts_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Grant permissions to neondb_owner (if needed)
ALTER SEQUENCE public.comments_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.idea_images_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.ideas_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.images_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.import_logs_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.obsidian_links_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.obsidian_nodes_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.resources_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.subprompts_id_seq OWNER TO neondb_owner;
ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

ALTER TABLE public.comments OWNER TO neondb_owner;
ALTER TABLE public.idea_images OWNER TO neondb_owner;
ALTER TABLE public.ideas OWNER TO neondb_owner;
ALTER TABLE public.images OWNER TO neondb_owner;
ALTER TABLE public.import_logs OWNER TO neondb_owner;
ALTER TABLE public.obsidian_links OWNER TO neondb_owner;
ALTER TABLE public.obsidian_nodes OWNER TO neondb_owner;
ALTER TABLE public.resources OWNER TO neondb_owner;
ALTER TABLE public.subprompts OWNER TO neondb_owner;
ALTER TABLE public.users OWNER TO neondb_owner;

-- Log completion message
DO $$
BEGIN
    RAISE NOTICE 'Database schema creation completed successfully.';
END $$;
