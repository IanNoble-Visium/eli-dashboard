import { runCypher } from '../api/_lib/neo4j.js'
import { query } from '../api/_lib/db.js'

async function migrateData() {
  console.log('Starting Neo4j data migration...')
  
  try {
    // Clear existing data
    await runCypher('MATCH (n) DETACH DELETE n')
    console.log('Cleared existing Neo4j data')

    // Migrate Cameras
    const cameras = await query(`
      SELECT DISTINCT channel_id, channel_name, channel_type 
      FROM events 
      WHERE channel_id IS NOT NULL
    `)
    
    for (const camera of cameras.rows) {
      await runCypher(`
        CREATE (c:Camera {
          id: $id,
          channel_id: $channel_id,
          name: $name,
          type: $type,
          created_at: datetime()
        })
      `, {
        id: `camera_${camera.channel_id}`,
        channel_id: camera.channel_id,
        name: camera.channel_name || `Camera ${camera.channel_id}`,
        type: camera.channel_type || 'unknown'
      })
    }
    console.log(`Migrated ${cameras.rows.length} cameras`)

    // Migrate Events
    const events = await query(`
      SELECT id, topic, level, channel_id, channel_name, start_time, end_time, metadata
      FROM events 
      ORDER BY start_time DESC 
      LIMIT 1000
    `)
    
    for (const event of events.rows) {
      await runCypher(`
        CREATE (e:Event {
          id: $id,
          topic: $topic,
          level: $level,
          channel_id: $channel_id,
          channel_name: $channel_name,
          timestamp: datetime($timestamp),
          start_time: datetime($start_time),
          end_time: $end_time,
          metadata: $metadata,
          created_at: datetime()
        })
      `, {
        id: `event_${event.id}`,
        topic: event.topic,
        level: event.level,
        channel_id: event.channel_id,
        channel_name: event.channel_name,
        timestamp: event.start_time,
        start_time: event.start_time,
        end_time: event.end_time,
        metadata: JSON.stringify(event.metadata || {})
      })

      // Create relationship between Camera and Event
      if (event.channel_id) {
        await runCypher(`
          MATCH (c:Camera {channel_id: $channel_id})
          MATCH (e:Event {id: $event_id})
          CREATE (c)-[:GENERATED {timestamp: datetime($timestamp)}]->(e)
        `, {
          channel_id: event.channel_id,
          event_id: `event_${event.id}`,
          timestamp: event.start_time
        })
      }
    }
    console.log(`Migrated ${events.rows.length} events`)

    // Migrate Images/Snapshots
    const snapshots = await query(`
      SELECT id, event_id, type, path, image_url, created_at
      FROM snapshots 
      ORDER BY created_at DESC 
      LIMIT 1000
    `)
    
    for (const snapshot of snapshots.rows) {
      await runCypher(`
        CREATE (i:Image {
          id: $id,
          event_id: $event_id,
          type: $type,
          path: $path,
          image_url: $image_url,
          timestamp: datetime($timestamp),
          created_at: datetime()
        })
      `, {
        id: `image_${snapshot.id}`,
        event_id: snapshot.event_id,
        type: snapshot.type,
        path: snapshot.path,
        image_url: snapshot.image_url,
        timestamp: snapshot.created_at
      })

      // Create relationship between Event and Image
      await runCypher(`
        MATCH (e:Event {id: $event_id})
        MATCH (i:Image {id: $image_id})
        CREATE (e)-[:HAS_SNAPSHOT {timestamp: datetime($timestamp)}]->(i)
      `, {
        event_id: `event_${snapshot.event_id}`,
        image_id: `image_${snapshot.id}`,
        timestamp: snapshot.created_at
      })
    }
    console.log(`Migrated ${snapshots.rows.length} images`)

    // Create Tags based on event topics
    const topics = await query(`
      SELECT DISTINCT topic 
      FROM events 
      WHERE topic IS NOT NULL
    `)
    
    for (const topicRow of topics.rows) {
      await runCypher(`
        CREATE (t:Tag {
          name: $name,
          type: 'event_topic',
          created_at: datetime()
        })
      `, {
        name: topicRow.topic
      })

      // Create relationships between Events and Tags
      await runCypher(`
        MATCH (e:Event {topic: $topic})
        MATCH (t:Tag {name: $topic})
        CREATE (e)-[:TAGGED]->(t)
      `, {
        topic: topicRow.topic
      })
    }
    console.log(`Created ${topics.rows.length} tags`)

    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { migrateData }