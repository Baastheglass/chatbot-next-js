import bcrypt from 'bcryptjs';
import clientPromise from './mongodb.js';

export class UserManager {
  constructor() {
    this.dbName = process.env.MONGODB_DB_NAME || 'chatbot_db';
  }

  async getDatabase() {
    const client = await clientPromise;
    return client.db(this.dbName);
  }

  // Add a new user
  async addUser(username, password, email = null) {
    try {
      const db = await this.getDatabase();
      const users = db.collection('users');

      // Check if username already exists
      const existingUser = await users.findOne({ username });
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user document
      const user = {
        username,
        password: hashedPassword,
        email,
        createdAt: new Date(),
        isActive: true
      };

      const result = await users.insertOne(user);
      
      return {
        success: true,
        userId: result.insertedId,
        username: user.username
      };
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }

  // Authenticate user with username and password
  async authenticateUser(username, password) {
    try {
      const db = await this.getDatabase();
      const users = db.collection('users');

      // Find user by username
      const user = await users.findOne({ username, isActive: true });
      if (!user) {
        return { success: false, message: 'Invalid username or password' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid username or password' };
      }

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }

  // Get user details by username
  async getUserByUsername(username) {
    try {
      const db = await this.getDatabase();
      const users = db.collection('users');

      const user = await users.findOne({ username, isActive: true });
      if (!user) {
        return null;
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Get all chats for a specific user
  async getUserChats(username) {
    try {
      const db = await this.getDatabase();
      const chats = db.collection('chats');

      const userChats = await chats
        .find({ 
          userId: username, 
          isDeleted: { $ne: true } 
        })
        .sort({ lastActive: -1 })
        .toArray();

      return userChats.map(chat => ({
        chatId: chat.chatId,
        title: chat.title,
        lastActive: chat.lastActive,
        createdAt: chat.createdAt,
        currentTopic: chat.currentTopic
      }));
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  }
}