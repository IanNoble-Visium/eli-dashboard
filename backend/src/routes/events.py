from flask import Blueprint, jsonify, request
from src.database.postgres import postgres_db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

events_bp = Blueprint('events', __name__)

@events_bp.route('/', methods=['GET'])
def get_events():
    """Get paginated events with filtering and search"""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 500)
        offset = (page - 1) * limit
        
        search = request.args.get('search', '').strip()
        event_type = request.args.get('eventType')
        camera_id = request.args.get('cameraId')
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
        where_conditions = ["start_time >= %s"]
        params = [start_timestamp]
        
        if search:
            where_conditions.append("(id ILIKE %s OR topic ILIKE %s OR channel_name ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])
        
        if event_type:
            where_conditions.append("topic = %s")
            params.append(event_type)
        
        if camera_id:
            where_conditions.append("channel_id = %s")
            params.append(camera_id)
        
        # Get total count
        count_query = f"""
        SELECT COUNT(*) as total
        FROM events
        WHERE {' AND '.join(where_conditions)}
        """
        count_result = postgres_db.execute_query(count_query, params)
        total = count_result['rows'][0]['total'] if count_result['rows'] else 0
        
        # Get events
        events_query = f"""
        SELECT 
            id, topic, module, level, start_time, latitude, longitude,
            channel_id, channel_name, channel_type, created_at,
            (SELECT COUNT(*) FROM snapshots WHERE event_id = events.id) as snapshot_count
        FROM events
        WHERE {' AND '.join(where_conditions)}
        ORDER BY start_time DESC
        LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        
        events_result = postgres_db.execute_query(events_query, params)
        
        return jsonify({
            'events': events_result['rows'],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            },
            'filters': {
                'search': search,
                'eventType': event_type,
                'cameraId': camera_id,
                'timeRange': time_range
            },
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting events: {e}")
        return jsonify({'error': 'Failed to fetch events'}), 500

@events_bp.route('/<event_id>', methods=['GET'])
def get_event_details(event_id):
    """Get detailed information about a specific event"""
    try:
        # Get event details
        event_query = """
        SELECT *
        FROM events
        WHERE id = %s
        """
        event_result = postgres_db.execute_query(event_query, [event_id])
        
        if not event_result['rows']:
            return jsonify({'error': 'Event not found'}), 404
        
        event = event_result['rows'][0]
        
        # Get associated snapshots
        snapshots_query = """
        SELECT *
        FROM snapshots
        WHERE event_id = %s
        ORDER BY created_at DESC
        """
        snapshots_result = postgres_db.execute_query(snapshots_query, [event_id])
        
        return jsonify({
            'event': event,
            'snapshots': snapshots_result['rows'],
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting event details: {e}")
        return jsonify({'error': 'Failed to fetch event details'}), 500

@events_bp.route('/types', methods=['GET'])
def get_event_types():
    """Get list of available event types"""
    try:
        query = """
        SELECT topic, COUNT(*) as count
        FROM events
        WHERE topic IS NOT NULL
        GROUP BY topic
        ORDER BY count DESC
        """
        result = postgres_db.execute_query(query)
        
        return jsonify({
            'eventTypes': result['rows'],
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting event types: {e}")
        return jsonify({'error': 'Failed to fetch event types'}), 500

@events_bp.route('/cameras', methods=['GET'])
def get_cameras():
    """Get list of available cameras"""
    try:
        query = """
        SELECT channel_id, channel_name, channel_type, COUNT(*) as event_count
        FROM events
        WHERE channel_id IS NOT NULL
        GROUP BY channel_id, channel_name, channel_type
        ORDER BY event_count DESC
        """
        result = postgres_db.execute_query(query)

        return jsonify({
            'cameras': result['rows'],
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting cameras: {e}")
        return jsonify({'error': 'Failed to fetch cameras'}), 500

@events_bp.route('/geo', methods=['GET'])
def get_geo_events():
    """Get events with geographic coordinates for map display"""
    try:
        # Get query parameters
        limit = min(int(request.args.get('limit', 1000)), 2000)
        time_range = request.args.get('timeRange', '24h')
        event_type = request.args.get('eventType')

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

        # Build WHERE conditions - only include events with valid coordinates
        where_conditions = [
            "start_time >= %s",
            "latitude IS NOT NULL",
            "longitude IS NOT NULL",
            "latitude BETWEEN -90 AND 90",
            "longitude BETWEEN -180 AND 180"
        ]
        params = [start_timestamp]

        if event_type:
            where_conditions.append("topic = %s")
            params.append(event_type)

        # Get events with geographic data
        events_query = f"""
        SELECT
            id, topic, module, level, start_time, latitude, longitude,
            channel_id, channel_name, channel_type, created_at,
            (SELECT COUNT(*) FROM snapshots WHERE event_id = events.id) as snapshot_count
        FROM events
        WHERE {' AND '.join(where_conditions)}
        ORDER BY start_time DESC
        LIMIT %s
        """
        params.append(limit)

        events_result = postgres_db.execute_query(events_query, params)

        return jsonify({
            'events': events_result['rows'],
            'count': len(events_result['rows']),
            'filters': {
                'eventType': event_type,
                'timeRange': time_range,
                'limit': limit
            },
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting geo events: {e}")
        return jsonify({'error': 'Failed to fetch geographic events'}), 500

