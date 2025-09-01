#!/bin/bash

echo "🚀 ELI Dashboard Quick Start"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Please run this script from the eli-dashboard-complete directory"
    exit 1
fi

echo "📋 Setting up environment..."

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Copy environment variables if they don't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env file from example. Please edit with your database credentials."
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

cd ..

# Frontend setup
echo "🎨 Setting up frontend..."
cd frontend

# Copy environment variables if they don't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created frontend .env file from example."
fi

# Install Node dependencies
echo "📦 Installing Node.js dependencies..."
npm install

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start development:"
echo "   Backend:  cd backend && python src/main.py"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5001"
echo ""
echo "📚 For deployment instructions, see DEPLOYMENT.md"
echo ""

