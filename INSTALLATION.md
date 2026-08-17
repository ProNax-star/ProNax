# ProNax Installation Guide

Complete step-by-step installation guide for ProNax video streaming platform.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Installation](#quick-installation)
- [Database Setup](#database-setup)
- [Storage Configuration](#storage-configuration)
- [Copyright Detection Setup](#copyright-detection-setup)
- [Optional Features](#optional-features)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js** 18+ - [Download](https://nodejs.org/)
- **npm** or **bun** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/)

### Required Accounts
- **Supabase** - Free account at [supabase.com](https://supabase.com)
- (Optional) **Cloudflare** - For R2 storage
- (Optional) **Stripe** - For payment processing
- (Optional) **Mux** - For live streaming

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 10GB minimum
- **OS**: Windows, macOS, or Linux

## Quick Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/your-repo/pronax.git
cd pronax
```

### Step 2: Install Dependencies

```bash
# Using npm
npm install

# Using bun (faster)
bun install
```

### Step 3: Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Use your preferred editor: nano, vim, code, etc.
```

### Step 4: Configure Supabase

Edit `.env` file and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 6: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your ProNax instance!

**If you see a license validation screen**, ensure your `VITE_LICENSE_KEY` is correctly set in the `.env` file.

## Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization (or create free one)
4. Enter project name: `pronax`
5. Set database password (save it securely)
6. Choose region closest to your users
7. Click "Create new project"

### Step 2: Get Credentials

1. Go to Project Settings → API
2. Copy **Project URL** to `VITE_SUPABASE_URL`
3. Copy **anon public** key to `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Go to Project Settings → Database
5. Scroll to "Connection string"
6. Copy **service_role** key to `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Apply Database Migrations

```bash
# From project root
supabase db push
```

This will create all required tables and functions.

### Step 4: Enable Required Extensions

Go to Supabase SQL Editor and run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Step 5: Create Initial Admin User

Run this in Supabase SQL Editor:

```sql
-- This will make the first signed-in user an admin
-- Sign in with your account after running this
SELECT claim_initial_admin();
```

## Storage Configuration

### Option 1: Local Storage (Default)

No additional setup required. Files will be stored in `./uploads` directory.

### Option 2: Cloudflare R2 (Recommended for Production)

#### Step 1: Create R2 Bucket

1. Go to Cloudflare Dashboard → R2
2. Click "Create bucket"
3. Name: `pronax-videos`
4. Click "Create bucket"

#### Step 2: Create API Token

1. Go to Workers & Pages → Overview
2. Click "Create API Token"
3. Permissions: Account → R2 → Edit
4. TTL: Use system default
5. Create token and copy credentials

#### Step 3: Configure Environment

Add to `.env`:

```env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=pronax-videos
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

#### Step 4: Configure CORS

In Cloudflare R2 bucket settings:

```json
{
  "AllowedOrigins": ["https://your-domain.com"],
  "AllowedMethods": ["GET", "PUT", "DELETE", "HEAD"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

### Option 3: AWS S3

#### Step 1: Create S3 Bucket

1. Go to AWS Console → S3
2. Create bucket with unique name
3. Configure public access settings
4. Enable CORS configuration

#### Step 2: Create IAM User

1. Go to AWS Console → IAM
2. Create user with S3 permissions
3. Generate access keys
4. Copy credentials

#### Step 3: Configure Environment

```env
STORAGE_PROVIDER=s3
S3_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_key
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

## Copyright Detection Setup

### Option 1: Local Development (Default)

#### Step 1: Install Python Dependencies

```bash
cd python-services
pip install -r requirements.txt
```

#### Step 2: Start Copyright Service

```bash
python fastapi_server.py
```

Service will run on `http://localhost:8000`

#### Step 3: Configure Environment

```env
COPYRIGHT_DETECTION_ENABLED=true
VITE_AUDIO_FINGERPRINT_URL=http://localhost:8000
```

### Option 2: Docker Deployment

```bash
cd python-services
docker build -t pronax-copyright .
docker run -p 8000:8000 pronax-copyright
```

### Option 3: Disable Copyright Detection

If you don't need copyright detection:

```env
COPYRIGHT_DETECTION_ENABLED=false
```

## Optional Features

### Live Streaming with Mux

#### Step 1: Create Mux Account

1. Go to [mux.com](https://mux.com)
2. Create account and get API credentials
3. Create playback ID

#### Step 2: Configure Environment

```env
STREAMING_ENABLED=true
STREAMING_PROVIDER=mux
RTMP_URL=rtmps://global-live.mux.com:443/app
MUX_PLAYBACK_ID=your_mux_playback_id
```

### Payment Processing with Stripe

#### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Create account and get API keys
3. Configure webhooks

#### Step 2: Configure Environment

```env
PAYMENTS_ENABLED=true
VITE_STRIPE_PUBLIC_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Production Deployment

### Vercel Deployment

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Deploy

```bash
vercel login
vercel
```

#### Step 3: Add Environment Variables

In Vercel dashboard, add all environment variables from `.env`.

### Docker Deployment

#### Step 1: Create Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "start"]
```

#### Step 2: Build and Run

```bash
docker build -t pronax .
docker run -p 5173:5173 --env-file .env pronax
```

### Custom Server Deployment

#### Step 1: Build Application

```bash
npm run build
```

#### Step 2: Deploy to Server

Upload `.output` directory to your server and configure your web server (Nginx, Apache, etc.).

## Troubleshooting

### Common Issues

#### "Supabase connection failed"
- Verify your credentials in `.env`
- Check Supabase project status
- Ensure database migrations are applied

#### "Copyright detection not working"
- Ensure Python service is running on port 8000
- Check `VITE_AUDIO_FINGERPRINT_URL` is correct
- Verify Python dependencies are installed

#### "Video upload fails"
- Check storage configuration
- Verify file size limits
- Ensure sufficient disk space

#### "Build errors"
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)
- Verify all dependencies are installed

### Getting Help

- **Documentation**: Check other documentation files
- **GitHub Issues**: Report bugs and feature requests
- **Community**: Join our Discord/Slack community

### Configuration Validation

Run this command to validate your configuration:

```bash
node -e "const { validateConfig } = require('./src/config/app.config.ts'); console.log(validateConfig());"
```

## Next Steps

1. **Customize Branding**: Update colors, logos, and branding
2. **Configure Features**: Enable/disable features as needed
3. **Set Up Analytics**: Configure tracking and monitoring
4. **Test Thoroughly**: Test all features before going live
5. **Deploy to Production**: Follow deployment guides

## Security Best Practices

- Never commit `.env` file to version control
- Use strong passwords for database
- Enable HTTPS in production
- Regularly update dependencies
- Implement rate limiting
- Use environment-specific configurations
- Enable security headers

## Performance Optimization

- Enable CDN for static assets
- Optimize images and videos
- Implement caching strategies
- Use database indexes
- Monitor performance metrics
- Enable compression

---

For more detailed information, see:
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration reference
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guides
