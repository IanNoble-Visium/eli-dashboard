// Create unique constraints (these also create indexes)
CREATE CONSTRAINT camera_id_unique IF NOT EXISTS FOR (c:Camera) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT image_id_unique IF NOT EXISTS FOR (i:Image) REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT tag_name_unique IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE;

// Create additional indexes for performance
CREATE INDEX camera_channel_id IF NOT EXISTS FOR (c:Camera) ON (c.channel_id);
CREATE INDEX event_topic IF NOT EXISTS FOR (e:Event) ON (e.topic);
CREATE INDEX event_timestamp IF NOT EXISTS FOR (e:Event) ON (e.timestamp);
CREATE INDEX image_type IF NOT EXISTS FOR (i:Image) ON (i.type);