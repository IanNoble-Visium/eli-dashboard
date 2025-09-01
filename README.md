# ELI Dashboard - TruContext Intelligence Platform

A comprehensive dashboard application for the ELI demo that visualizes and manages data captured from the IREX system. Built with React frontend and Flask backend, integrating with PostgreSQL, Neo4j, and Cloudinary.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Python 3.11+ and pip
- Access to PostgreSQL, Neo4j, and Cloudinary databases

### Local Development

#### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`

#### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Set environment variables (see .env.example)
export POSTGRES_URL="your_postgres_connection_string"
export NEO4J_URI="your_neo4j_uri"
export NEO4J_USERNAME="your_neo4j_username"
export NEO4J_PASSWORD="your_neo4j_password"
export CLOUDINARY_URL="your_cloudinary_url"

python src/main.py
```
The backend API will be available at `http://localhost:5001`

## 📊 Dashboard Features

### Executive Dashboard
- Real-time KPIs and metrics
- Interactive charts (event distribution, camera activity)
- Timeline visualization
- System health monitoring
- Auto-refresh functionality

### Geographic Map
- Interactive map with realistic terrain features
- Event location plotting with coordinates
- Camera position markers
- Click-to-view event details
- Professional legend and controls

### Network Topology
- Interactive force-directed graph
- Camera → Events → Snapshots → Tags relationships
- Node details and statistics
- Interactive controls and filtering

### Data Management
- Comprehensive table view with events and snapshots
- Advanced search and filtering
- CRUD operation buttons
- Pagination and export functionality

### Global Search
- Cross-data-type search capabilities
- Real-time results with performance metrics
- Advanced filtering and sorting options

## 🌐 Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Frontend Deployment to Vercel:
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_BASE_URL=https://your-backend-domain.com`

#### Backend Deployment to Railway:
1. Connect your GitHub repo to Railway
2. Set root directory to `backend`
3. Add environment variables in Railway dashboard
4. Deploy automatically

### Option 2: Docker Deployment

#### Frontend Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

#### Backend Dockerfile:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5001
CMD ["python", "src/main.py"]
```

### Option 3: Traditional Hosting

#### Frontend (Static Hosting):
1. Run `npm run build`
2. Upload `dist/` folder to your hosting service
3. Configure environment variables

#### Backend (VPS/Cloud):
1. Set up Python environment
2. Install dependencies: `pip install -r requirements.txt`
3. Configure environment variables
4. Run with: `python src/main.py`

## 🔧 Configuration

### Environment Variables

#### Backend (.env):
```env
# PostgreSQL
POSTGRES_URL=postgresql://user:pass@host:port/database

# Neo4j
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j

# Cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Frontend (Environment Variables):
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

For production, update `VITE_API_BASE_URL` to your deployed backend URL.

## 📁 Project Structure

```
eli-dashboard-complete/
├── frontend/                 # React Frontend Application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ExecutiveDashboard.jsx
│   │   │   ├── WorkingGeographicMap.jsx
│   │   │   ├── SimpleTopology.jsx
│   │   │   ├── SimpleTable.jsx
│   │   │   ├── SearchView.jsx
│   │   │   ├── RealTimeUpdates.jsx
│   │   │   ├── Header.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── lib/            # Utility functions
│   │   └── App.jsx         # Main application
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Flask Backend API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── dashboard.py
│   │   │   ├── events.py
│   │   │   └── snapshots.py
│   │   ├── database/       # Database connections
│   │   │   ├── postgres.py
│   │   │   └── neo4j_db.py
│   │   ├── config.py       # Configuration
│   │   └── main.py         # Flask application
│   └── requirements.txt
└── README.md               # This file
```

## 🔗 API Endpoints

### Dashboard Endpoints
- `GET /api/dashboard/health` - System health check
- `GET /api/dashboard/metrics` - KPI metrics
- `GET /api/dashboard/timeline` - Event timeline data
- `GET /api/dashboard/events/geo` - Geographic event data
- `GET /api/dashboard/graph` - Network topology data

### Data Endpoints
- `GET /api/events` - Events with pagination
- `GET /api/snapshots` - Snapshots with pagination

## 🎯 Live Data Integration

The dashboard connects to your existing ELI Demo system:
- **PostgreSQL**: Events, snapshots, system metrics
- **Neo4j**: Graph relationships and network topology
- **Cloudinary**: Media asset management
- **Camera 1088**: Lima, Peru location data

## 🛠️ Development

### Adding New Features
1. Frontend components go in `frontend/src/components/`
2. Backend routes go in `backend/src/routes/`
3. Database models go in `backend/src/database/`

### Styling
- Uses Tailwind CSS for styling
- shadcn/ui components for UI elements
- Lucide React for icons
- Recharts for data visualization

## 🔒 Security

### Production Checklist
- [ ] Set secure environment variables
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for production domains
- [ ] Set up database connection encryption
- [ ] Implement rate limiting
- [ ] Add authentication if required

## 📞 Support

### Troubleshooting
1. **Frontend not loading**: Check if backend API is running
2. **API errors**: Verify database connections and environment variables
3. **CORS issues**: Update CORS configuration in backend
4. **Build failures**: Check Node.js and Python versions

### Performance Optimization
- Frontend: Enable gzip compression, use CDN
- Backend: Implement caching, optimize database queries
- Database: Add proper indexes, use connection pooling

## 🎉 Features Delivered

✅ **Executive Dashboard** - Real-time KPIs and metrics  
✅ **Geographic Map** - Interactive map with terrain features  
✅ **Network Topology** - Force-directed graph visualization  
✅ **Data Management** - Comprehensive table with CRUD operations  
✅ **Global Search** - Advanced search across all data types  
✅ **Real-time Updates** - Live monitoring with reasonable refresh rates  
✅ **Professional UI** - Modern design with dark/light mode support  
✅ **Responsive Design** - Works on desktop and mobile devices  
✅ **Production Ready** - Scalable architecture with proper error handling  

---

**Project Status**: ✅ Complete and Ready for Deployment  
**Version**: 1.0  
**Last Updated**: August 31, 2025  

Built for **Visium Technologies** - **TruContext Intelligence Platform**

