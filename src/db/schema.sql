PRAGMA foreign_keys = ON;

-- =========================================================
-- ПОЛЬЗОВАТЕЛИ И РОЛИ
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active     BOOLEAN      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);

CREATE TABLE IF NOT EXISTS roles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        VARCHAR(30) NOT NULL UNIQUE,
    description TEXT
);

INSERT OR IGNORE INTO roles (name, description) VALUES
    ('user',      'Обычный пользователь'),
    ('moderator', 'Модератор тем'),
    ('admin',     'Администратор');

CREATE TABLE IF NOT EXISTS user_roles (
    user_id     INTEGER NOT NULL,
    role_id     INTEGER NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- =========================================================
-- ТЕМЫ
-- =========================================================

CREATE TABLE IF NOT EXISTS themes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id     INTEGER      NOT NULL,
    title         VARCHAR(100) NOT NULL,
    description   TEXT,
    status        TEXT         NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','pending','approved','rejected')),
    reject_reason TEXT,
    preview_image VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at  TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_themes_status  ON themes(status);
CREATE INDEX IF NOT EXISTS idx_themes_author  ON themes(author_id);
CREATE INDEX IF NOT EXISTS idx_themes_title   ON themes(title);
CREATE INDEX IF NOT EXISTS idx_themes_created ON themes(created_at);

-- =========================================================
-- ЭЛЕМЕНТЫ ТЕМ (СПРАЙТЫ)
-- =========================================================

CREATE TABLE IF NOT EXISTS theme_elements (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_id     INTEGER NOT NULL,
    element_type TEXT    NOT NULL
                 CHECK (element_type IN (
                    'background','play_button','pause_button',
                    'next_button','prev_button','volume',
                    'progress_bar','album_art','menu_icon','text_label'
                 )),
    sprite_url   VARCHAR(255) NOT NULL,
    pos_x        INTEGER NOT NULL DEFAULT 0,
    pos_y        INTEGER NOT NULL DEFAULT 0,
    width        INTEGER NOT NULL DEFAULT 0,
    height       INTEGER NOT NULL DEFAULT 0,
    z_index      INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
    UNIQUE (theme_id, element_type)
);

CREATE INDEX IF NOT EXISTS idx_elements_theme ON theme_elements(theme_id);

-- =========================================================
-- МОДЕРАЦИЯ
-- =========================================================

CREATE TABLE IF NOT EXISTS moderation_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_id     INTEGER   NOT NULL,
    moderator_id INTEGER   NOT NULL,
    action       TEXT      NOT NULL CHECK (action IN ('approved','rejected')),
    comment      TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (theme_id)     REFERENCES themes(id) ON DELETE CASCADE,
    FOREIGN KEY (moderator_id) REFERENCES users(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_modlog_theme ON moderation_log(theme_id);

-- =========================================================
-- ТЕГИ
-- =========================================================

CREATE TABLE IF NOT EXISTS tags (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS theme_tags (
    theme_id INTEGER NOT NULL,
    tag_id   INTEGER NOT NULL,
    PRIMARY KEY (theme_id, tag_id),
    FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)   REFERENCES tags(id)   ON DELETE CASCADE
);

-- =========================================================
-- ТРИГГЕРЫ
-- =========================================================

DROP TRIGGER IF EXISTS trg_themes_updated_at;
CREATE TRIGGER trg_themes_updated_at
AFTER UPDATE ON themes
FOR EACH ROW
BEGIN
    UPDATE themes
       SET updated_at = CURRENT_TIMESTAMP
     WHERE id = OLD.id;
END;

DROP TRIGGER IF EXISTS trg_themes_published;
CREATE TRIGGER trg_themes_published
AFTER UPDATE OF status ON themes
FOR EACH ROW
WHEN NEW.status = 'approved' AND OLD.status != 'approved'
BEGIN
    UPDATE themes
       SET published_at = CURRENT_TIMESTAMP
     WHERE id = NEW.id;
END;
