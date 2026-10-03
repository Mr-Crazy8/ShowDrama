-- ShowDrama Supabase / PostgreSQL Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'free', -- 'free' | 'monthly' | 'yearly'
  subscription_expires_at TIMESTAMPTZ,
  token_balance INTEGER DEFAULT 10 CHECK (token_balance >= 0),
  is_admin BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Dramas (Series) table
CREATE TABLE IF NOT EXISTS dramas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT DEFAULT 'romance', -- 'romance' | 'action' | 'thriller' | 'comedy'
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'published' | 'rejected'
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drama_id UUID REFERENCES dramas(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  token_cost INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending', -- 'pending' | 'published'
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_drama_episode UNIQUE (drama_id, episode_number)
);

-- 4. Episode Access (User Unlocks)
CREATE TABLE IF NOT EXISTS episode_access (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);

-- 5. Token Transactions Ledger
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for rewards/purchases, negative for spending
  reason TEXT NOT NULL, -- 'signup_bonus' | 'ad_watch' | 'token_purchase' | 'episode_unlock' | 'refund'
  episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Subscriptions History
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL, -- 'monthly' | 'yearly'
  stripe_subscription_id TEXT,
  revenuecat_purchase_id TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'cancelled' | 'expired'
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 7. Pipeline Processing Jobs
CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT,
  source_file_path TEXT,
  status TEXT DEFAULT 'queued', -- 'queued' | 'downloading' | 'analyzing' | 'scripting' | 'generating_images' | 'generating_voice' | 'assembling' | 'uploading' | 'done' | 'failed'
  progress_step TEXT,
  error_message TEXT,
  drama_id UUID REFERENCES dramas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 8. Watch History & Progress
CREATE TABLE IF NOT EXISTS watch_history (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ DEFAULT now(),
  progress_seconds INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, episode_id)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_dramas_status_genre ON dramas(status, genre);
CREATE INDEX IF NOT EXISTS idx_episodes_drama_id ON episodes(drama_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON watch_history(user_id);
