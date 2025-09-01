import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'eli-dashboard-secret-key-2024'
    
    # ELI Demo Database Configuration (from the existing system)
    # PostgreSQL configuration
    # Support both DATABASE_URL and POSTGRES_URL env vars
    DATABASE_URL = (
        os.environ.get('DATABASE_URL')
        or os.environ.get('POSTGRES_URL')
        or 'postgresql://neondb_owner:npg_JpkW8QXvC9PG@ep-super-waterfall-adeqzhke-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    )

    # Neo4j configuration
    NEO4J_URI = os.environ.get('NEO4J_URI') or 'neo4j+s://fb72cf6b.databases.neo4j.io'
    NEO4J_USERNAME = os.environ.get('NEO4J_USERNAME') or 'neo4j'
    NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD') or 'arYRbX-RvNj5FQZPKElg5zA0NjFjD8a4kLW_mFlocIU'
    NEO4J_DATABASE = os.environ.get('NEO4J_DATABASE') or 'neo4j'
    
    # Cloudinary configuration
    CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME') or 'dlogj3gc8'
    CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY') or '426916362366118'
    CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET') or 'u6Hyewut_KWe4nCfeWwIjUP3kdw'
    CLOUDINARY_FOLDER = os.environ.get('CLOUDINARY_FOLDER') or 'irex-events'
    
    # Dashboard specific configuration
    MOCK_MODE = os.environ.get('MOCK_MODE', 'false').lower() == 'true'
    DEBUG_MODE = os.environ.get('DEBUG_MODE', 'true').lower() == 'true'
    
    # Debug dashboard token for accessing existing ELI Demo debug features
    DEBUG_DASHBOARD_TOKEN = os.environ.get('DEBUG_DASHBOARD_TOKEN') or 'WC6DU8sCxuDG'
    
    # CORS configuration
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5001']

