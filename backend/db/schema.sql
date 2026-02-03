-- schema.sql (safe to run multiple times)
-- DB is created/selected in initDb.js



-- schema.sql
-- Safe to run multiple times
-- Database is created/selected in initDb.js

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name  VARCHAR(100) NOT NULL DEFAULT '',

  -- Optional user profile fields (extend as needed)
  default_hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  default_city VARCHAR(120) NOT NULL DEFAULT '',

  role VARCHAR(50) NOT NULL DEFAULT 'student',
  terms TINYINT(1) NOT NULL DEFAULT 0,
  acquisition JSON NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- =========================
-- RBAC NORMALIZATION
-- =========================

-- Make default role = worker
ALTER TABLE users
  MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'worker';

-- Normalize existing roles
UPDATE users
SET role = 'worker'
WHERE role = 'student' OR role IS NULL;

-- =========================
-- EVENTS (Shifts)
-- =========================
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  date DATE NOT NULL,
  image TEXT NOT NULL,

  -- Shift details
  city VARCHAR(120) NULL,
  start_time TIME NULL,
  end_time TIME NULL,

  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  travel DECIMAL(10,2) NOT NULL DEFAULT 0,

  day_of_week VARCHAR(16) NULL,
  hours_worked DECIMAL(6,2) NOT NULL DEFAULT 0,
  shift_total DECIMAL(10,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_events_user_id (user_id),
  INDEX idx_events_user_date (user_id, date),

  CONSTRAINT fk_events_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- FORUM POSTS (Shared across all users)
-- =========================
CREATE TABLE IF NOT EXISTS forum_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,

  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_forum_posts_created_at (created_at),
  INDEX idx_forum_posts_user_id (user_id),

  CONSTRAINT fk_forum_posts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);


-- =========================
-- SHIFT SWAPS (Shared board, weekly window Sat 20:00)
-- =========================
CREATE TABLE IF NOT EXISTS shift_swaps (
  id INT AUTO_INCREMENT PRIMARY KEY,

  user_id VARCHAR(36) NOT NULL,

  message TEXT NOT NULL,

  -- The actual shift date/time (used to hide posts when it’s already in the past)
  shift_start_at DATETIME NOT NULL,

  -- Board window boundaries (computed by server: Sat 20:00 -> Sat 20:00)
  week_start_at DATETIME NOT NULL,
  week_end_at   DATETIME NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_shift_swaps_week (week_start_at),
  INDEX idx_shift_swaps_shift (shift_start_at),
  INDEX idx_shift_swaps_week_shift (week_start_at, shift_start_at),

  CONSTRAINT fk_shift_swaps_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);



-- =========================
-- WORKSPACES
-- =========================
CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  industry_type ENUM('office','casino','restaurant','other') NOT NULL DEFAULT 'other',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jerusalem',
  created_by_admin_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_workspaces_created_by (created_by_admin_id),

  CONSTRAINT fk_workspaces_created_by
    FOREIGN KEY (created_by_admin_id) REFERENCES users(id)
    ON DELETE RESTRICT
);

-- =========================
-- SHIFT TEMPLATES (per workspace)
-- =========================
-- CREATE TABLE IF NOT EXISTS shift_templates (
--   id VARCHAR(36) PRIMARY KEY,
--   workspace_id VARCHAR(36) NOT NULL,

--   name VARCHAR(50) NOT NULL,
--   start_time TIME NOT NULL,
--   end_time TIME NOT NULL,

--   required_workers INT NOT NULL DEFAULT 1,
--   is_active TINYINT(1) NOT NULL DEFAULT 1,

--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   INDEX idx_shift_templates_ws (workspace_id),
--   INDEX idx_shift_templates_ws_time (workspace_id, start_time),

--   CONSTRAINT fk_shift_templates_workspace
--     FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
--     ON DELETE CASCADE
-- );



-- =========================
-- WORKSPACE OPERATING HOURS
-- =========================

CREATE TABLE IF NOT EXISTS workspace_operating_hours (
  id VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL, -- 0=Sun ... 6=Sat

  is_closed TINYINT(1) NOT NULL DEFAULT 0,
  open_time TIME NULL,
  close_time TIME NULL, 

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_workspace_day (workspace_id, day_of_week),

  CONSTRAINT fk_hours_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE CASCADE
);




-- availability_submissions - worker
CREATE TABLE IF NOT EXISTS availability_submissions (
  id VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  week_start_date DATE NOT NULL,

  status ENUM('draft','submitted') NOT NULL DEFAULT 'submitted',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_user_workspace_week (user_id, workspace_id, week_start_date),
  INDEX idx_workspace_week (workspace_id, week_start_date),
  INDEX idx_user_week (user_id, week_start_date),

  CONSTRAINT fk_av_sub_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_av_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);




CREATE TABLE IF NOT EXISTS daily_shift_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,

  workspace_id VARCHAR(36) NOT NULL,
  day_of_week TINYINT NOT NULL, -- 0=Sun ... 6=Sat

  name VARCHAR(80) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  sort_order INT NOT NULL DEFAULT 0,
  required_count INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_dst_workspace_day (workspace_id, day_of_week),
  INDEX idx_dst_workspace_active (workspace_id, is_active),

  CONSTRAINT fk_dst_workspace
    FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE
);


