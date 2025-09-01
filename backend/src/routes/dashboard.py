from flask import Blueprint, jsonify, request
from src.database.postgres import postgres_db
from src.database.neo4j_db import neo4j_db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the dashboard API"""
    return jsonify({
        'status': 'ok',
        'service': 'ELI Dashboard API',
        'timestamp': datetime.utcnow().isoformat()
    })

@dashboard_bp.route('/metrics', methods=['GET'])
def get_dashboard_metrics():
    """Get executive dashboard metrics and KPIs"""
    try:
        time_range = request.args.get('timeRange', '24h')
        
        # Calculate time filter based on range
        now = datetime.utcnow()
        if time_range == '30m':
            start_time = now - timedelta(minutes=30)
        elif time_range == '1h':
            start_time = now - timedelta(hours=1)
        elif time_range == '4h':
            start_time = now - timedelta(hours=4)
        elif time_range == '12h':
            start_time = now - timedelta(hours=12)
        elif time_range == '24h':
            start_time = now - timedelta(hours=24)
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(hours=24)
        
        start_timestamp = int(start_time.timestamp() * 1000)
        
        # Get total events count
        events_query = """
        SELECT COUNT(*) as total_events,
               COUNT(CASE WHEN start_time >= %s THEN 1 END) as recent_events
        FROM events
        """
        events_result = postgres_db.execute_query(events_query, [start_timestamp])
        
        # Get event types distribution
        types_query = """
        SELECT topic, COUNT(*) as count
        FROM events
        WHERE start_time >= %s AND topic IS NOT NULL
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 10
        """
        types_result = postgres_db.execute_query(types_query, [start_timestamp])
        
        # Get geographic distribution
        geo_query = """
        SELECT 
            CASE 
                WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 'with_location'
                ELSE 'without_location'
            END as location_status,
            COUNT(*) as count
        FROM events
        WHERE start_time >= %s
        GROUP BY location_status
        """
        geo_result = postgres_db.execute_query(geo_query, [start_timestamp])
        
        # Get camera activity
        camera_query = """
        SELECT channel_id, channel_name, COUNT(*) as event_count
        FROM events
        WHERE start_time >= %s AND channel_id IS NOT NULL
        GROUP BY channel_id, channel_name
        ORDER BY event_count DESC
        LIMIT 10
        """
        camera_result = postgres_db.execute_query(camera_query, [start_timestamp])
        
        # Get snapshots count
        snapshots_query = """
        SELECT COUNT(*) as total_snapshots,
               COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as with_images
        FROM snapshots s
        JOIN events e ON s.event_id = e.id
        WHERE e.start_time >= %s
        """
        snapshots_result = postgres_db.execute_query(snapshots_query, [start_timestamp])
        
        return jsonify({
            'timeRange': time_range,
            'totalEvents': events_result['rows'][0]['total_events'] if events_result['rows'] else 0,
            'recentEvents': events_result['rows'][0]['recent_events'] if events_result['rows'] else 0,
            'eventTypes': types_result['rows'],
            'geoDistribution': geo_result['rows'],
            'cameraActivity': camera_result['rows'],
            'totalSnapshots': snapshots_result['rows'][0]['total_snapshots'] if snapshots_result['rows'] else 0,
            'snapshotsWithImages': snapshots_result['rows'][0]['with_images'] if snapshots_result['rows'] else 0,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting dashboard metrics: {e}")
        return jsonify({'error': 'Failed to fetch dashboard metrics'}), 500

@dashboard_bp.route('/timeline', methods=['GET'])
def get_timeline_data():
    """Get timeline data for charts"""
    try:
        time_range = request.args.get('timeRange', '24h')
        event_type = request.args.get('eventType')
        camera_id = request.args.get('cameraId')
        
        # Calculate time filter
        now = datetime.utcnow()
        if time_range == '30m':
            start_time = now - timedelta(minutes=30)
            interval = '5 minutes'
        elif time_range == '1h':
            start_time = now - timedelta(hours=1)
            interval = '10 minutes'
        elif time_range == '4h':
            start_time = now - timedelta(hours=4)
            interval = '30 minutes'
        elif time_range == '12h':
            start_time = now - timedelta(hours=12)
            interval = '1 hour'
        elif time_range == '24h':
            start_time = now - timedelta(hours=24)
            interval = '1 hour'
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
            interval = '1 day'
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
            interval = '1 day'
        else:
            start_time = now - timedelta(hours=24)
            interval = '1 hour'
        
        start_timestamp = int(start_time.timestamp() * 1000)
        
        # Build query with optional filters
        where_conditions = ["start_time >= %s"]
        params = [start_timestamp]
        
        if event_type:
            where_conditions.append("topic = %s")
            params.append(event_type)
        
        if camera_id:
            where_conditions.append("channel_id = %s")
            params.append(camera_id)
        
        query = """
        SELECT 
            TO_TIMESTAMP(start_time / 1000) as time_bucket,
            COUNT(*) as event_count,
            topic
        FROM events
        WHERE {}
        GROUP BY TO_TIMESTAMP(start_time / 1000), topic
        ORDER BY time_bucket
        """.format(' AND '.join(where_conditions))
        
        result = postgres_db.execute_query(query, params)
        
        return jsonify({
            'timeRange': time_range,
            'interval': interval,
            'data': result['rows'],
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting timeline data: {e}")
        return jsonify({'error': 'Failed to fetch timeline data'}), 500

@dashboard_bp.route('/events/geo', methods=['GET'])
def get_geographic_events():
    """Get events with geographic coordinates for map visualization"""
    try:
        time_range = request.args.get('timeRange', '24h')
        event_type = request.args.get('eventType')
        limit = min(int(request.args.get('limit', 100)), 1000)
        
        # Calculate time filter
        now = datetime.utcnow()
        if time_range == '24h':
            start_time = now - timedelta(hours=24)
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(hours=24)
        
        start_timestamp = int(start_time.timestamp() * 1000)
        
        # Build WHERE conditions
        where_conditions = ["e.start_time >= %s", "e.latitude IS NOT NULL", "e.longitude IS NOT NULL"]
        params = [start_timestamp]
        
        if event_type:
            where_conditions.append("e.topic = %s")
            params.append(event_type)
        
        # Get events with geographic coordinates
        query = f"""
        SELECT 
            e.id, e.topic, e.module, e.level, e.channel_id, e.channel_name, 
            e.channel_type, e.start_time, e.latitude, e.longitude,
            COUNT(s.id) as snapshot_count
        FROM events e
        LEFT JOIN snapshots s ON e.id = s.event_id
        WHERE {' AND '.join(where_conditions)}
        GROUP BY e.id, e.topic, e.module, e.level, e.channel_id, e.channel_name, 
                 e.channel_type, e.start_time, e.latitude, e.longitude
        ORDER BY e.start_time DESC
        LIMIT %s
        """
        params.append(limit)
        
        result = postgres_db.execute_query(query, params)
        
        return jsonify({
            'events': result['rows'],
            'timeRange': time_range,
            'eventType': event_type,
            'total': len(result['rows']),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting geographic events: {e}")
        return jsonify({'error': 'Failed to fetch geographic events'}), 500

