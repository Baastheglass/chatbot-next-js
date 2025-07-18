import bcrypt
import pymongo
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

class UserManager:
    def __init__(self):
        self.mongo_uri = os.getenv("MONGODB_URI")
        self.db_name = os.getenv("MONGODB_DB_NAME", "chatbot_db")
        self.client = None
        self.db = None
    
    def get_database(self):
        if not self.client:
            self.client = MongoClient(self.mongo_uri)
        if not self.db:
            self.db = self.client[self.db_name]
        return self.db
    
    async def add_user(self, username: str, password: str, email: str = None):
        """Add a new user to the database"""
        try:
            db = self.get_database()
            users = db.users
            
            # Check if username already exists
            existing_user = users.find_one({"username": username})
            if existing_user:
                return {"success": False, "message": "Username already exists"}
            
            # Hash password
            salt_rounds = 12
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=salt_rounds))
            
            # Create user document
            user = {
                "username": username,
                "password": hashed_password,
                "email": email,
                "createdAt": datetime.utcnow(),
                "isActive": True
            }
            
            result = users.insert_one(user)
            
            return {
                "success": True,
                "userId": str(result.inserted_id),
                "username": username
            }
        except Exception as e:
            print(f"Error adding user: {e}")
            return {"success": False, "message": "Internal server error"}
    
    async def authenticate_user(self, username: str, password: str):
        """Authenticate user with username and password"""
        try:
            db = self.get_database()
            users = db.users
            
            # Find user by username
            user = users.find_one({"username": username, "isActive": True})
            if not user:
                return {"success": False, "message": "Invalid username or password"}
            
            # Verify password
            is_password_valid = bcrypt.checkpw(password.encode('utf-8'), user["password"])
            if not is_password_valid:
                return {"success": False, "message": "Invalid username or password"}
            
            return {
                "success": True,
                "user": {
                    "id": str(user["_id"]),
                    "username": user["username"],
                    "email": user.get("email"),
                    "createdAt": user["createdAt"]
                }
            }
        except Exception as e:
            print(f"Error authenticating user: {e}")
            return {"success": False, "message": "Internal server error"}
    
    async def get_user_by_username(self, username: str):
        """Get user details by username"""
        try:
            db = self.get_database()
            users = db.users
            
            user = users.find_one({"username": username, "isActive": True})
            if not user:
                return None
            
            return {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user.get("email"),
                "createdAt": user["createdAt"]
            }
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    async def get_user_chats(self, username: str):
        """Get all chats for a specific user"""
        try:
            db = self.get_database()
            chats = db.chats
            
            user_chats = list(chats.find({
                "userId": username,
                "isDeleted": {"$ne": True}
            }).sort("lastActive", -1))
            
            return [
                {
                    "chatId": chat["chatId"],
                    "title": chat["title"],
                    "lastActive": chat["lastActive"],
                    "createdAt": chat["createdAt"],
                    "currentTopic": chat.get("currentTopic")
                }
                for chat in user_chats
            ]
        except Exception as e:
            print(f"Error getting user chats: {e}")
            return []