-- availability_slots - worker
-- availability_items - template-based
CREATE TABLE IF NOT EXISTS availability_items (
  id VARCHAR(36) PRIMARY KEY,

  submission_id VARCHAR(36) NOT NULL,
  day_date DATE NOT NULL,

  -- MUST match daily_shift_templates.id
  shift_template_id INT NOT NULL,

  is_available TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_av_item (submission_id, day_date, shift_template_id),
  INDEX idx_av_item_submission (submission_id),
  INDEX idx_av_item_template (shift_template_id),

  CONSTRAINT fk_av_item_submission
    FOREIGN KEY (submission_id)
    REFERENCES availability_submissions(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_av_item_daily_template
    FOREIGN KEY (shift_template_id)
    REFERENCES daily_shift_templates(id)
    ON DELETE CASCADE
);


-- CREATE TABLE IF NOT EXISTS shift_templates (
--   id INT AUTO_INCREMENT PRIMARY KEY,

--   workspace_id VARCHAR(36) NOT NULL,

--   name VARCHAR(80) NOT NULL,
--   start_time TIME NOT NULL,
--   end_time TIME NOT NULL,

--   sort_order INT NOT NULL DEFAULT 0,
--   required_count INT NOT NULL DEFAULT 1,
--   is_active TINYINT(1) NOT NULL DEFAULT 1,

--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

--   INDEX idx_shift_templates_workspace (workspace_id),

--   CONSTRAINT fk_shift_templates_workspace
--     FOREIGN KEY (workspace_id)
--     REFERENCES workspaces(id)
--     ON DELETE CASCADE
-- );




-- Represents an actual scheduled shift for a specific week and day.
-- This table is the admin’s decision layer: it materializes daily shift templates
-- into real shifts for a given week (draft or published),
-- independent of worker availability submissions.
CREATE TABLE IF NOT EXISTS scheduled_shifts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  workspace_id VARCHAR(36) NOT NULL,
  week_start_date DATE NOT NULL,
  day_date DATE NOT NULL,
  shift_template_id INT NOT NULL,

  required_count INT NOT NULL,

  status ENUM('draft', 'published') DEFAULT 'draft',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_workspace_week_day_shift (
    workspace_id,
    week_start_date,
    day_date,
    shift_template_id
  ),

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  FOREIGN KEY (shift_template_id) REFERENCES daily_shift_templates(id)
);


-- Represents the final assignment of workers to a scheduled shift.
-- This table stores the admin’s authoritative decision of who actually works,
-- after reviewing worker availability.
CREATE TABLE IF NOT EXISTS scheduled_shift_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  scheduled_shift_id INT UNSIGNED NOT NULL,
  worker_id VARCHAR(36) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_shift_worker (scheduled_shift_id, worker_id),

  CONSTRAINT fk_ssa_shift
    FOREIGN KEY (scheduled_shift_id)
    REFERENCES scheduled_shifts(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_ssa_worker
    FOREIGN KEY (worker_id)
    REFERENCES users(id)
);



CREATE TABLE IF NOT EXISTS workspace_admins (
  id VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  admin_id VARCHAR(36) NOT NULL,
  role ENUM('owner', 'admin') NOT NULL DEFAULT 'admin',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_workspace_admin (workspace_id, admin_id),
  KEY idx_workspace_admins_workspace (workspace_id),
  KEY idx_workspace_admins_admin (admin_id)
);


-- =========================
-- WORKSPACE WORKERS (many-to-many)
-- =========================
-- Purpose:
-- - Links workers to workspaces (many-to-many).
-- - A worker can belong to multiple workspaces.
-- - Workspace admins are managed separately (workspace_admins).
-- - Used to control access to submissions, schedules, and shifts per workspace.

CREATE TABLE IF NOT EXISTS workspace_workers (
  id VARCHAR(36) PRIMARY KEY,

  workspace_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,

  -- Optional role inside the workspace (future-proof)
  role ENUM('worker','supervisor') NOT NULL DEFAULT 'worker',

  -- Worker status in the workspace
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_workspace_worker (workspace_id, worker_id),
  KEY idx_workspace_workers_workspace (workspace_id),
  KEY idx_workspace_workers_worker (worker_id),

  CONSTRAINT fk_workspace_workers_workspace
    FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_workspace_workers_worker
    FOREIGN KEY (worker_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);


-- Purpose:
-- Tracks whether a workspace’s weekly schedule is published or still a draft,
-- including basic publish metadata.
CREATE TABLE IF NOT EXISTS scheduled_weeks (
  id VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  week_start_date DATE NOT NULL,

  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  published_by_user_id VARCHAR(36) NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_scheduled_weeks (workspace_id, week_start_date),
  KEY idx_scheduled_weeks_workspace (workspace_id),

  CONSTRAINT fk_scheduled_weeks_workspace
    FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_scheduled_weeks_published_by
    FOREIGN KEY (published_by_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);
