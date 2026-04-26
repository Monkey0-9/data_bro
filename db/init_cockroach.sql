CREATE DATABASE IF NOT EXISTS nexus_auth;
USE nexus_auth;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email STRING UNIQUE NOT NULL,
    password_hash STRING NOT NULL,
    totp_secret STRING,
    created_at TIMESTAMP DEFAULT current_timestamp()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token STRING UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL
);
