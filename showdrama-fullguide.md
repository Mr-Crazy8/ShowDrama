# ShowDrama — Full System Guide & Claude Code Prompt

---

## 1. PROJECT OVERVIEW

A short drama streaming SaaS platform with:

- **User Mobile App** (iOS + Android) — public app where users watch AI-generated short dramas
- **Admin Mobile App** (iOS + Android) — private app where you control content, trigger AI generation, review and publish
- **Backend API** — shared server handling auth, content, tokens, payments
- **AI Pipeline Service** — Python service that takes a source video and generates a new original drama

---

## 2. FREE-FIRST RESOURCE MAP

Every tool below has a free tier sufficient to build and launch an MVP.

### Infrastructure & Hosting

| Service | What For | Free Tier |
|---|---|---|
| **Railway** | Host Node.js API + Python pipeline | $5 free credit/month, enough for dev |
| **Supabase** | PostgreSQL database + Auth | 500MB DB, 50k auth users free |
| **Cloudflare R2** | Video + image storage | 10GB free, no egress fees |
| **Redis Cloud** | Job queue (BullMQ) | 30MB free (enough for job queue) |
| **Vercel** | If you ever add a web dashboard | Free hobby tier |

### AI Services (all have free tiers)

| Service | What For | Free Tier |
|---|---|---|
| **Claude API (Anthropic)** | Script generation | $5 free credits on signup |
| **OpenRouter** | Route to cheapest AI model | Free credits, pay-per-use after |
| **Groq** | Fast LLM inference (Llama 3) | Free, rate-limited |
| **Whisper (local)** | Transcribe source video audio | Completely free, runs locally |
| **Stable Diffusion (local)** | Generate scene images | Free if self-hosted via Automatic1111 |
| **Replicate** | Run SD/Flux in cloud | Free credits on signup |
| **Coqui TTS** | Text-to-speech voices | Completely free, open source |
| **ElevenLabs** | Higher quality TTS | 10k characters/month free |

### Mobile & Payments

| Service | What For | Free Tier |
|---|---|---|
| **Expo** | React Native build + deploy | Free |
| **Expo EAS** | Build iOS/Android binaries | Free tier (limited builds/month) |
| **Stripe** | Web payments / token purchase | No monthly fee, 2.9%+30¢ per charge |
| **RevenueCat** | Mobile in-app subscriptions | Free up to $2.5k monthly revenue |
| **Google AdMob** | Rewarded ads for tokens | Free, you earn per ad view |
| **Firebase** | Push notifications | Free Spark plan |

### Video Processing

| Tool | What For | Cost |
|---|---|---|
| **ffmpeg** | All video assembly, frame extraction | Completely free, open source |
| **PySceneDetect** | Scene detection in source video | Completely free, open source |
| **yt-dlp** | Download source videos by URL | Completely free, open source |

---

## 3. ARCHITECTURE DIAGRAM

```
┌──────────────────────┐     ┌──────────────────────┐
│   USER MOBILE APP    │     │   ADMIN MOBILE APP   │
│   (Expo RN)          │     │   (Expo RN, private) │
│                      │     │                      │
│ - Browse dramas      │     │ - Paste source URL   │
│ - Watch episodes     │     │ - Trigger AI pipeline│
│ - Buy tokens         │     │ - Review & approve   │
│ - Watch ads          │     │ - Manage users       │
│ - Subscribe          │     │ - View stats         │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           └──────────┬─────────────────┘
                      │ HTTPS REST API
         ┌────────────▼────────────────────┐
         │         BACKEND API             │
         │      Node.js + Express          │
         │      Supabase PostgreSQL        │
         │      Redis (BullMQ queues)      │
         │      Hosted on Railway          │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │       AI PIPELINE SERVICE       │
         │       Python + FastAPI          │
         │                                 │
         │  1. yt-dlp: download source     │
         │  2. ffmpeg: extract frames      │
         │  3. Whisper: transcribe audio   │
         │  4. PySceneDetect: scene split  │
         │  5. Claude/Groq: write script   │
         │  6. Replicate/SD: gen images    │
         │  7. Coqui TTS: gen voices       │
         │  8. ffmpeg: assemble video      │
         │  9. Upload to R2                │
         │  10. Notify backend             │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │      CLOUDFLARE R2              │
         │  - Generated episode videos     │
         │  - Scene images                 │
         │  - Thumbnails                   │
         └─────────────────────────────────┘
```

---

## 4. DATABASE SCHEMA (Supabase / PostgreSQL)

