# IntakeAI Health

AI-powered health insights and nutrition tracking application with Traditional Chinese Medicine recommendations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL or SQLite
- At least one AI service API key (OpenAI, Google Gemini, or HuggingFace)

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd IntakeAIHealth
npm install

# Set up environment
npm run env:setup development

# Initialize database
npm run db:push

# Start development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/api/health

---

## 📋 Table of Contents

- [Features](#features)
- [Environment Setup](#environment-setup)
- [Database Configuration](#database-configuration)
- [Monitoring & Health](#monitoring--health)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

- 🤖 **AI-Powered Insights**: Personalized health recommendations using OpenAI, Google Gemini, or Llama
- 🍎 **Food Tracking**: Log meals with comprehensive nutritional data
- 🌏 **Multi-language Support**: Translation powered by Google Translate API
- 🏥 **Health Profiles**: Custom health conditions and dietary preferences
- 🔬 **TCM Recommendations**: Traditional Chinese Medicine dietary advice
- 📊 **Analytics**: Weekly nutrition summaries and patterns
- 🔐 **Secure**: Session-based authentication with encrypted secrets

---

## ⚙️ Environment Setup

### Required Variables

Create a `.env` file with these essential variables:

```bash
# Core Settings
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/intakeai_health

# Security (REQUIRED)
SESSION_SECRET=your_64_character_secret_here  # Generate: openssl rand -base64 48

# AI Services (at least one recommended)
OPENAI_API_KEY=sk-...                         # OpenAI Platform
GOOGLE_GEMINI_API_KEY=...                     # Google AI Studio
HF_TOKEN=...                                  # HuggingFace
GOOGLE_TRANSLATE_API_KEY=...                  # Google Cloud

# Optional: External Data
USDA_API_KEY=...                              # USDA Food Database
```

### Generate Secrets

```bash
# Session secret (64 characters for production)
openssl rand -base64 48

# JWT secret (32 characters)
openssl rand -base64 24
```

### Environment Scripts

```bash
# Automated setup
npm run env:setup development        # Development environment
npm run env:setup production         # Production environment
npm run env:setup development --force # Force overwrite

# Validation
npm run env:validate                 # Check required variables
npm run env:info                     # View configuration (dev only)
```

### Full Environment Variables Reference

| Category | Variable | Required | Description |
|----------|----------|----------|-------------|
| **Core** | `NODE_ENV` | ✅ | Environment: development/production/test |
| | `PORT` | ❌ | Server port (default: 5000) |
| | `HOST` | ❌ | Server host (default: localhost) |
| **Database** | `DATABASE_URL` | ✅ | PostgreSQL connection string |
| | `DB_POOL_MIN` | ❌ | Min connections (default: 0) |
| | `DB_POOL_MAX` | ❌ | Max connections (default: 10) |
| **Security** | `SESSION_SECRET` | ✅ | Session encryption key (64 chars) |
| | `JWT_SECRET` | ❌ | JWT signing key |
| | `CORS_ORIGIN` | ❌ | Allowed origins (comma-separated) |
| **AI Services** | `OPENAI_API_KEY` | ❌ | OpenAI API key |
| | `GOOGLE_GEMINI_API_KEY` | ❌ | Google Gemini API key |
| | `HF_TOKEN` | ❌ | HuggingFace token |
| | `GOOGLE_TRANSLATE_API_KEY` | ❌ | Google Translate API key |
| **External** | `USDA_API_KEY` | ❌ | USDA Food Database API |
| **Email** | `SMTP_HOST` | ❌ | SMTP server |
| | `SMTP_PORT` | ❌ | SMTP port (default: 587) |
| | `SMTP_USER` | ❌ | SMTP username |
| | `SMTP_PASS` | ❌ | SMTP password |
| **Performance** | `RATE_LIMIT_MAX_REQUESTS` | ❌ | Max requests per window (default: 100) |
| | `REDIS_URL` | ❌ | Redis for caching |
| | `LOG_LEVEL` | ❌ | Logging level (default: info) |

### Get API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Google Gemini**: https://makersuite.google.com/app/apikey
- **Google Translate**: https://console.developers.google.com/
- **HuggingFace**: https://huggingface.co/settings/tokens
- **USDA**: https://fdc.nal.usda.gov/api-guide.html

---

## 🗄️ Database Configuration

### Quick Database Setup

```bash
# Using PostgreSQL (recommended for production)
createdb intakeai_health
npm run db:push

# Using SQLite (development)
# No setup needed - file created automatically
npm run dev
```

### Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate migration files from schema |
| `npm run db:migrate` | Apply migrations to database |
| `npm run db:push` | Push schema changes (development) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:init` | Test connection and verify tables |

### PostgreSQL Setup

#### Local PostgreSQL

```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Create database
psql postgres
CREATE DATABASE intakeai_health;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE intakeai_health TO your_user;
\q

# Set DATABASE_URL in .env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/intakeai_health
```

#### Production PostgreSQL Options

**Neon (Serverless - Recommended)**
```bash
# 1. Sign up at https://neon.tech
# 2. Create project
# 3. Copy connection string
DATABASE_URL=postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Railway**
```bash
# 1. Sign up at https://railway.app
# 2. Add PostgreSQL service
# 3. Copy connection string
DATABASE_URL=postgresql://postgres:pass@containers-us-west.railway.app:5432/railway
```

**Supabase**
```bash
# 1. Sign up at https://supabase.com
# 2. Create project
# 3. Settings > Database > Connection string
DATABASE_URL=postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres
```

### Database Schema

**Health Profiles** (`health_profiles`)
- User demographics and health information
- Medical conditions and dietary restrictions
- Wellness goals and preferences

**Food Entries** (`food_entries`)
- Food consumption records
- Comprehensive nutritional data
- Linked to health profiles

**Insights** (`insights`)
- AI-generated health insights
- Conflict detection and recommendations
- Historical analysis

### Migration Guide

#### Development
```bash
# Quick schema updates
npm run db:push
```

#### Production
```bash
# 1. Make schema changes in shared/schema.ts
# 2. Generate migration
npm run db:generate

# 3. Review migration SQL
cat migrations/0001_migration.sql

# 4. Apply to production
DATABASE_URL="production_url" npm run db:migrate
```

---

## 📊 Monitoring & Health

### Health Endpoints

#### Comprehensive Health Check
```bash
GET /api/health
```

Response includes:
- Overall status (healthy/degraded/unhealthy)
- Service status (database, memory, disk)
- Performance metrics
- Request statistics

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "services": {
      "database": { "status": "healthy", "responseTime": 5 },
      "memory": { "status": "healthy", "usage": "45%" }
    },
    "metrics": {
      "requests": { "total": 1000, "errorRate": 2 },
      "memory": { "percentage": 50 },
      "cpu": { "loadAverage": [1.5, 1.2, 1.0] }
    }
  }
}
```

#### Kubernetes Probes
```bash
GET /api/health/live    # Liveness probe
GET /api/health/ready   # Readiness probe
```

### Monitoring Setup

#### UptimeRobot (Recommended for Beta)
1. Sign up: https://uptimerobot.com
2. Add monitors:
   - Main app: `https://yourdomain.com`
   - Health: `https://yourdomain.com/api/health`
   - Auth: `https://yourdomain.com/api/auth/status`
3. Set check interval: 5 minutes
4. Configure alerts: email/SMS

#### PM2 Process Monitoring
```bash
# Start with monitoring
pm2 start ecosystem.config.js

# Real-time monitoring
pm2 monit

# View logs
pm2 logs intakeai-health

# Status check
pm2 status
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Response Time | > 3s | > 5s |
| Error Rate | > 5% | > 10% |
| Memory Usage | > 75% | > 85% |
| Disk Usage | > 75% | > 85% |
| CPU Load | > 70% | > 90% |

### Log Management

**Log Locations:**
```
/app/logs/
├── combined.log    # All logs
├── error.log       # Errors only
├── access.log      # HTTP requests
└── security.log    # Security events
```

**Log Commands:**
```bash
# Recent errors
tail -f /app/logs/error.log

# Request status codes
awk '{print $9}' /app/logs/access.log | sort | uniq -c

# Real-time monitoring
pm2 logs --lines 100

# Security events
grep "Security" /app/logs/combined.log
```

---

## 🚢 Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add OPENAI_API_KEY
```

### Railway Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Set variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set SESSION_SECRET="$(openssl rand -base64 48)"

# Deploy
railway up
```

### Docker Deployment

```bash
# Build image
docker build -t intakeai-health .

# Run with environment file
docker run -p 5000:5000 --env-file .env.production intakeai-health

# Using docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intakeai-health
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: app
        image: intakeai-health:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 5000
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 5000
          initialDelaySeconds: 10
```

---

## 🔐 Security

### Best Practices

1. **Secret Management**
   - Never commit `.env` files
   - Use different secrets per environment
   - Rotate secrets quarterly
   - Use secrets managers in production

2. **Production Security**
   ```bash
   # Strong session secret (64 chars)
   SESSION_SECRET=$(openssl rand -base64 48)

   # Restrict CORS
   CORS_ORIGIN=https://yourdomain.com

   # Enable SSL
   SSL_CERT_PATH=/path/to/cert.pem
   SSL_KEY_PATH=/path/to/key.pem

   # Rate limiting
   RATE_LIMIT_MAX_REQUESTS=100
   ```

3. **Minimum Secret Lengths**
   - SESSION_SECRET: 64 characters (production)
   - JWT_SECRET: 32 characters
   - Database passwords: 16+ characters

### Security Monitoring

Track and alert on:
- Failed login attempts (>5 in 5 min)
- Unusual API usage patterns
- Potential attack signatures
- Configuration changes

---

## 🔧 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Auth status

### Health Profiles
- `GET /api/health-profile` - Get user profile
- `POST /api/health-profile` - Create profile
- `PUT /api/health-profile/:id` - Update profile

### Food Entries
- `GET /api/food-entries` - List entries
- `POST /api/food-entries` - Create entry
- `DELETE /api/food-entries/:id` - Delete entry
- `GET /api/food/search?q=banana` - Search foods

### Insights
- `GET /api/insights/:profileId/:date` - Daily insights
- `GET /api/insights/:profileId/weekly` - Weekly summary

---

## 🛠️ Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL status
pg_isready

# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection
npm run db:init
```

**AI Features Not Working**
```bash
# Verify API keys
npm run env:validate

# Check AI service status
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**Port Already in Use**
```bash
# Find process
lsof -ti:5000

# Kill process
lsof -ti:5000 | xargs kill -9

# Or change port
PORT=3000 npm run dev
```

**CORS Errors**
```bash
# Add frontend URL to CORS_ORIGIN
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

### Getting Help

1. Check health endpoint: `http://localhost:5000/api/health`
2. Review logs: `npm run logs` or `pm2 logs`
3. Validate environment: `npm run env:validate`
4. Check documentation: This README
5. Open issue: GitHub Issues

---

## 📦 Project Structure

```
IntakeAIHealth/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── routes/          # API routes
│   ├── db.ts            # Database config
│   └── index.ts         # Server entry
├── shared/              # Shared types/schema
├── migrations/          # Database migrations
├── scripts/             # Utility scripts
└── monitoring/          # Health check scripts
```

---

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]

---

**Need help?** Check the troubleshooting section or open an issue on GitHub.
