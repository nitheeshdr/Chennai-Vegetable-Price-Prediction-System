# VegPrice AI — Setup & Installation Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | ≥ 3.11 | Backend & ML pipeline |
| Node.js | ≥ 18 | React Native mobile app |
| npm | ≥ 9 | Package manager |
| Java JDK | 17 or 21 | Android build |
| Expo CLI | ≥ 6 | Mobile development |
| EAS CLI | ≥ 18 | Cloud builds |
| Docker & Compose | ≥ 24 | Full-stack local deployment |

---

## 1. Clone the Repository

```bash
git clone https://github.com/nitheeshdr/Chennai-Vegetable-Price-Prediction-System.git
cd Chennai-Vegetable-Price-Prediction-System
```

---

## 2. Environment Variables

Copy and fill in the `.env` file at the project root:

```bash
cp .env.example .env   # if .env.example exists, otherwise create .env
```

Required variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=change-this-to-a-random-string

# App
ENVIRONMENT=development
LOG_LEVEL=INFO
MODEL_ARTIFACTS_PATH=data/model_artifacts
DATA_FEATURES_PATH=data/features

# NVIDIA NIM (for AI predictions)
NVIDIA_API_KEY=nvapi-your-key-here

# Push notifications (optional)
FCM_SERVER_KEY=your-fcm-server-key
```

---

## 3. Backend — FastAPI (Local Development)

```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-full.txt

# Run database migrations
cd api
alembic upgrade head

# Start the API server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at: `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

---

## 4. ML Pipeline

```bash
# Download raw price data
python scripts/download_data.py

# Train all models (18 vegetables × 5 models each)
python scripts/train_models.py

# Evaluate and compare models
python scripts/evaluate_models.py

# Seed Supabase database with historical prices
python scripts/seed_database.py
```

Model artifacts are saved to `data/model_artifacts/<vegetable>/`.

---

## 5. Full Stack with Docker

```bash
# Build and start all services (API + Redis + ML Worker)
cd deployment
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f ml-worker

# Stop
docker-compose down
```

Services started:
- **API**: `http://localhost:8000`
- **Redis**: `localhost:6379`
- **ML Worker**: Background retraining daemon

---

## 6. Vercel Serverless Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables on Vercel dashboard or:
vercel env add NVIDIA_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

The `vercel.json` routes all requests to `api/index.py` (stdlib-only serverless handler).

---

## 7. Mobile App — React Native / Expo

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android (requires device/emulator)
npx expo start --android

# Run on iOS (Mac only)
npx expo start --ios
```

---

## 8. Build APK (Android)

### Cloud Build (EAS — no Android SDK needed)
```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

### Local Bundle Check
```bash
npx expo export --platform android
```

---

## 9. Running Tests

```bash
# Backend tests
source venv/bin/activate
pytest tests/ -v

# With coverage
pytest tests/ --cov=api --cov=src --cov-report=html
```

---

## 10. Daily Retraining

The ML pipeline auto-retrains daily via APScheduler inside the `ml-worker` Docker service.  
On macOS, a LaunchAgent plist is available:

```bash
cp deployment/com.vegprice.retrain.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.vegprice.retrain.plist
```

Or run manually:
```bash
python scripts/daily_retrain.py
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `NVIDIA_API_KEY` invalid | Get a free key at build.nvidia.com |
| Supabase connection error | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| Model not found | Run `python scripts/train_models.py` |
| EAS build queued too long | Free tier queue — consider paid plan or build locally |
| `react-native-reanimated` error | Run `npx expo install react-native-reanimated` to get SDK-compatible version |
| Metro bundler error | Check for missing packages in `package.json` |
