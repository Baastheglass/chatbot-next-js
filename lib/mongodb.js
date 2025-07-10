import { MongoClient } from "mongodb"

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env")
}

const uri = process.env.MONGODB_URI
let client
let clientPromise
async function createChatCollections(client) {
  try {
    const db = client.db(process.env.MONGODB_DB_NAME);
    
    // Create Chats Collection
    if (!(await db.listCollections({name: 'chats'}).hasNext())) {
      await db.createCollection('chats');
      await db.collection('chats').createIndex(
        { userId: 1, lastActive: -1 }
      );
    }

    // Create Messages Collection
    if (!(await db.listCollections({name: 'chat_messages'}).hasNext())) {
      await db.createCollection('chat_messages');
      await db.collection('chat_messages').createIndex(
        { chatId: 1, timestamp: 1 }
      );
    }

    console.log('Chat collections created successfully');
  } catch (error) {
    console.error('Error creating chat collections:', error);
    throw error;
  }
}
// Initialize indexes and collections
async function initializeDatabase(client) {
  try {
    const db = client.db(process.env.MONGODB_DB_NAME)
    
    // Create sessions collection if it doesn't exist
    const collections = await db.listCollections().toArray()
    if (!collections.some(c => c.name === 'sessions')) {
      await db.createCollection('sessions')
      console.log('Sessions collection created')
    }

    // Create indexes
    await db.collection('sessions').createIndex(
      { sessionId: 1 }, 
      { unique: true }
    )
    
    await db.collection('sessions').createIndex(
      { userId: 1, isValid: 1, 'token.exp': 1 }
    )

    console.log('Database indexes created successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri)
  global._mongoClientPromise = client.connect().then(async (client) => {
    // Initialize database after connection
    await initializeDatabase(client)
    await createChatCollections(client)
    return client
  })
}

clientPromise = global._mongoClientPromise

export default clientPromise