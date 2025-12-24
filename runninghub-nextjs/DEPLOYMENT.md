# Deployment Guide - RunningHub Next.js Application

This guide covers deploying the RunningHub Next.js application to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Building for Production](#building-for-production)
- [Deployment Options](#deployment-options)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: v18.17.0 or later
- **Python**: v3.8 or later (for RunningHub CLI)
- **npm**: v9.0.0 or later
- **Git**: For version control

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# RunningHub API Configuration
NEXT_PUBLIC_RUNNINGHUB_API_KEY=your_api_key_here
NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID=your_workflow_id
NEXT_PUBLIC_RUNNINGHUB_API_HOST=www.runninghub.cn

# Local Paths (for server deployment)
RUNNINGHUB_DOWNLOAD_DIR=/path/to/downloads
RUNNINGHUB_IMAGE_FOLDER=/path/to/images
RUNNINGHUB_PREFIX_PATH=/path/to/prefix

# Application Settings
NODE_ENV=production
PORT=3000
```

## Environment Configuration

### 1. Copy Environment Variables

```bash
cp .env.local .env.production
```

### 2. Update Production Values

Edit `.env.production` and update the values for your production environment.

### 3. Validate Configuration

Run the built-in validation to ensure all required variables are set:

```bash
npm run build
# The build will validate environment variables
```

## Building for Production

### 1. Install Dependencies

```bash
npm ci
```

### 2. Build the Application

```bash
npm run build
```

This creates:
- `.next/` directory - Build output
- `standalone/` directory - Self-contained deployment package

### 3. Test the Build Locally

```bash
npm run start
```

Access the application at `http://localhost:3000`

## Deployment Options

### Option 1: Standalone Server (Recommended)

The standalone build creates a self-contained package that can be deployed anywhere.

```bash
# Build standalone output
npm run build

# The standalone app is in .next/standalone
cd .next/standalone
node server.js
```

#### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start .next/standalone/server.js --name runninghub-nextjs

# Configure PM2 to start on system boot
pm2 startup
pm2 save
```

### Option 2: Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t runninghub-nextjs .
docker run -p 3000:3000 --env-file .env.production runninghub-nextjs
```

### Option 3: Vercel Deployment

Deploy to Vercel (zero-configuration):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 4: Traditional Server (nginx + Node.js)

1. Build the application
2. Upload `.next/standalone` directory to server
3. Configure nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Production Checklist

### Security

- [ ] Environment variables are set correctly
- [ ] API keys are not exposed in client-side code
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented (if needed)
- [ ] HTTPS is enabled in production

### Performance

- [ ] Build is optimized for production
- [ ] Image optimization is enabled
- [ ] Static assets are properly cached
- [ ] CDN is configured (if applicable)

### Monitoring

- [ ] Error tracking (Sentry, etc.) is configured
- [ ] Analytics are set up
- [ ] Logging is configured
- [ ] Health checks are implemented

### Testing

- [ ] All tests pass in production environment
- [ ] CLI integration works correctly
- [ ] File system access is functioning
- [ ] Image processing works end-to-end

## Troubleshooting

### Build Errors

**Issue**: Build fails with TypeScript errors
```bash
# Solution: Check TypeScript configuration
npm run build -- --debug
```

**Issue**: Module not found errors
```bash
# Solution: Clean install dependencies
rm -rf node_modules package-lock.json
npm ci
```

### Runtime Errors

**Issue**: API calls failing in production
- Check environment variables are set correctly
- Verify API keys are valid
- Check CORS configuration

**Issue**: File system access not working
- Ensure the application has read permissions
- Check that paths are absolute in production
- Verify Python CLI is accessible

### Performance Issues

**Issue**: Slow page loads
- Check if image optimization is working
- Verify CDN is configured
- Monitor bundle size

**Issue**: High memory usage
- Check for memory leaks
- Optimize image sizes
- Consider implementing pagination

## Maintenance

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update packages
npm update

# Test before deploying
npm run build && npm run start
```

### Monitoring

Check logs regularly:
```bash
# PM2 logs
pm2 logs runninghub-nextjs

# Docker logs
docker logs -f runninghub-nextjs
```

### Backups

- Back up `.env.production` file
- Back up any user data
- Keep database backups (if applicable)

## Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review the [main documentation](../README.md)
3. Contact the development team