```sql
-- Users (Supabase Auth handles passwords)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  subscription_status TEXT DEFAULT 'free', -- free | monthly | yearly
  subscription_expires_at TIMESTAMPTZ,
  token_balance INTEGER DEFAULT 10,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dramas (series)
CREATE TABLE dramas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT, -- romance | action | thriller | comedy
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending', -- pending | published | rejected
  source_url TEXT, -- original video that was used as inspiration
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Episodes
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drama_id UUID REFERENCES dramas(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  video_url TEXT, -- R2 URL
  duration_seconds INTEGER,
  token_cost INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending', -- pending | published
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Episode access (which users unlocked which episodes)
CREATE TABLE episode_access (
  user_id UUID REFERENCES users(id),
  episode_id UUID REFERENCES episodes(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);

-- Token transactions
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL, -- positive = earned, negative = spent
  reason TEXT, -- purchase | ad_watch | episode_unlock | refund
  episode_id UUID REFERENCES episodes(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions (tracked separately for history)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan TEXT NOT NULL, -- monthly | yearly
  stripe_subscription_id TEXT,
  revenuecat_purchase_id TEXT,
  status TEXT DEFAULT 'active', -- active | cancelled | expired
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Pipeline jobs
CREATE TABLE pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT,
  source_file_path TEXT,
  status TEXT DEFAULT 'queued', -- queued | analyzing | scripting | generating_images | generating_voice | assembling | uploading | done | failed
  progress_step TEXT,
  error_message TEXT,
  drama_id UUID REFERENCES dramas(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Watch history
CREATE TABLE watch_history (
  user_id UUID REFERENCES users(id),
  episode_id UUID REFERENCES episodes(id),
  watched_at TIMESTAMPTZ DEFAULT now(),
  progress_seconds INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, episode_id)
);
```

---

## 5. BACKEND API — FULL ROUTE LIST

```
AUTH
POST   /auth/register          Register with email + password
POST   /auth/login             Login, returns JWT
POST   /auth/refresh           Refresh JWT

USERS
GET    /users/me               Get own profile + token balance + sub status
PATCH  /users/me               Update username, avatar

DRAMAS
GET    /dramas                 Paginated list, filter by genre, sort by newest/trending
GET    /dramas/:id             Drama detail + episodes (with lock status per user)
GET    /dramas/search?q=       Search by title

EPISODES
GET    /episodes/:id           Episode detail + video URL (only if access granted)
POST   /episodes/:id/unlock    Deduct tokens, grant access

TOKENS
GET    /tokens/balance         Current balance
POST   /tokens/earn-from-ad   Add 2 tokens after AdMob rewarded ad
POST   /tokens/purchase        Create Stripe checkout for token pack

SUBSCRIPTIONS
POST   /subscriptions/create   Create Stripe checkout for monthly/yearly
POST   /subscriptions/cancel   Cancel active subscription
GET    /subscriptions/status   Current subscription info

WEBHOOKS
POST   /webhooks/stripe        Handle Stripe events (signature verified)
POST   /webhooks/revenuecat    Handle RevenueCat events (mobile purchases)

ADMIN (all require is_admin = true)
GET    /admin/stats            Users, revenue, dramas, jobs counts
GET    /admin/users            Paginated user list
PATCH  /admin/users/:id        Update subscription, token balance, ban status
GET    /admin/dramas           All dramas including pending
PATCH  /admin/dramas/:id       Update status (publish/reject), edit metadata
POST   /admin/pipeline/start   Submit source URL or upload for AI generation
GET    /admin/pipeline/:id     Poll job status + current step
GET    /admin/pipeline         List all jobs (queued, running, done, failed)
POST   /admin/pipeline/:id/retry  Retry failed job

INTERNAL (pipeline → backend, not exposed publicly)
POST   /internal/pipeline/complete  Pipeline notifies backend when job finishes
```

---

## 6. AI PIPELINE — STEP BY STEP LOGIC

