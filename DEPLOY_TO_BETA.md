# 🚀 Deploy to Beta - Quick Guide

## Deploy to Render (Recommended - Free & Easy!)

Render is 100% free for beta testing and much simpler than Railway. Let's get you deployed in ~15 minutes!

---

## 📋 Prerequisites

Before starting, have these ready:
- [ ] Your Gemini API keys
- [ ] Your Google Translate API key
- [ ] Your USDA API key: `nnSZbJ7kG8Z8EnWghLUYRIh7Y2AGcdFcW11nz926`

---

## Step 1: Create Render Account (2 minutes)

1. Go to https://render.com
2. Click **"Get Started"** or **"Sign Up"**
3. Sign up with **GitHub** (recommended) or Email
4. Verify your email if needed

**No credit card required!** ✅

---

## Step 2: Push Your Code to GitHub (5 minutes)

Render needs your code on GitHub. Let's do that:

```bash
# 1. Navigate to your project
cd /Users/goobdoy/Healthcare_1/IntakeAIHealth\ copy

# 2. Initialize git (if not already done)
git init

# 3. Add all files
git add .

# 4. Commit
git commit -m "Initial commit - IntakeAI Health PWA"

# 5. Create a new repo on GitHub:
# - Go to https://github.com/new
# - Name it: IntakeAIHealth
# - Keep it Private (recommended for now)
# - Don't initialize with README (you already have code)
# - Click "Create repository"

# 6. Link and push (replace with YOUR GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/IntakeAIHealth.git
git branch -M main
git push -u origin main
```

**Done!** Your code is now on GitHub.

---

## Step 3: Create PostgreSQL Database (2 minutes)

1. In Render dashboard, click **"New +"** button (top right)
2. Select **"PostgreSQL"**
3. Configure:
   - **Name**: `intakeai-db`
   - **Database**: `intakeai_health` (or leave default)
   - **User**: Leave default
   - **Region**: Choose closest to you
   - **Instance Type**: **Free** ✅
