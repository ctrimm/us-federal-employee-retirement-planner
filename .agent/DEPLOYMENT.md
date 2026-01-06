# FEREX Deployment Guide

## Overview
FEREX is built as a static Astro application with React components. It can be deployed to:
- S3 bucket (recommended)
- Any static hosting provider (Netlify, Vercel, Cloudflare Pages)
- Subdomain or route of existing website

## Build the Application

```bash
npm install
npm run build
```

This generates static files in the `dist/` directory.

## Deployment Options

### Option 1: Deploy to S3 Bucket

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://ferex-app
   ```

2. **Enable Static Website Hosting**
   ```bash
   aws s3 website s3://ferex-app --index-document index.html --error-document 404.html
   ```

3. **Upload Build Files**
   ```bash
   aws s3 sync dist/ s3://ferex-app --delete
   ```

4. **Set Bucket Policy for Public Access**
   Create a bucket policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::ferex-app/*"
       }
     ]
   }
   ```

5. **Access the App**
   - S3 website endpoint: `http://ferex-app.s3-website-us-east-1.amazonaws.com`

### Option 2: Deploy to Subdomain with CloudFront

1. **Create S3 bucket** (as above)

2. **Create CloudFront Distribution**
   - Origin: S3 bucket website endpoint
   - Alternate domain name (CNAME): `ferex.yourdomain.com`
   - SSL certificate: Use ACM certificate

3. **Update DNS**
   - Add CNAME record pointing to CloudFront distribution

### Option 3: Deploy as Route on Existing Astro Site

If you have an existing Astro website, FEREX is already integrated at the `/ferex` route.

Simply build and deploy your Astro site:
```bash
npm run build
```

The app will be available at `https://yourdomain.com/ferex`

## Build Output

The `dist/` directory contains:
- `/ferex/index.html` - Main FEREX application
- `/_astro/` - JavaScript and CSS assets
- `/index.html` - Homepage (if using full site)

## Environment Configuration

No environment variables are required for the basic deployment. All calculations happen client-side.

Optional:
- `PUBLIC_SITE_URL` - For sitemap generation
- `PUBLIC_ANALYTICS_ID` - For analytics integration (future)

## Performance Optimization

The build is already optimized:
- ✓ Code splitting
- ✓ Minification
- ✓ Tree shaking
- ✓ Asset optimization

For CDN deployment:
- Enable gzip/brotli compression
- Set cache headers for `/_astro/*` files (1 year)
- Set cache headers for HTML files (no-cache or short TTL)

## Deployment Script

Create `deploy.sh`:
```bash
#!/bin/bash

# Build the app
npm run build

# Deploy to S3
aws s3 sync dist/ s3://ferex-app \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html"

# Upload HTML files with different cache settings
aws s3 sync dist/ s3://ferex-app \
  --delete \
  --cache-control "no-cache" \
  --exclude "*" \
  --include "*.html"

# Invalidate CloudFront cache (if using CloudFront)
# aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Verification

After deployment, verify:
1. Application loads at the URL
2. Navigation works (landing → onboarding → dashboard)
3. Sample scenarios load correctly
4. localStorage persistence works
5. Calculations are accurate

## Troubleshooting

**Issue: Routes don't work (404 errors)**
- Solution: Ensure your hosting is configured for SPA-style routing or use Astro's static mode

**Issue: Assets not loading**
- Solution: Check base URL configuration in `astro.config.js`
- For subdirectory deployment, set `base: '/ferex'`

**Issue: localStorage not persisting**
- Solution: Check browser console for quota errors
- Ensure site is served over HTTPS (required for some browsers)

## Monitoring

Recommended monitoring:
- Uptime monitoring (Pingdom, UptimeRobot)
- Error tracking (Sentry)
- Analytics (Plausible, Google Analytics)

## Updates

To update the deployment:
1. Make changes to source code
2. Run `npm run build`
3. Run deployment script
4. Invalidate cache if using CDN
