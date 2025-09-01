from neo4j import GraphDatabase
from src.config import Config
import logging

logger = logging.getLogger(__name__)

class Neo4jDB:
    def __init__(self):
        self.driver = None
        self.init_driver()
    
    def init_driver(self):
        """Initialize Neo4j driver"""
        try:
            if not Config.MOCK_MODE:
                self.driver = GraphDatabase.driver(
                    Config.NEO4J_URI,
                    auth=(Config.NEO4J_USERNAME, Config.NEO4J_PASSWORD)
                )
                logger.info("Neo4j driver initialized")
            else:
                logger.info("Neo4j running in mock mode")
        except Exception as e:
            logger.error(f"Failed to initialize Neo4j driver: {e}")
            self.driver = None
    
    def get_session(self):
        """Get a Neo4j session"""
        if Config.MOCK_MODE or not self.driver:
            return MockSession()
        try:
            return self.driver.session(database=Config.NEO4J_DATABASE)
        except Exception as e:
            logger.error(f"Failed to get Neo4j session: {e}")
            return MockSession()
    
    def execute_query(self, query, parameters=None):
        """Execute a Cypher query and return results"""
        if Config.MOCK_MODE:
            return []
        
        session = self.get_session()
        try:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]
        except Exception as e:
            logger.error(f"Neo4j query failed: {e}")
            raise
        finally:
            if hasattr(session, 'close'):
                session.close()
    
    def execute_write_query(self, query, parameters=None):
        """Execute a write query in a transaction"""
        if Config.MOCK_MODE:
            return {}
        
        session = self.get_session()
        try:
            with session.begin_transaction() as tx:
                result = tx.run(query, parameters or {})
                return result.consume()
        except Exception as e:
            logger.error(f"Neo4j write query failed: {e}")
            raise
        finally:
            if hasattr(session, 'close'):
                session.close()
    
    def get_graph_data(self, limit=100):
        """Get graph data for visualization"""
        query = """
        MATCH (c:Camera)-[g:GENERATED]->(e:Event)
        OPTIONAL MATCH (e)-[h:HAS_SNAPSHOT]->(i:Image)
        OPTIONAL MATCH (e)-[t:TAGGED]->(tag:Tag)
        RETURN c, e, i, tag, g, h, t
        LIMIT $limit
        """
        return self.execute_query(query, {'limit': limit})
    
    def get_node_relationships(self, node_id, node_type='Event'):
        """Get relationships for a specific node"""
        query = f"""
        MATCH (n:{node_type} {{id: $node_id}})
        OPTIONAL MATCH (n)-[r]-(connected)
        RETURN n, r, connected
        """
        return self.execute_query(query, {'node_id': node_id})
    
    def close(self):
        """Close the Neo4j driver"""
        if self.driver:
            self.driver.close()

class MockSession:
    """Mock session for testing/mock mode"""
    def run(self, query, parameters=None):
        return MockResult()
    
    def close(self):
        pass
    
    def begin_transaction(self):
        return MockTransaction()

class MockResult:
    """Mock result for testing"""
    def __init__(self):
        self.records = []
    
    def __iter__(self):
        return iter(self.records)
    
    def data(self):
        return {}

class MockTransaction:
    """Mock transaction for testing"""
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def run(self, query, parameters=None):
        return MockResult()

# Global instance
neo4j_db = Neo4jDB()

