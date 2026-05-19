CREATE TABLE users (
    id            VARCHAR(40) PRIMARY KEY,
    email         VARCHAR(190) UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    username      VARCHAR(64) NOT NULL,
    display_name  VARCHAR(64),
    discriminator VARCHAR(4)  NOT NULL,
    avatar_color  VARCHAR(7)  NOT NULL,
    avatar_url    TEXT,
    bio           VARCHAR(190),
    status        VARCHAR(10) NOT NULL DEFAULT 'online',
    created_at    BIGINT      NOT NULL
);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE servers (
    id         VARCHAR(40)  PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    short      VARCHAR(8)   NOT NULL,
    accent     VARCHAR(7)   NOT NULL,
    owner_id   VARCHAR(40)  NOT NULL REFERENCES users(id),
    icon_url   VARCHAR(500),
    banner_url VARCHAR(500),
    created_at BIGINT       NOT NULL
);

CREATE TABLE server_members (
    server_id VARCHAR(40) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id   VARCHAR(40) NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    joined_at BIGINT      NOT NULL,
    PRIMARY KEY (server_id, user_id)
);
CREATE INDEX idx_server_members_user ON server_members(user_id);

CREATE TABLE categories (
    id        VARCHAR(40) PRIMARY KEY,
    server_id VARCHAR(40) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name      VARCHAR(64) NOT NULL,
    position  INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX idx_categories_server ON categories(server_id);

CREATE TABLE channels (
    id          VARCHAR(40) PRIMARY KEY,
    server_id   VARCHAR(40) NOT NULL REFERENCES servers(id)    ON DELETE CASCADE,
    category_id VARCHAR(40) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    kind        VARCHAR(10) NOT NULL,
    topic       VARCHAR(300),
    position    INTEGER     NOT NULL DEFAULT 0
);
CREATE INDEX idx_channels_server ON channels(server_id);

CREATE TABLE dms (
    id         VARCHAR(40) PRIMARY KEY,
    is_group   BOOLEAN     NOT NULL DEFAULT FALSE,
    group_name VARCHAR(120),
    created_at BIGINT      NOT NULL
);

CREATE TABLE dm_participants (
    dm_id   VARCHAR(40) NOT NULL REFERENCES dms(id)   ON DELETE CASCADE,
    user_id VARCHAR(40) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (dm_id, user_id)
);
CREATE INDEX idx_dm_participants_user ON dm_participants(user_id);

CREATE TABLE messages (
    id          VARCHAR(40) PRIMARY KEY,
    channel_id  VARCHAR(40) NOT NULL,
    author_id   VARCHAR(40) NOT NULL REFERENCES users(id),
    content     TEXT        NOT NULL,
    created_at  BIGINT      NOT NULL,
    edited_at   BIGINT,
    deleted_at  BIGINT,
    reply_to_id VARCHAR(40),
    attachments TEXT,
    mentions    TEXT,
    pinned_at   BIGINT,
    kind        VARCHAR(16) NOT NULL DEFAULT 'default'
);
CREATE INDEX idx_messages_channel ON messages(channel_id, created_at);
CREATE INDEX idx_messages_pinned  ON messages(channel_id, pinned_at) WHERE pinned_at IS NOT NULL;

CREATE TABLE message_reactions (
    message_id VARCHAR(40) NOT NULL,
    user_id    VARCHAR(40) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji      VARCHAR(80) NOT NULL,
    created_at BIGINT      NOT NULL,
    PRIMARY KEY (message_id, user_id, emoji)
);
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);

CREATE TABLE friendships (
    user_id    VARCHAR(40) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id  VARCHAR(40) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL,
    created_at BIGINT      NOT NULL,
    PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE invites (
    code        VARCHAR(16) PRIMARY KEY,
    server_id   VARCHAR(40) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    inviter_id  VARCHAR(40) NOT NULL REFERENCES users(id),
    created_at  BIGINT      NOT NULL,
    expires_at  BIGINT,
    uses        INTEGER     NOT NULL DEFAULT 0,
    max_uses    INTEGER
);
CREATE INDEX idx_invites_server ON invites(server_id);

CREATE TABLE roles (
    id          VARCHAR(40) PRIMARY KEY,
    server_id   VARCHAR(40) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    color       VARCHAR(7)  NOT NULL DEFAULT '#9aa3a1',
    permissions INTEGER     NOT NULL DEFAULT 0,
    position    INTEGER     NOT NULL DEFAULT 0,
    is_everyone BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_roles_server ON roles(server_id);

CREATE TABLE member_roles (
    server_id VARCHAR(40) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id   VARCHAR(40) NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    role_id   VARCHAR(40) NOT NULL REFERENCES roles(id)   ON DELETE CASCADE,
    PRIMARY KEY (server_id, user_id, role_id)
);
CREATE INDEX idx_member_roles_user ON member_roles(server_id, user_id);

CREATE TABLE read_state (
    user_id      VARCHAR(40) NOT NULL,
    channel_id   VARCHAR(40) NOT NULL,
    last_read_at BIGINT      NOT NULL,
    PRIMARY KEY (user_id, channel_id)
);
CREATE INDEX idx_read_state_user ON read_state(user_id);

CREATE TABLE channel_notifications (
    user_id    VARCHAR(40) NOT NULL,
    channel_id VARCHAR(40) NOT NULL,
    level      VARCHAR(10) NOT NULL,
    PRIMARY KEY (user_id, channel_id)
);

CREATE TABLE server_bans (
    server_id  VARCHAR(40) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id    VARCHAR(40) NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    banned_by  VARCHAR(40) NOT NULL REFERENCES users(id),
    reason     VARCHAR(300),
    created_at BIGINT      NOT NULL,
    PRIMARY KEY (server_id, user_id)
);
CREATE INDEX idx_server_bans_user ON server_bans(user_id);
