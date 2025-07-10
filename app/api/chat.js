// pages/api/chat.js
import { VectorDBManager } from '@/lib/vectordb_manager';
import { ChatManager } from '@/lib/chat_manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    // Initialize managers
    const vectordb = new VectorDBManager(
      process.env.QDRANT_URL,
      process.env.QDRANT_API_KEY
    );
    
    const chatManager = new ChatManager(vectordb);
    
    // Get response
    const response = await chatManager.get_response(message);
    
    return res.status(200).json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
