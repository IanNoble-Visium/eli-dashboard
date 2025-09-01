# ELI Dashboard - TruContext Intelligence Platform

A comprehensive dashboard application for the ELI demo that visualizes and manages data captured from the IREX system. Built with React (Vite) frontend and Node.js serverless functions on Vercel, integrating with PostgreSQL and Neo4j.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Access to PostgreSQL and Neo4j databases

### Local Development

#### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`

#### 2. API (Node serverless) Setup
API functions run via Vercel. For local development, you can run `vercel dev` or hit the hosted `/api` endpoints once deployed. Ensure Vercel env vars are set (see Environment Variables).

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

### Deployment: Vercel Monorepo (Frontend + /api)
- vercel.json defines builds for `frontend` and `api` and routes `/api/*` to Node functions
- Set VITE_API_BASE_URL=/api in Vercel env (or keep in vercel.json)
- Push to main to deploy

## 🔧 Configuration

### Environment Variables

#### API (Serverless):
```env
# PostgreSQL
POSTGRES_URL=postgresql://user:pass@host:port/database
# or DATABASE_URL

# Neo4j
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j

# Optional CORS
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://your-custom-domain.com
```

#### Frontend (Environment Variables):
```env
VITE_API_BASE_URL=/api
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
2. API routes go in `api/` (Node serverless), shared helpers in `api/_lib`

### Styling
- Uses Tailwind CSS for styling
- shadcn/ui components for UI elements
- Lucide React for icons
- Recharts for data visualization

## 🔒 Security

### Production Checklist
- [ ] Set secure environment variables
- [ ] Configure CORS for production domains (CORS_ORIGINS)
- [ ] Set up database connection encryption (sslmode=require)
- [ ] Implement rate limiting/auth if required

## 📞 Support

### Troubleshooting
1. **Frontend not loading**: Verify deployment logs
2. **API errors**: Verify database connections and environment variables
3. **CORS issues**: Update CORS_ORIGINS in Vercel
4. **Build failures**: Check Node.js version

### Performance Optimization
- Frontend: Automatic gzip/CDN on Vercel
- API: Optimize queries; pg pool already enabled; consider caching if needed

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

