from flask import Blueprint, jsonify, request
from src.database.postgres import postgres_db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

snapshots_bp = Blueprint('snapshots', __name__)

@snapshots_bp.route('/', methods=['GET'])
def get_snapshots():
    """Get paginated snapshots with filtering"""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 500)
        offset = (page - 1) * limit
        
        event_id = request.args.get('eventId')
        snapshot_type = request.args.get('type')
        time_range = request.args.get('timeRange', '7d')
        
        # Calculate time filter
        now = datetime.utcnow()
        if time_range == '24h':
            start_time = now - timedelta(hours=24)
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(days=7)
        
        start_timestamp = int(start_time.timestamp() * 1000)
        
        # Build WHERE conditions
        where_conditions = ["s.created_at >= TO_TIMESTAMP(%s / 1000)"]
        params = [start_timestamp]
        
        if event_id:
            where_conditions.append("s.event_id = %s")
            params.append(event_id)
        
        if snapshot_type:
            where_conditions.append("s.type = %s")
            params.append(snapshot_type)
        
        # Get total count
        count_query = f"""
        SELECT COUNT(*) as total
        FROM snapshots s
        JOIN events e ON s.event_id = e.id
        WHERE {' AND '.join(where_conditions)}
        """
        count_result = postgres_db.execute_query(count_query, params)
        total = count_result['rows'][0]['total'] if count_result['rows'] else 0
        
        # Get snapshots with event details
        snapshots_query = f"""
        SELECT 
            s.id, s.event_id, s.type, s.path, s.image_url, s.created_at,
            e.topic, e.channel_id, e.channel_name, e.start_time
        FROM snapshots s
        JOIN events e ON s.event_id = e.id
        WHERE {' AND '.join(where_conditions)}
        ORDER BY s.created_at DESC
        LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        
        snapshots_result = postgres_db.execute_query(snapshots_query, params)
        
        return jsonify({
            'snapshots': snapshots_result['rows'],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            },
            'filters': {
                'eventId': event_id,
                'type': snapshot_type,
                'timeRange': time_range
            },
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting snapshots: {e}")
        return jsonify({'error': 'Failed to fetch snapshots'}), 500

@snapshots_bp.route('/<snapshot_id>', methods=['GET'])
def get_snapshot_details(snapshot_id):
    """Get detailed information about a specific snapshot"""
    try:
        query = """
        SELECT 
            s.id, s.event_id, s.type, s.path, s.image_url, s.created_at,
            e.topic, e.module, e.level, e.channel_id, e.channel_name, 
            e.channel_type, e.start_time, e.latitude, e.longitude
        FROM snapshots s
        JOIN events e ON s.event_id = e.id
        WHERE s.id = %s
        """
        result = postgres_db.execute_query(query, [snapshot_id])
        
        if not result['rows']:
            return jsonify({'error': 'Snapshot not found'}), 404
        
        return jsonify({
            'snapshot': result['rows'][0],
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting snapshot details: {e}")
        return jsonify({'error': 'Failed to fetch snapshot details'}), 500

@snapshots_bp.route('/types', methods=['GET'])
def get_snapshot_types():
    """Get list of available snapshot types"""
    try:
        query = """
        SELECT type, COUNT(*) as count
        FROM snapshots
        WHERE type IS NOT NULL
        GROUP BY type
        ORDER BY count DESC
        """
        result = postgres_db.execute_query(query)
        
        return jsonify({
            'snapshotTypes': result['rows'],
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting snapshot types: {e}")
        return jsonify({'error': 'Failed to fetch snapshot types'}), 500

