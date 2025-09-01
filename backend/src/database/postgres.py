import psycopg2
import psycopg2.extras
from psycopg2.pool import SimpleConnectionPool
from src.config import Config
import logging

logger = logging.getLogger(__name__)

class PostgresDB:
    def __init__(self):
        self.pool = None
        self.init_connection_pool()
    
    def init_connection_pool(self):
        """Initialize PostgreSQL connection pool"""
        try:
            if not Config.MOCK_MODE:
                self.pool = SimpleConnectionPool(
                    minconn=1,
                    maxconn=10,
                    dsn=Config.DATABASE_URL
                )
                logger.info("PostgreSQL connection pool initialized")
            else:
                logger.info("PostgreSQL running in mock mode")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL connection pool: {e}")
            self.pool = None
    
    def get_connection(self):
        """Get a connection from the pool"""
        if Config.MOCK_MODE or not self.pool:
            return None
        try:
            return self.pool.getconn()
        except Exception as e:
            logger.error(f"Failed to get PostgreSQL connection: {e}")
            return None
    
    def return_connection(self, conn):
        """Return a connection to the pool"""
        if Config.MOCK_MODE or not self.pool or not conn:
            return
        try:
            self.pool.putconn(conn)
        except Exception as e:
            logger.error(f"Failed to return PostgreSQL connection: {e}")
    
    def execute_query(self, query, params=None, fetch=True):
        """Execute a query and return results"""
        if Config.MOCK_MODE:
            return {'rows': [], 'rowcount': 0}
        
        conn = self.get_connection()
        if not conn:
            raise Exception("No database connection available")
        
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute(query, params)
                
                if fetch:
                    rows = cursor.fetchall()
                    return {'rows': [dict(row) for row in rows], 'rowcount': cursor.rowcount}
                else:
                    conn.commit()
                    return {'rows': [], 'rowcount': cursor.rowcount}
        except Exception as e:
            conn.rollback()
            logger.error(f"Database query failed: {e}")
            raise
        finally:
            self.return_connection(conn)
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        if self.pool:
            self.pool.closeall()

# Global instance
postgres_db = PostgresDB()

