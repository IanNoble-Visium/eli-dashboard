#!/bin/bash

echo "🚀 ELI Dashboard Quick Start"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the eli-dashboard-complete directory"
    exit 1
fi

echo "📋 Setting up environment..."

# API setup (Node serverless on Vercel)
echo "🔧 API runs via Vercel serverless functions. Ensure env vars are set in Vercel."

# Frontend setup
echo "🎨 Setting up frontend (root)..."

# Install Node dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing Node.js dependencies..."
  npm install
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start development:"
echo "   API:      npm run dev:api"
echo "   Frontend: npm run dev"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5001"
echo ""
echo "📚 For deployment instructions, see DEPLOYMENT.md"
echo ""