4. Click **"Create Database"**
5. Wait ~30 seconds for it to provision
6. **Copy the Internal Database URL** (you'll need this soon)
   - It looks like: `postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/db_name`

**Keep this tab open!** We'll need the database URL.

---

## Step 4: Create Web Service (3 minutes)

1. Click **"New +"** → **"Web Service"**
2. Click **"Connect GitHub"** (if not already connected)
3. Find and select your **IntakeAIHealth** repository
4. Click **"Connect"**

5. Configure the service:
   ```
   Name: intakeai-health
   Region: Same as your database
   Branch: main
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Instance Type: Free ✅
   ```

6. **DON'T click "Create Web Service" yet!** We need to add environment variables first.

---

## Step 5: Add Environment Variables (3 minutes)

Scroll down to **"Environment Variables"** section.

### Generate Session Secret First:
```bash
# Run this in your terminal
openssl rand -base64 48
```
Copy the output!

### Add These Variables:

Click **"Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | (paste your generated secret) |
| `GOOGLE_GEMINI_API_KEY` | (your first Gemini key) |
| `GOOGLE_GEMINI_API_KEY2` | (your second Gemini key) |
| `GOOGLE_TRANSLATE_API_KEY` | (your Google Translate key) |
| `USDA_API_KEY` | `nnSZbJ7kG8Z8EnWghLUYRIh7Y2AGcdFcW11nz926` |
| `DATABASE_URL` | (paste the Internal Database URL from Step 3) |

**Important**: Make sure `DATABASE_URL` has `?sslmode=require` at the end. If not, add it:
```
postgresql://user:pass@host/db?sslmode=require
```

---

## Step 6: Deploy! (2-5 minutes)

1. Click **"Create Web Service"**
2. Render will now:
   - Clone your repo
   - Install dependencies
   - Build your app
   - Start the server

**Watch the build logs!** You'll see:
- ✅ Installing dependencies...
- ✅ Building...
- ✅ Starting server...
- ✅ **Live!** 🎉

**First deploy takes 3-5 minutes.** Be patient!

---

## Step 7: Run Database Migration

Your app is live, but the database needs to be set up:

1. In your web service dashboard, click **"Shell"** tab (left sidebar)
2. Run this command in the shell:
   ```bash
   npm run db:push
   ```
3. Wait for it to complete (~10 seconds)
4. You should see "✅ Database migration complete"

**Alternative**: Add migration to build command:
- Go to **Settings** → **Build Command**
- Change to: `npm install && npm run build && npm run db:push`

---

## Step 8: Get Your URL! 🎉

1. In your web service dashboard, look at the top
2. You'll see a URL like: `https://intakeai-health.onrender.com`
3. **Click it to test!**

### First Visit:
- App might take **30-60 seconds** to wake up (free tier)
- This is normal!
- After first visit, it's fast
- Spins down after 15 min of inactivity

---

## ✅ Test Your Deployment

1. **Open the URL** in your browser
2. **Register a test account**
3. **Fill out health profile**
4. **Log a food**
5. **Get AI insights**
6. **Test PWA install** (on mobile)

If everything works: **You're ready for beta testers!** 🚀

---

## 🐛 Troubleshooting

### "Application failed to respond"
- **Cause**: App is starting up (first visit or after sleep)
- **Fix**: Wait 30-60 seconds and refresh

### Build failed
- Check build logs in Render dashboard
- Look for error messages
- Common issue: TypeScript errors (ignore if they're pre-existing)

### Database connection error
- Verify `DATABASE_URL` is set correctly
- Make sure it ends with `?sslmode=require`
- Check database is running (green status in Render)

### Environment variables not working
- Go to **Settings** → **Environment**
- Verify all variables are set
- Click **"Manual Deploy"** to redeploy with new variables

### Service worker not loading
- Ensure you're using HTTPS (Render provides this automatically)
- Check browser console for errors
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)

---

## 📱 Share with Beta Testers

### Send This Message:

```
Hi! 👋

I'd love your help testing my new health app: IntakeAI Health!

🔗 URL: https://intakeai-health.onrender.com
(Replace with your actual URL)

📱 You can install it on your phone like a native app!
   iPhone: Open in Safari → Share → "Add to Home Screen"
   Android: Chrome will prompt to install, or Menu → "Add to Home Screen"

📋 Testing Guide: [attach BETA_TESTING_GUIDE.md]

⚠️ Note: First visit might take 30 seconds to load (free hosting wakes up from sleep)

Please let me know if you find any bugs or have suggestions!

Thanks! 🙏
```

---

## 🔍 Monitor Your Beta

### Render Dashboard Features:

1. **Logs**: Real-time logs of your app
   - Click **"Logs"** tab to see everything

2. **Metrics**: CPU, Memory usage
   - Click **"Metrics"** tab

3. **Events**: Deployment history
   - See when things were deployed

4. **Shell**: Run commands
   - Access database, run scripts

### What to Watch:

- [ ] Error logs (check daily)
- [ ] Database size (free tier: 1GB)
- [ ] AI API usage (check Gemini dashboard)
- [ ] User feedback

---

## 💰 Render Free Tier Limits

Perfect for beta testing:

| Resource | Free Tier |
|----------|-----------|
| **Web Services** | 750 hours/month (enough for 1 app 24/7) |
| **Bandwidth** | 100GB/month |
| **Build Minutes** | 500/month |
| **Database** | 1GB storage, 90 days free |
| **Sleep** | After 15 min inactivity |
| **Wake Time** | 30-60 seconds |

**Good for**: 10-50 beta testers
**Cost**: $0 for 90 days, then $7/month if you continue

---

## 🔄 Update Your App

When you make changes:

```bash
# 1. Make your changes locally
# 2. Commit and push
git add .
git commit -m "Fix bug / Add feature"
git push

# 3. Render auto-deploys! (if auto-deploy enabled)
# Or click "Manual Deploy" in dashboard
```

---

## 🆙 Upgrade Later (Optional)

When ready for more users:

**Render Paid Plans:**
- **Starter**: $7/month per service
  - No sleep
  - Faster performance
  - More bandwidth

**Alternative Platforms:**
- **Railway**: $5/month (faster deploys)
- **Fly.io**: $5-10/month (edge hosting)
- **DigitalOcean**: $4-6/month (more control)

---

## 📚 Helpful Links

- **Render Docs**: https://render.com/docs
- **Your Dashboard**: https://dashboard.render.com
- **Database Dashboard**: (link in Render > PostgreSQL service)
- **Support**: https://render.com/community

---

## ✨ You Did It!

Your IntakeAI Health app is now:
- ✅ **Live** on the internet
- ✅ **Installable** as a PWA
- ✅ **Ready** for beta testers
- ✅ **Free** for 90 days

**Next Steps:**
1. Test everything yourself
2. Fix any bugs you find
3. Share with 5-10 friends first
4. Collect feedback
5. Iterate and improve!

**Need help?** Check the troubleshooting section or ask! 🚀

---

## 🎉 Happy Beta Testing!

Your URL: `https://intakeai-health.onrender.com`
(Replace with your actual URL)

Share the **BETA_TESTING_GUIDE.md** with your testers!
