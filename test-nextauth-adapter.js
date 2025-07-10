require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testNextAuthAdapter() {
  console.log('Testing NextAuth MongoDB adapter compatibility...');
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found');
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('test');
    console.log('✅ Database "test" accessible');
    
    // Test NextAuth collections
    const collections = ['users', 'accounts', 'sessions', 'verification_tokens'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      console.log(`✅ Collection "${collectionName}" accessible (${count} documents)`);
    }
    
    // Test write permission for NextAuth
    const testDoc = { 
      test: 'nextauth-adapter-test', 
      timestamp: new Date() 
    };
    
    await db.collection('users').insertOne(testDoc);
    console.log('✅ Write permission works for NextAuth collections');
    
    // Clean up test document
    await db.collection('users').deleteOne({ test: 'nextauth-adapter-test' });
    console.log('✅ NextAuth MongoDB adapter should work properly');
    
  } catch (error) {
    console.error('❌ NextAuth adapter test failed:', error.message);
  } finally {
    await client.close();
  }
}

testNextAuthAdapter();
