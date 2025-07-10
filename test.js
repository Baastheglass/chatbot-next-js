require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testAuth() {
  const uri = process.env.MONGODB_URI;
  console.log(uri);
  console.log('Testing URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  const client = new MongoClient(uri);
  
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const db = client.db('test');
    console.log('✅ Database "test" accessible');
    
    // Test authentication by running a simple command
    const result = await db.admin().ping();
    console.log('✅ Ping successful:', result);
    
    // Test collection access
    const users = db.collection('users');
    const count = await users.countDocuments();
    console.log('✅ Users collection accessible, count:', count);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error name:', error.name);
    
    if (error.message.includes('bad auth')) {
      console.error('\n🔑 AUTHENTICATION FAILED:');
      console.error('- Check if user "lightningblazer123" exists in Database Access');
      console.error('- Verify password is "borealis12"');
      console.error('- Ensure user has "Read and write to any database" permissions');
    }
  } finally {
    await client.close();
  }
}

testAuth();