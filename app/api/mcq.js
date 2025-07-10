// pages/api/mcq.js
import { VectorDBManager } from '@/lib/vectordb_manager';
import { ChatManager } from '@/lib/chat_manager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    
    // Initialize managers
    const vectordb = new VectorDBManager(
      process.env.QDRANT_URL,
      process.env.QDRANT_API_KEY
    );
    
    const chatManager = new ChatManager(vectordb);
    
    // Generate MCQ based on chat context
    const mcqResult = await chatManager.generate_mcq();
    
    if (mcqResult.success) {
      return res.status(200).json({
        response: mcqResult.mcq.question,
        data: {
          question: mcqResult.mcq.question,
          options: mcqResult.mcq.options,
          correct_answer: mcqResult.mcq.correct_answer,
          explanation: mcqResult.mcq.explanation
        }
      });
    } else {
      return res.status(400).json({ error: mcqResult.message });
    }
  } catch (error) {
    console.error('MCQ error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}