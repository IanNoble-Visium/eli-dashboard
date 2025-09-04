import { runCypher } from '../api/_lib/neo4j.js'

async function setupNeo4j() {
  console.log('Setting up Neo4j schema...')
  
  try {
    // Create constraints and indexes
    const schemaCommands = [
      'CREATE CONSTRAINT camera_id_unique IF NOT EXISTS FOR (c:Camera) REQUIRE c.id IS UNIQUE',
      'CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE', 
      'CREATE CONSTRAINT image_id_unique IF NOT EXISTS FOR (i:Image) REQUIRE i.id IS UNIQUE',
      'CREATE CONSTRAINT tag_name_unique IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE',
      'CREATE INDEX camera_channel_id IF NOT EXISTS FOR (c:Camera) ON (c.channel_id)',
      'CREATE INDEX event_topic IF NOT EXISTS FOR (e:Event) ON (e.topic)',
      'CREATE INDEX event_timestamp IF NOT EXISTS FOR (e:Event) ON (e.timestamp)',
      'CREATE INDEX image_type IF NOT EXISTS FOR (i:Image) ON (i.type)'
    ]
    
    for (const command of schemaCommands) {
      await runCypher(command)
      console.log(`✓ ${command}`)
    }
    
    console.log('Neo4j schema setup completed!')
    
  } catch (error) {
    console.error('Schema setup failed:', error)
    throw error
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupNeo4j()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { setupNeo4j }