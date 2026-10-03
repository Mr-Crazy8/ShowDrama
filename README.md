# ShowDrama — Short Drama SaaS Platform

ShowDrama is an AI-powered short drama video streaming platform. It features an automated AI generation pipeline that transforms short source videos or URLs into full original vertical drama episodes, accompanied by a public user mobile app for video playback & monetization, an admin mobile app for queue control & content publishing, and a high-performance Node.js REST API with BullMQ job queues.

---

## 🌟 Core System Components

1. **`backend/`**: Node.js + Express REST API with Supabase (PostgreSQL), JWT authentication, Stripe & RevenueCat webhooks, Cloudflare R2 integration, and BullMQ Redis task queue.
2. **`pipeline/`**: Python 3.11 + FastAPI AI generation worker leveraging `yt-dlp`, `ffmpeg`, Whisper audio transcription, PySceneDetect scene splitting, OpenRouter / Anthropic Claude scripting, Replicate FLUX keyframe image generation, and Coqui TTS character voice synthesis.
3. **`mobile-user/`**: Expo React Native iOS/Android app with Expo Router, NativeWind, Zustand state management, AdMob rewarded ads for token rewards, Stripe token packs, and `expo-av` video playback.
4. **`mobile-admin/`**: Expo React Native iOS/Android private app for administrators to trigger generation jobs from YouTube/TikTok URLs or video gallery uploads, monitor real-time queue steps, preview generated episodes, approve/publish dramas, and manage user accounts.

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js v20+ & `npm`
- Python 3.11+ & `pip`
- Docker & Docker Compose
- `ffmpeg` & `yt-dlp` installed locally

### 1. Launch Local Database & Redis Services

```bash
docker-compose up -d postgres redis
```

### 2. Setup Backend API

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The Express API will be running on `http://localhost:3000`.

### 3. Setup AI Pipeline Service

```bash
cd pipeline
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The FastAPI service will be accessible at `http://localhost:8000`.

### 4. Run Mobile Apps

```bash
# User App
cd mobile-user
cp .env.example .env
npm install
npx expo start

# Admin App
cd mobile-admin
cp .env.example .env
npm install
npx expo start
```

---

## 🛠️ Production Deployment Guide

### Railway (Backend & Pipeline)
1. Link your GitHub repository to [Railway.app](https://railway.app).
2. Provision a **Postgres** instance and execute `backend/src/db/schema.sql`.
3. Provision a **Redis** instance.
4. Create a service for `backend/` and set environment variables from `backend/.env.example`.
5. Create a service for `pipeline/` using the included Dockerfile (`pipeline/Dockerfile`) and set environment variables from `pipeline/.env.example`.

### Cloudflare R2 (Video Storage)
1. Create an R2 Bucket named `showdrama` in Cloudflare Dashboard.
2. Create API Tokens with read/write access.
3. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PUBLIC_URL` in backend and pipeline environment variables.

### Expo EAS Build (Mobile Apps)
```bash
npm install -g eas-cli
eas login

# Build User Mobile App
cd mobile-user && eas build --platform all

# Build Admin Mobile App
cd mobile-admin && eas build --platform all
```
