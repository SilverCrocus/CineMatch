-- PostgreSQL Schema for Cinematch
-- Run this on your Render PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends NextAuth accounts)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friendships
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Cached movies from TMDB/OMDb
CREATE TABLE cached_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tmdb_id INTEGER UNIQUE NOT NULL,
  imdb_id VARCHAR(20),
  title VARCHAR(500) NOT NULL,
  year INTEGER,
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT[] DEFAULT '{}',
  synopsis TEXT,
  runtime INTEGER,
  imdb_rating VARCHAR(10),
  rt_critic_score VARCHAR(10),
  streaming_services TEXT[] DEFAULT '{}',
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'swiping', 'revealed')),
  deck INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  completed BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Swipes
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL,
  liked BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id, movie_id)
);

-- Watched movies history
CREATE TABLE watched_movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  movie_id INTEGER NOT NULL,
  watched_by UUID[] NOT NULL,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_sessions_code ON sessions(code);
CREATE INDEX idx_sessions_host_id ON sessions(host_id);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX idx_swipes_session_id ON swipes(session_id);
CREATE INDEX idx_swipes_user_id ON swipes(user_id);
CREATE INDEX idx_cached_movies_tmdb_id ON cached_movies(tmdb_id);
CREATE INDEX idx_watched_movies_watched_by ON watched_movies USING GIN(watched_by);
