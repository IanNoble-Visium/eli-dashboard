# ELI Dashboard Deployment Guide

## 🚀 Quick Deployment to Vercel (Monorepo: Frontend + Node API)

### Step 1: GitHub Setup
1. Push your repository to GitHub (monorepo root)

### Step 2: Vercel Project
1. Import your GitHub repo in Vercel
2. Ensure vercel.json at repo root includes:
   - builds for `frontend/package.json` with `@vercel/static-build`
   - builds for `api/**/*.js` with `@vercel/node`
   - routes forwarding `/api/*` to serverless functions
3. Environment Variables (Project Settings → Environment Variables):
   - POSTGRES_URL (and/or DATABASE_URL)
   - NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE
   - CORS_ORIGINS (comma-separated)
   - VITE_API_BASE_URL=/api

### Step 3: Deploy
1. Push to main (or click Redeploy)
2. Verify build logs show frontend building under `/frontend` and output uploaded from `frontend/dist`
3. Test endpoints: `/api/dashboard/health`, `/api/events`, `/api/snapshots`, `/api/events/geo`, `/api/dashboard/graph`

## 🐳 Docker (optional for frontend only)

For local testing of the built frontend image:
```bash
# Build frontend image
docker build -t eli-dashboard-frontend ./frontend
# Run container
docker run -d -p 3000:80 eli-dashboard-frontend
```

## ⚙️ Environment Variables

### API (Serverless) Environment Variables
```env
# Required - Database Connections
POSTGRES_URL=postgresql://user:pass@host:port/database
# or DATABASE_URL
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j

# Optional - CORS
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
```

### Frontend Environment Variables
```env
# Base URL for API calls
VITE_API_BASE_URL=/api
```

## 🔧 Custom Domain Setup

### Vercel Custom Domain
1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## 📊 Monitoring & Analytics

### Vercel Analytics
1. Enable Vercel Analytics in project settings
2. Add analytics script to your frontend if desired

## 🔒 Security Configuration

### Production Security Checklist
- [ ] Set secure environment variables
- [ ] Configure CORS for production domains (CORS_ORIGINS)
- [ ] Use encrypted DB connections (sslmode=require)
- [ ] Implement rate limiting/authentication if required

## 🚨 Troubleshooting

### Common Issues

#### Frontend Build Errors
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### API Errors
1. Check Vercel Environment Variables are set correctly
2. Verify database connections (POSTGRES_URL/DATABASE_URL, NEO4J_*)
3. Check Vercel Function logs for error details

#### CORS Errors
1. Update CORS_ORIGINS in Vercel
2. Ensure VITE_API_BASE_URL is `/api` in production

### Deployment Logs
- **Vercel**: Check deployment logs in Vercel dashboard

## 📈 Performance Optimization

### Frontend Optimization
- Automatic CDN and gzip with Vercel
- Implement code splitting if needed

### API Optimization
- Connection pooling (pg Pool is used)
- Optimize database queries

## 📞 Support

### Getting Help
1. Check Vercel deployment logs
2. Verify environment variables
3. Test API endpoints directly

---

**Deployment Status**: ✅ Ready for Production  
**Estimated Deployment Time**: 15-30 minutes  
**Support**: Full documentation and troubleshooting guide included

