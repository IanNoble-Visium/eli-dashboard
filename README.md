# ELI Dashboard - TruContext Intelligence Platform

A comprehensive dashboard application for the ELI demo that visualizes and manages data captured from the IREX system. Built with React (Vite) frontend and Node.js API handlers that work both as local Express server for development and Vercel serverless functions for production, integrating with PostgreSQL and Neo4j.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/pnpm
- PostgreSQL database (Neon)
- Neo4j database (Aura)

### Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd eli-dashboard
   npm install
   cd frontend && pnpm install
   ```

2. **Configure environment variables**:
   - Create `.env` in the root directory with your database credentials:
     ```env
     POSTGRES_URL=postgresql://user:pass@host/db?sslmode=require
     NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
     NEO4J_USERNAME=neo4j
     NEO4J_PASSWORD=your-password
     NEO4J_DATABASE=neo4j
     CORS_ORIGINS=http://localhost:5173
     PORT=5001
     ```
   - Create `frontend/.env.local`:
     ```env
     VITE_API_BASE_URL=http://localhost:5001/api
     ```

3. **Start development servers**:
   ```bash
   # Terminal 1: Start local API server (Express)
   npm run dev:api

   # Terminal 2: Start frontend (Vite)
   cd frontend && pnpm dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173
   - API Health Check: http://localhost:5001/api/dashboard/health

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

## 🌐 Deployment

- Local development uses the Express server (npm run dev:api) and Vite (pnpm dev)
- Production deployment uses Vercel serverless functions under /api and a static frontend
- The same API handler code is shared across both environments

## 🔧 Configuration

### Environment Variables

#### API (Local & Vercel):
```env
# PostgreSQL
POSTGRES_URL=postgresql://user:pass@host:port/database
# or DATABASE_URL

# Neo4j
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j

# CORS (comma separated)
CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain.vercel.app

# Local only
PORT=5001
```

#### Frontend (Environment Variables)
- Development (local):
  ```env
  VITE_API_BASE_URL=http://localhost:5001/api
  ```
- Production (Vercel):
  ```env
  VITE_API_BASE_URL=/api
  ```

## 📁 Project Structure

```
eli-dashboard/
├── frontend/                 # React Frontend Application (Vite)
│   ├── src/
│   │   ├── components/      # React components
│   │   └── App.jsx          # Main application
│   ├── package.json
│   └── vite.config.js
├── api/                      # Node.js API Handlers (serverless-compatible)
│   ├── _lib/                 # Shared DB/CORS helpers (pg, neo4j)
│   ├── dashboard/            # Dashboard endpoints (health, metrics, timeline, graph)
│   ├── events/               # Events endpoints (index, geo, types, cameras, [id])
│   ├── snapshots/            # Snapshots endpoints (index, types, [id])
│   └── users/                # Users endpoints
├── vercel.json               # Vercel monorepo config
├── package.json              # API dependencies (pg, neo4j-driver)
└── README.md                 # This file
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
- `GET /api/events/types` - Event types with counts
- `GET /api/events/cameras` - Cameras with event counts
- `GET /api/events/:id` - Event details by ID
- `GET /api/snapshots/types` - Snapshot types with counts
- `GET /api/snapshots/:id` - Snapshot details by ID
- `GET /api/users` - Users list
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user by ID
- `DELETE /api/users/:id` - Delete user by ID

## 🎯 Live Data Integration

The dashboard connects to your existing ELI Demo system:
- **PostgreSQL**: Events, snapshots, system metrics
- **Neo4j**: Graph relationships and network topology
- **Cloudinary**: Media asset management
- **Camera 1088**: Lima, Peru location data

## 🛠️ Development

### Adding New Features
1. Frontend components go in `frontend/src/components/`
2. API routes go in `api/` (serverless-compatible), shared helpers in `api/_lib`

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

