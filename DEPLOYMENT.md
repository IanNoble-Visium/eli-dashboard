# ELI Dashboard Deployment Guide

## 🚀 Quick Deployment to Vercel + Railway

### Step 1: GitHub Setup
1. Create a new GitHub repository
2. Upload this entire `eli-dashboard-complete` folder to your repo
3. Push to the `main` branch

### Step 2: Frontend Deployment (Vercel)

#### Option A: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Set the following configuration:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   ```
   VITE_API_BASE_URL=https://your-backend-domain.railway.app/api
   ```

6. Deploy!

#### Option B: Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel --prod
```

### Step 3: Backend Deployment (Railway)

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set the following configuration:
   - **Root Directory**: `backend`
   - **Start Command**: `python src/main.py`

5. Add Environment Variables in Railway dashboard:
   ```
   POSTGRES_URL=your_postgres_connection_string
   NEO4J_URI=your_neo4j_uri
   NEO4J_USERNAME=your_neo4j_username
   NEO4J_PASSWORD=your_neo4j_password
   CLOUDINARY_URL=your_cloudinary_url
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

6. Deploy!

### Step 4: Update Frontend API URL
1. After backend is deployed, copy the Railway domain
2. Update Vercel environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-domain.railway.app/api
   ```
3. Redeploy frontend

## 🐳 Docker Deployment

### Local Development with Docker
```bash
# Copy environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials

# Build and run
docker-compose up --build
```

### Production Docker Deployment
```bash
# Build images
docker build -t eli-dashboard-frontend ./frontend
docker build -t eli-dashboard-backend ./backend

# Run containers
docker run -d -p 3000:80 eli-dashboard-frontend
docker run -d -p 5001:5001 --env-file backend/.env eli-dashboard-backend
```

## ⚙️ Environment Variables

### Backend Environment Variables
```env
# Required - Database Connections
POSTGRES_URL=postgresql://user:pass@host:port/database
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Optional - Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
```

### Frontend Environment Variables
```env
# Required - API Connection
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

## 🔧 Custom Domain Setup

### Vercel Custom Domain
1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Railway Custom Domain
1. Go to your Railway project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## 📊 Monitoring & Analytics

### Vercel Analytics
1. Enable Vercel Analytics in project settings
2. Add analytics script to your frontend

### Railway Monitoring
1. Railway provides built-in monitoring
2. Check "Metrics" tab in your project dashboard

## 🔒 Security Configuration

### Production Security Checklist
- [ ] Set secure environment variables
- [ ] Enable HTTPS (automatic with Vercel/Railway)
- [ ] Configure CORS for production domains
- [ ] Set up database connection encryption
- [ ] Implement rate limiting (optional)
- [ ] Add authentication if required

### CORS Configuration
Update `backend/src/main.py`:
```python
CORS(app, origins=[
    'https://your-frontend-domain.vercel.app',
    'https://your-custom-domain.com'
])
```

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

#### Backend API Errors
1. Check environment variables are set correctly
2. Verify database connections
3. Check Railway logs for error details

#### CORS Errors
1. Update CORS origins in backend
2. Ensure API URL is correct in frontend
3. Check browser network tab for actual requests

### Deployment Logs
- **Vercel**: Check deployment logs in Vercel dashboard
- **Railway**: Check deployment and runtime logs in Railway dashboard

## 📈 Performance Optimization

### Frontend Optimization
- Enable gzip compression (automatic with Vercel)
- Use CDN for static assets (automatic with Vercel)
- Implement code splitting if needed

### Backend Optimization
- Add database connection pooling
- Implement caching for frequently accessed data
- Optimize database queries
- Use Railway's auto-scaling features

## 🔄 CI/CD Setup

The included GitHub Actions workflow automatically:
1. Tests both frontend and backend on pull requests
2. Deploys to production on pushes to `main` branch

### Required GitHub Secrets
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
RAILWAY_TOKEN=your_railway_token
RAILWAY_SERVICE=your_railway_service_id
VITE_API_BASE_URL=https://your-backend-domain.railway.app/api
```

## 📞 Support

### Getting Help
1. Check deployment logs first
2. Verify environment variables
3. Test API endpoints directly
4. Check database connections

### Useful Commands
```bash
# Test backend locally
cd backend
python src/main.py

# Test frontend locally
cd frontend
npm run dev

# Build frontend for production
cd frontend
npm run build

# Test production build locally
cd frontend
npm run preview
```

---

**Deployment Status**: ✅ Ready for Production  
**Estimated Deployment Time**: 15-30 minutes  
**Support**: Full documentation and troubleshooting guide included

