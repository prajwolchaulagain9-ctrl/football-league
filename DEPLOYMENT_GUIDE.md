# E-Football League - Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com)
- Git installed on your computer

## Step-by-Step Deployment Guide

### Step 1: Prepare Your Repository
1. Initialize Git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub:
   - Go to https://github.com/new
   - Name it (e.g., `football-league`)
   - Don't initialize with README (you have files already)
   - Click "Create repository"

3. Push your code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/football-league.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Update Client API URL for Production

Before deploying, update the client to use environment variables for the API URL:

1. Open `client/src/App.js`
2. Replace:
   ```javascript
   const API = 'http://localhost:5000/api';
   ```
   
   With:
   ```javascript
   const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
   ```

3. Commit this change:
   ```bash
   git add client/src/App.js
   git commit -m "Use environment variable for API URL"
   git push
   ```

### Step 3: Deploy to Vercel

#### Option A: Deploy via Vercel Website (Recommended for beginners)

1. **Sign in to Vercel:**
   - Go to https://vercel.com
   - Click "Sign Up" and use your GitHub account

2. **Import Project:**
   - Click "Add New..." → "Project"
   - Select "Import from GitHub"
   - Authorize Vercel to access your repositories
   - Select your `football-league` repository

3. **Configure Project:**
   - **Framework Preset:** Select "Create React App"
   - **Root Directory:** Leave as `./` (root)
   - **Build Command:** Keep default or use `cd client && npm install && npm run build`
   - **Output Directory:** `client/build`
   
4. **Environment Variables:**
   Click "Environment Variables" and add:
   - Key: `REACT_APP_API_URL`
   - Value: `https://YOUR_PROJECT_NAME.vercel.app/api` (you'll update this after first deployment)

5. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete (2-5 minutes)
   - Your app will be live at `https://YOUR_PROJECT_NAME.vercel.app`

6. **Update API URL:**
   - After first deployment, go to Project Settings → Environment Variables
   - Update `REACT_APP_API_URL` to your actual Vercel URL: `https://YOUR_PROJECT_NAME.vercel.app/api`
   - Redeploy from the Deployments tab

#### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select your scope (account/team)
   - Link to existing project or create new
   - Confirm settings

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Step 4: Important Configuration for Server

Since Vercel is serverless, you need to make a few adjustments:

1. **Create `server/api/index.js` (Vercel Serverless Function):**
   
   Move your Express app to work as a serverless function. Create a new file:
   ```
   server/api/index.js
   ```

2. **Store Data Externally:**
   - Vercel serverless functions don't persist file system changes
   - Consider using:
     - **Vercel KV** (Redis database) for simple storage
     - **MongoDB Atlas** (free tier available)
     - **PostgreSQL** (via Vercel Postgres or Neon)
     - **Supabase** (free tier available)

### Step 5: Alternative - Simple Split Deployment

For easier deployment, deploy client and server separately:

#### Deploy Client Only:
1. Build the client:
   ```bash
   cd client
   npm run build
   ```

2. Deploy just the client folder to Vercel
3. Update API URL in client to point to your server (e.g., Railway, Render, or Heroku)

#### Deploy Server Separately:
- Use **Railway.app**, **Render.com**, or **Heroku** for the Node.js server
- These platforms support file system persistence better than Vercel

### Step 6: Recommended Approach - Use Database

Since your app stores data in `data.json`, for production use:

1. **Sign up for MongoDB Atlas** (free tier):
   - https://www.mongodb.com/cloud/atlas/register

2. **Update server to use MongoDB:**
   ```bash
   cd server
   npm install mongodb
   ```

3. **Add MongoDB connection string to Vercel environment variables:**
   - `MONGODB_URI=your_connection_string`

## Quick Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] API URL updated to use environment variables
- [ ] Vercel project created and linked
- [ ] Environment variables configured
- [ ] Build settings verified
- [ ] First deployment successful
- [ ] Test all features (submit score, undo, reset)
- [ ] Verify password protection works (password: 2244)

## Troubleshooting

**Build fails:**
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Make sure `react-scripts` version is correct (5.0.1)

**API not working:**
- Check API URL in environment variables
- Verify CORS settings allow your Vercel domain
- Check server logs in Vercel Functions tab

**Data not persisting:**
- Vercel serverless functions are stateless
- You need a database for persistence (see Step 6)

## Password Protection

Your app now requires password `2244` for:
- ✅ Submitting match results
- ✅ Undoing matches
- ✅ Resetting the league

## Support

For more help:
- Vercel Documentation: https://vercel.com/docs
- GitHub Issues: Create an issue in your repository