```python
# pipeline/jobs/generate_drama.py

async def run_pipeline(job_id: str, source_url: str = None, source_file: str = None):

    update_status(job_id, "downloading")
    # If URL given, download with yt-dlp
    # yt-dlp works with YouTube, TikTok, Instagram, direct mp4 links
    video_path = download_or_use_upload(source_url, source_file)

    update_status(job_id, "analyzing")
    # Extract 1 frame per second with ffmpeg
    frames = extract_frames(video_path, fps=1)
    # Transcribe audio with Whisper (local, free)
    transcript = whisper_transcribe(video_path)
    # Detect scene changes
    scenes = detect_scenes(video_path)
    # Send frames + transcript to Claude/Groq for analysis
    analysis = analyze_with_llm(frames, transcript, scenes)
    # analysis = { genre, setting, characters, plot_summary, emotional_arc }

    update_status(job_id, "scripting")
    # Generate new original script based on analysis
    script = generate_script(analysis)
    # script = { title, description, scenes: [{ setting, characters_present,
    #             dialogue: [{ character, line }], visual_description, emotion }] }

    update_status(job_id, "generating_images")
    character_references = {}
    scene_images = []
    for scene in script["scenes"]:
        # Generate scene image via Replicate (Flux or SDXL)
        img = generate_scene_image(
            prompt=scene["visual_description"],
            character_refs=character_references,
            emotion=scene["emotion"]
        )
        scene_images.append(img)

    update_status(job_id, "generating_voice")
    # Assign consistent voice per character (Coqui TTS, free)
    voice_map = assign_voices(script["characters"])
    audio_clips = []
    for scene in script["scenes"]:
        scene_audio = []
        for line in scene["dialogue"]:
            audio = coqui_tts(text=line["line"], voice=voice_map[line["character"]])
            scene_audio.append(audio)
        audio_clips.append(scene_audio)

    update_status(job_id, "assembling")
    # ffmpeg: for each scene, show image for total audio duration
    # overlay dialogue audio clips sequentially
    # burn in subtitles from dialogue text
    # concatenate all scenes into final MP4
    final_video = assemble_video(scene_images, audio_clips, script)

    update_status(job_id, "uploading")
    # Upload to Cloudflare R2
    r2_url = upload_to_r2(final_video, job_id)

    # Write drama + episode to DB, status = pending_review
    drama_id = create_drama_record(script["title"], script["description"], r2_url)

    # Notify backend
    notify_backend_complete(job_id, drama_id, r2_url)
    update_status(job_id, "done")
```

---

## 7. TOKEN ECONOMY LOGIC

```
FREE USER:
  - Starts with 10 tokens
  - Each episode costs 3 tokens to unlock
  - Watch a 30-second rewarded ad → earn 2 tokens
  - Buy token packs:
      10 tokens  → $0.99
      50 tokens  → $3.99
      100 tokens → $6.99

SUBSCRIBER:
  - Monthly: $4.99/month → unlimited watching, no tokens needed
  - Yearly: $39.99/year → unlimited watching + 50 bonus tokens/month

AD FLOW (AdMob Rewarded):
  1. User taps "Watch Ad for Tokens" in the app
  2. AdMob rewarded ad plays (30s, can't skip)
  3. On ad completion callback → app calls POST /tokens/earn-from-ad
  4. Backend adds 2 tokens to user balance
  5. (Optional) rate limit: max 5 ad views per day per user
```

---

## 8. FOLDER STRUCTURE

```
showdrama/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── dramas.js
│   │   │   ├── episodes.js
│   │   │   ├── tokens.js
│   │   │   ├── subscriptions.js
│   │   │   ├── webhooks.js
│   │   │   ├── admin.js
│   │   │   └── internal.js
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT verify
│   │   │   └── adminOnly.js     # Check is_admin
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   ├── stripe.js
│   │   │   ├── redis.js
│   │   │   └── r2.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
├── pipeline/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── jobs/
│   │   │   ├── generate_drama.py
│   │   │   ├── downloader.py    # yt-dlp wrapper
│   │   │   ├── analyzer.py      # ffmpeg frames + Whisper + LLM analysis
│   │   │   ├── scripter.py      # LLM script generation
│   │   │   ├── image_gen.py     # Replicate / local SD
│   │   │   ├── voice_gen.py     # Coqui TTS
│   │   │   └── assembler.py     # ffmpeg video assembly
│   │   └── lib/
│   │       ├── r2.py
│   │       ├── db.py
│   │       └── llm.py           # OpenRouter / Groq / Claude wrapper
│   ├── requirements.txt
│   └── .env.example
│
├── mobile-user/                 # Expo React Native — public app
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx        # Home
│   │   │   ├── search.tsx       # Search
│   │   │   └── wallet.tsx       # Tokens + subscription
│   │   ├── drama/[id].tsx       # Drama detail
│   │   ├── episode/[id].tsx     # Video player
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   └── profile.tsx
│   ├── store/
│   │   ├── authStore.ts         # Zustand: user + JWT
│   │   └── walletStore.ts       # Zustand: token balance
│   ├── lib/
│   │   └── api.ts               # Axios instance with JWT interceptor
│   └── app.json
│
├── mobile-admin/                # Expo React Native — private admin app
│   ├── app/
│   │   ├── login.tsx
│   │   ├── dashboard.tsx        # Stats overview
│   │   ├── generate.tsx         # Paste URL or upload video, trigger pipeline
│   │   ├── queue.tsx            # Live pipeline jobs list
│   │   ├── review/[id].tsx      # Watch episode, approve or reject
│   │   ├── dramas.tsx           # Published dramas list
│   │   └── users.tsx            # User management
│   ├── store/
│   │   └── adminStore.ts
│   ├── lib/
│   │   └── api.ts
│   └── app.json
│
└── docker-compose.yml
```

