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






























-- working with forum:

-- CREATE TABLE IF NOT EXISTS users (
--   id VARCHAR(36) PRIMARY KEY,
--   email VARCHAR(255) NOT NULL UNIQUE,
--   password_hash VARCHAR(255) NOT NULL,
--   first_name VARCHAR(100) NOT NULL DEFAULT '',
--   last_name VARCHAR(100) NOT NULL DEFAULT '',
--   role VARCHAR(50) NOT NULL DEFAULT 'student',
--   terms TINYINT(1) NOT NULL DEFAULT 0,
--   acquisition JSON NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE IF NOT EXISTS events (
--   id VARCHAR(36) PRIMARY KEY,
--   user_id VARCHAR(36) NOT NULL,
--   title VARCHAR(255) NOT NULL,
--   description TEXT NOT NULL,
--   date DATE NOT NULL,
--   image TEXT NOT NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

--   INDEX idx_events_user_id (user_id),

--   CONSTRAINT fk_events_user
--     FOREIGN KEY (user_id) REFERENCES users(id)
--     ON DELETE CASCADE
-- );




-- CREATE TABLE IF NOT EXISTS forum_posts (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id VARCHAR(36) NOT NULL,
--   title VARCHAR(255) NOT NULL,
--   body TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

--   INDEX idx_forum_posts_created_at (created_at),
--   INDEX idx_forum_posts_user_id (user_id),

--   CONSTRAINT fk_forum_posts_user
--     FOREIGN KEY (user_id) REFERENCES users(id)
--     ON DELETE CASCADE
-- );