---

## 9. ENVIRONMENT VARIABLES

### backend/.env.example
```env
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-random-secret-min-32-chars

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# RevenueCat (webhook validation)
REVENUECAT_WEBHOOK_AUTH_HEADER=your-revenuecat-auth-header

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=showdrama
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Redis
REDIS_URL=redis://localhost:6379

# Internal pipeline secret
PIPELINE_INTERNAL_SECRET=shared-secret-between-backend-and-pipeline

# Pipeline service URL
PIPELINE_SERVICE_URL=http://localhost:8000
```

### pipeline/.env.example
```env
PORT=8000

# Database (direct Supabase Postgres connection)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=showdrama
R2_PUBLIC_URL=https://your-bucket.r2.dev

# LLM — use OpenRouter to switch between free/cheap models
OPENROUTER_API_KEY=sk-or-...

# OR direct Claude
ANTHROPIC_API_KEY=sk-ant-...

# Image generation
REPLICATE_API_TOKEN=r8_...

# TTS — Coqui is local (free), ElevenLabs is cloud
USE_LOCAL_TTS=true
ELEVENLABS_API_KEY=      # leave empty if using Coqui

# Redis
REDIS_URL=redis://localhost:6379

# Backend internal webhook
BACKEND_URL=http://localhost:3000
PIPELINE_INTERNAL_SECRET=shared-secret-between-backend-and-pipeline
```

### mobile-user/.env.example
```env
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-...
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_...
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_...
```

### mobile-admin/.env.example
```env
EXPO_PUBLIC_API_URL=https://your-backend.railway.app
EXPO_PUBLIC_ADMIN_SECRET=extra-admin-pin  # optional secondary lock
```

---

## 10. DOCKER COMPOSE (local development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: showdrama
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file: ./backend/.env
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  pipeline:
    build: ./pipeline
    ports:
      - "8000:8000"
    env_file: ./pipeline/.env
    depends_on:
      - postgres
      - redis
    volumes:
      - ./pipeline:/app
      - pipeline_tmp:/tmp

volumes:
  postgres_data:
  pipeline_tmp:
```

---

## 11. FULL CLAUDE CODE PROMPT

Paste this entire block into Claude Code to generate the project from start to finish.

---

```
You are building "ShowDrama" — a short drama streaming SaaS platform.

## WHAT YOU ARE BUILDING

Four parts:
1. backend/        — Node.js + Express REST API, PostgreSQL via Supabase
2. pipeline/       — Python + FastAPI AI video generation service
3. mobile-user/    — Expo React Native app for end users (iOS + Android)
4. mobile-admin/   — Expo React Native app for the admin (iOS + Android, private)

## STRICT RULES

- Use ONLY free or pay-per-use services (no fixed monthly SaaS subscriptions in code)
- Never hardcode secrets — all in .env files with .env.example provided
- Every route must have error handling and return proper HTTP status codes
- Database: Supabase (PostgreSQL). Use the @supabase/supabase-js client in backend
- Video storage: Cloudflare R2 (S3-compatible SDK: @aws-sdk/client-s3)
- Job queue: BullMQ with Redis
- AI: OpenRouter API (free credits) as default LLM gateway — model: "meta-llama/llama-3.3-70b-instruct:free"
  Fall back to Anthropic claude-sonnet-4-6 if OpenRouter key not set
- Image generation: Replicate API (free credits) — model: "black-forest-labs/flux-schnell"
- TTS: Coqui TTS (local, fully free) as default. ElevenLabs as optional upgrade
- Video processing: ffmpeg (must be installed in pipeline Docker container)
- Source video download: yt-dlp (installed in pipeline container)
- Audio transcription: openai-whisper Python package (local, free)

## BUILD ORDER

Build in this exact order. After each part, verify it works before continuing.

### STEP 1 — Project scaffold

Create this folder structure:
showdrama/
├── backend/
├── pipeline/
├── mobile-user/
├── mobile-admin/
└── docker-compose.yml

Create docker-compose.yml with: postgres:15, redis:7-alpine, backend (build ./backend), pipeline (build ./pipeline).

### STEP 2 — Database schema

Create backend/src/db/schema.sql with all tables:

- users (id UUID PK, email TEXT UNIQUE, username TEXT, avatar_url TEXT, subscription_status TEXT DEFAULT 'free', subscription_expires_at TIMESTAMPTZ, token_balance INTEGER DEFAULT 10, is_admin BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now())
- dramas (id UUID PK, title TEXT, description TEXT, genre TEXT, thumbnail_url TEXT, status TEXT DEFAULT 'pending', source_url TEXT, created_at TIMESTAMPTZ)
- episodes (id UUID PK, drama_id UUID FK dramas, episode_number INTEGER, title TEXT, video_url TEXT, duration_seconds INTEGER, token_cost INTEGER DEFAULT 3, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ)
- episode_access (user_id UUID FK users, episode_id UUID FK episodes, unlocked_at TIMESTAMPTZ, PRIMARY KEY (user_id, episode_id))
- token_transactions (id UUID PK, user_id UUID FK users, amount INTEGER, reason TEXT, episode_id UUID FK episodes nullable, created_at TIMESTAMPTZ)
- subscriptions (id UUID PK, user_id UUID FK users, plan TEXT, stripe_subscription_id TEXT, revenuecat_purchase_id TEXT, status TEXT DEFAULT 'active', started_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
- pipeline_jobs (id UUID PK, source_url TEXT, source_file_path TEXT, status TEXT DEFAULT 'queued', progress_step TEXT, error_message TEXT, drama_id UUID FK dramas nullable, created_at TIMESTAMPTZ, completed_at TIMESTAMPTZ)
- watch_history (user_id UUID FK users, episode_id UUID FK episodes, watched_at TIMESTAMPTZ, progress_seconds INTEGER DEFAULT 0, PRIMARY KEY (user_id, episode_id))

### STEP 3 — Backend API

Tech: Node.js, Express, @supabase/supabase-js, jsonwebtoken, bcryptjs, stripe, bullmq, @aws-sdk/client-s3, multer, cors, dotenv

Create all files under backend/src/:

**middleware/auth.js**
- verifyToken(req, res, next): extract Bearer token from Authorization header, verify with JWT_SECRET, attach user to req.user
- verifyAdmin(req, res, next): calls verifyToken then checks req.user.is_admin === true

**routes/auth.js** — POST /auth/register, POST /auth/login, POST /auth/refresh

**routes/dramas.js** — GET /dramas (paginated, genre filter, sort), GET /dramas/:id (with episodes + user lock status), GET /dramas/search

**routes/episodes.js** — GET /episodes/:id (returns video URL only if user has access or is subscriber), POST /episodes/:id/unlock (deducts tokens, inserts episode_access row, inserts token_transaction)

**routes/tokens.js** — GET /tokens/balance, POST /tokens/earn-from-ad (add 2 tokens, enforce max 5/day with Redis counter), POST /tokens/purchase (create Stripe checkout session)

**routes/subscriptions.js** — POST /subscriptions/create (Stripe checkout), GET /subscriptions/status, POST /subscriptions/cancel

**routes/webhooks.js**
- POST /webhooks/stripe: verify Stripe signature, handle events: checkout.session.completed (token purchase or subscription), customer.subscription.deleted (update user subscription_status to 'free'), invoice.paid (extend subscription_expires_at)
- POST /webhooks/revenuecat: verify auth header, handle INITIAL_PURCHASE and RENEWAL events to update subscription_status

**routes/admin.js** (all protected by verifyAdmin)
- GET /admin/stats: counts of users, dramas, revenue estimate, active jobs
- GET /admin/users: paginated, search by email
- PATCH /admin/users/:id: update token_balance, subscription_status, is_admin, banned
- GET /admin/dramas: all dramas including pending
- PATCH /admin/dramas/:id: update status to 'published' or 'rejected', update title/description/genre/thumbnail_url
- POST /admin/pipeline/start: accept JSON { source_url } or multipart file upload, create pipeline_job record, add job to BullMQ queue 'pipeline', return { job_id }
- GET /admin/pipeline: list all pipeline_jobs newest first
- GET /admin/pipeline/:id: return job record
- POST /admin/pipeline/:id/retry: reset status to 'queued', re-enqueue in BullMQ

**routes/internal.js**
- POST /internal/pipeline/complete: verify request has header X-Internal-Secret matching PIPELINE_INTERNAL_SECRET env var. Body: { job_id, drama_id, r2_url }. Update pipeline_job status to 'done'. If drama_id given, set drama status to 'pending_review'. Push Firebase notification to admin (optional, skip if Firebase not configured).

**lib/supabase.js** — initialize Supabase client with SUPABASE_URL and SUPABASE_SERVICE_KEY
**lib/stripe.js** — initialize Stripe with STRIPE_SECRET_KEY
**lib/redis.js** — initialize BullMQ Queue and Worker for 'pipeline' queue. Worker sends HTTP POST to PIPELINE_SERVICE_URL/jobs/process with job data.
**lib/r2.js** — S3Client pointed at Cloudflare R2 endpoint

**index.js** — Express app, register all routes, start server

### STEP 4 — AI Pipeline Service

Tech: Python 3.11, FastAPI, uvicorn, supabase-py, boto3, openai (for Whisper), anthropic, requests, yt-dlp, ffmpeg-python, scenedetect, Pillow

Create pipeline/requirements.txt with all dependencies.
Create pipeline/Dockerfile: FROM python:3.11-slim, install ffmpeg and yt-dlp via apt/pip, install requirements.

Create pipeline/app/main.py:
- FastAPI app
- POST /jobs/process — receives job from BullMQ worker (via backend). Body: { job_id, source_url?, source_file? }. Runs full pipeline async in background task. Returns immediately with { status: "started" }.
- GET /jobs/:id — returns current status of job from DB

Create pipeline/app/jobs/generate_drama.py with async function run_pipeline(job_id, source_url=None, source_file=None):

Step 1 — Download/prepare source video:
  - If source_url: run yt-dlp to download to /tmp/jobs/{job_id}/source.mp4
  - If source_file: use existing path
  - Update job status to 'analyzing'

Step 2 — Analyze source video:
  - Use ffmpeg-python to extract 1 frame per second as JPEG to /tmp/jobs/{job_id}/frames/
  - Use openai-whisper (local) to transcribe audio: whisper.load_model("base"), result = model.transcribe(video_path)
  - Use scenedetect to find scene change timestamps
  - Select up to 10 representative frames (evenly spaced)
  - Call LLM (OpenRouter or Anthropic) with frames as base64 images + transcript text
  - Prompt: "Analyze this short drama video. Return JSON only: { genre, setting, main_characters: [{name, gender, personality_traits}], plot_summary, emotional_arc, estimated_scene_count, themes }"
  - Parse JSON response

Step 3 — Generate script:
  - Update job status to 'scripting'
  - Call LLM with analysis JSON
  - Prompt: "Based on this drama analysis, write a completely original short drama script with the same genre and emotional arc but entirely different characters, names, setting, and story. Return JSON only: { title, description, genre, scenes: [{ scene_number, setting_description, visual_description, emotion_tone, dialogue: [{ character_name, line, emotion }] }] }. Create 5-8 scenes. Make it compelling and emotional."
  - Parse JSON response

Step 4 — Generate scene images:
  - Update job status to 'generating_images'
  - For each scene, call Replicate API with model "black-forest-labs/flux-schnell"
  - Prompt template: "{visual_description}, cinematic style, professional lighting, {emotion_tone} mood, high quality, drama scene"
  - For first scene: also generate character portrait for each character, save as reference
  - Save images to /tmp/jobs/{job_id}/scenes/scene_{n}.jpg

Step 5 — Generate voice audio:
  - Update job status to 'generating_voice'
  - Assign each character a Coqui TTS voice (use different speaker IDs for different characters)
  - If USE_LOCAL_TTS=true: use TTS library from coqui (pip install TTS), model "tts_models/en/ljspeech/tacotron2-DDC"
  - For each dialogue line, generate audio file to /tmp/jobs/{job_id}/audio/scene_{n}_line_{m}.wav
  - Convert wav to mp3 with ffmpeg

Step 6 — Assemble final video:
  - Update job status to 'assembling'
  - For each scene:
    - Calculate total duration = sum of audio clip durations in that scene + 0.5s pause between lines
    - Use ffmpeg to create video clip: show scene image for total duration, overlay audio clips sequentially
    - Generate subtitle file (SRT) from dialogue with timing
    - Burn subtitles into scene clip with ffmpeg
  - Concatenate all scene clips into /tmp/jobs/{job_id}/final.mp4
  - Target output: 720p (1280x720), H.264, AAC audio

Step 7 — Upload and notify:
  - Update job status to 'uploading'
  - Upload /tmp/jobs/{job_id}/final.mp4 to R2 at path dramas/{job_id}/episode_1.mp4
  - Upload thumbnail (first scene image) to R2 at dramas/{job_id}/thumbnail.jpg
  - Insert drama record into DB: title, description, genre from script, thumbnail_url, source_url, status='pending_review'
  - Insert episode record: drama_id, episode_number=1, video_url=r2_url, status='pending_review'
  - Update pipeline_job: status='done', drama_id, completed_at=now()
  - POST to BACKEND_URL/internal/pipeline/complete with X-Internal-Secret header
  - Clean up /tmp/jobs/{job_id}/ directory

On any exception: update pipeline_job status='failed', error_message=str(exception), re-raise

### STEP 5 — User Mobile App (mobile-user/)

Tech: Expo SDK 51, React Native, Expo Router (file-based), NativeWind (Tailwind for RN), Zustand, Axios, expo-av (video player), react-native-purchases (RevenueCat), react-native-google-mobile-ads

Initialize with: npx create-expo-app mobile-user --template blank-typescript

Install: expo-router expo-av expo-image @expo/vector-icons zustand axios nativewind react-native-purchases react-native-google-mobile-ads expo-secure-store

Create these screens:

**app/index.tsx** — redirect to (tabs) if logged in, else to auth/login

**app/auth/login.tsx**
- Email + password fields
- Login button → POST /auth/login → store JWT in SecureStore → navigate to tabs
- Link to register

**app/auth/register.tsx**
- Email + username + password fields
- Register → POST /auth/register → auto-login

**app/(tabs)/_layout.tsx** — Bottom tab navigator with 3 tabs: Home, Search, Wallet

**app/(tabs)/index.tsx** — Home
- Hero banner: first featured drama
- Horizontal scroll row: "New Releases" (newest dramas)
- Horizontal scroll row: "Trending" (most watched)
- Horizontal scroll rows per genre: Romance, Action, Thriller
- Each drama card: thumbnail, title, genre badge
- Tap → drama detail

**app/(tabs)/search.tsx**
- Search input → GET /dramas/search?q=
- Results grid

**app/(tabs)/wallet.tsx**
- Token balance (large number display)
- "Watch Ad" button → show AdMob rewarded ad → on complete → POST /tokens/earn-from-ad → update balance
- Token packs list (10/50/100 tokens) → tap → Stripe payment sheet
- Subscription options (monthly/yearly) → tap → RevenueCat purchase flow
- Current subscription badge

**app/drama/[id].tsx** — Drama detail
- Cover image header
- Title, genre, description
- Episodes list: each shows episode number, title, duration
- If user is subscriber: all episodes show "Watch" button
- If free user: unlocked episodes show "Watch", locked episodes show token cost + "Unlock" button
- "Unlock" deducts tokens via POST /episodes/:id/unlock

**app/episode/[id].tsx** — Video player
- Full screen expo-av video player
- Source: episode video_url from backend (only returned if access granted)
- On progress: POST /watch_history update every 10 seconds
- Back button

**app/profile.tsx**
- Avatar, username, email
- Subscription status badge
- Watch history list
- Logout button

**store/authStore.ts** — Zustand store: { user, token, login(), logout(), loadFromStorage() }
**store/walletStore.ts** — Zustand store: { balance, fetchBalance(), spendTokens(), earnTokens() }
**lib/api.ts** — Axios instance: baseURL from env, request interceptor adds Authorization header, response interceptor handles 401 by clearing auth + redirecting to login

### STEP 6 — Admin Mobile App (mobile-admin/)

Tech: Same as mobile-user but without RevenueCat and AdMob. Add: expo-document-picker, expo-image-picker

Initialize with: npx create-expo-app mobile-admin --template blank-typescript

Screens:

**app/login.tsx**
- Email + password
- On login, verify user.is_admin === true from /users/me, else show "Not authorized"

**app/(tabs)/_layout.tsx** — Bottom tabs: Dashboard, Generate, Queue, Dramas, Users

**app/(tabs)/dashboard.tsx**
- Stats cards: Total Users, Dramas Published, Revenue (estimated), Jobs Running
- GET /admin/stats on load + pull-to-refresh

**app/(tabs)/generate.tsx**
- Two options: "Paste URL" or "Upload Video from Gallery"
- If URL: text input for YouTube/TikTok/direct video URL
- If upload: expo-image-picker to pick video from phone gallery → upload to backend as multipart
- "Generate" button → POST /admin/pipeline/start → shows returned job_id
- Navigate to queue screen after submit

**app/(tabs)/queue.tsx**
- List of all pipeline jobs, polling every 5 seconds
- Each job shows: source URL (truncated), current status with colored badge, created_at
- Status steps shown as progress: Downloading → Analyzing → Scripting → Generating Images → Generating Voice → Assembling → Uploading → Done
- Tap failed job → show error message + Retry button → POST /admin/pipeline/:id/retry
- Tap done job → navigate to review screen

**app/review/[id].tsx**
- Load drama from /admin/dramas/:id
- Play generated episode video (expo-av)
- Show generated title, description, genre
- Edit fields inline (title, description, genre can be changed before publishing)
- "Approve & Publish" button → PATCH /admin/dramas/:id with { status: 'published' } → go back to queue
- "Reject" button → PATCH /admin/dramas/:id with { status: 'rejected' }

**app/(tabs)/dramas.tsx**
- List all published dramas
- Each item: thumbnail, title, genre, status badge, episode count
- Tap → edit screen (change title, description, unpublish)

**app/(tabs)/users.tsx**
- Search bar → GET /admin/users?email=
- User list: email, subscription status, token balance
- Tap user → user detail modal:
  - Adjust token balance (input + save)
  - Change subscription status
  - Ban/unban toggle

### STEP 7 — Final setup files

Create for each part:
- .env.example with all required variables
- README.md with setup instructions (install deps, configure env, run docker-compose, how to deploy to Railway)
- .gitignore (node_modules, .env, __pycache__, /tmp, *.mp4 local)

Create root README.md:
- Project overview
- Prerequisites (Node 20, Python 3.11, Docker, Expo CLI, ffmpeg)
- Quick start: docker-compose up, then mobile app setup
- Deployment guide:
  - Backend + Pipeline → Railway (connect GitHub repo, set env vars, deploy)
  - Mobile apps → Expo EAS Build (eas build --platform all)
  - User app → App Store (TestFlight first) + Play Store (Internal → Production)
  - Admin app → TestFlight only (iOS) + APK sideload (Android)

## VERIFICATION CHECKLIST

After generating everything, verify:
- [ ] docker-compose up starts all services without errors
- [ ] POST /auth/register creates user, POST /auth/login returns JWT
- [ ] GET /dramas returns empty array (not error)
- [ ] POST /admin/pipeline/start with a source_url creates a pipeline_job record
- [ ] Pipeline service /jobs/process endpoint is reachable
- [ ] Both mobile apps build with: cd mobile-user && npx expo start (and same for admin)
- [ ] .env.example files exist for all 4 parts
- [ ] No hardcoded secrets anywhere in code
```

---

## 12. DEPLOYMENT GUIDE (after building)

### Backend + Pipeline → Railway
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Create two services: one for `backend/`, one for `pipeline/`
4. Add Postgres and Redis plugins in Railway (both free tier)
5. Set all env vars from `.env.example` in Railway dashboard
6. Deploy

### Storage → Cloudflare R2
1. Sign up at cloudflare.com (free)
2. Go to R2 → Create Bucket → name it `showdrama`
3. Create API token with R2 read/write permissions
4. Set public access on bucket (for video streaming URLs)
5. Add credentials to both backend and pipeline env vars

### Mobile Apps → Expo EAS
1. `npm install -g eas-cli`
2. `eas login`
3. `cd mobile-user && eas build --platform all`
4. `cd mobile-admin && eas build --platform all`
5. User app → submit to App Store + Play Store
6. Admin app → distribute via TestFlight (iOS) + APK direct install (Android)

### Payments → Stripe
1. stripe.com → free account
2. Get test keys for dev, live keys for production
3. Create products: token packs + subscription plans in Stripe dashboard
4. Register webhook endpoint: `https://your-backend.railway.app/webhooks/stripe`
5. Select events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.paid`

### Mobile Subscriptions → RevenueCat
1. app.revenuecat.com → free account
2. Connect App Store Connect + Google Play Console
3. Create offerings matching your Stripe plans
4. Add webhook: `https://your-backend.railway.app/webhooks/revenuecat`

### Ads → AdMob
1. admob.google.com → free account
2. Create app entries for iOS + Android
3. Create Rewarded ad unit
4. Add app IDs and ad unit IDs to mobile-user env vars

---

*End of ShowDrama System Guide*
