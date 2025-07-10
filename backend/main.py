from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import uvicorn
from vectordb_manager import VectorDBManager
from chat_manager import ChatManager
import os
from dotenv import load_dotenv
# from auth_middleware import verify_token  # Authentication disabled for demo/development

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
	"https://chatbot-next-js-wheat.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.get("/health")
async def health_check():
    """Health check endpoint that doesn't require authentication"""
    return {"status": "healthy", "message": "Backend is running"}

# Authentication middleware disabled for demo/development
# @app.middleware("http")
# async def auth_middleware(request, call_next):
#     # Skip authentication for health check and OPTIONS requests
#     if request.url.path == "/health" or request.method == "OPTIONS":
#         response = await call_next(request)
#         return response
#     
#     # Apply authentication for all other routes
#     await verify_token(request)
#     response = await call_next(request)
#     return response

# Initialize managers
vectordb = VectorDBManager(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY")
)
chat_manager = ChatManager(vectordb)

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    type: str = "text"  # default to text
    data: Optional[Dict] = None  # for MCQ/video/diagram data

class MCQRequest(BaseModel):
    session_id: str

class TopicRequest(BaseModel):
    session_id: str

class DiagramRequest(BaseModel):
    session_id: str
    user_query: str  # <-- new field

class CreateChatRequest(BaseModel):
    title: str

class NewMessageRequest(BaseModel):
    role: str
    content: str
    attachmentType: Optional[str] = None
    attachmentData: Optional[Dict] = None

@app.post("/chats")
async def create_chat_endpoint(req: CreateChatRequest, request: Request):
    # Authentication disabled for demo/development
    # user_email = getattr(request.state, 'user_email', None)
    # if not user_email:
    #     raise HTTPException(status_code=401, detail="User not authenticated")
    
    user_email = "demo@example.com"  # Use demo email for development
    chat_title = req.title
    chat_id = await chat_manager.create_chat(user_email, chat_title)
    return {"chatId": chat_id}



@app.post("/create_session")
async def create_session(request: Request):
    """Create a new chat session"""
    try:
        # Authentication disabled for demo/development
        # user_email = getattr(request.state, 'user_email', None)
        # if not user_email:
        #     raise HTTPException(status_code=401, detail="User not authenticated")
        
        session_id = chat_manager.create_session()
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_message: ChatMessage, request: Request):
    """Handle chat messages"""
    try:
        # Authentication disabled for demo/development
        # user_email = getattr(request.state, 'user_email', None)
        # if not user_email:
        #     raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Create new session if none provided
        session_id = chat_message.session_id
        if not session_id:
            session_id = chat_manager.create_session()

        # First classify the message intent
        intent_result = await chat_manager.classify_message_intent(chat_message.message)
        print(f"Intent result: {intent_result}")
        
        if intent_result["success"] and intent_result["confidence"] > 0.85:
            if intent_result["intent"] == "mcq":
                mcq_result = await chat_manager.generate_mcq(session_id)
                if mcq_result["success"]:
                    
                    return ChatResponse(
                        response=mcq_result["mcq"]["question"],
                        session_id=session_id,
                        type="mcq",
                        data=mcq_result["mcq"]
                    )
                    
            elif intent_result["intent"] == "video":
                video_result = await chat_manager.get_relevant_videos(session_id)
                if video_result["success"]:
                    return ChatResponse(
                        response=f"I found some relevant videos about {video_result['topic']}",
                        session_id=session_id,
                        type="video",
                        data=video_result["videos"]
                    )
                    
            elif intent_result["intent"] == "diagram":
                
                diagram_result = await chat_manager.get_relevant_diagram(session_id,chat_message.message)
                
                if diagram_result["success"]:
                    return ChatResponse(
                        response="Here's a relevant diagram:",
                        session_id=session_id,
                        type="diagram",
                        data=diagram_result["diagram"]
                    )

        # If no special intent or low confidence, get normal response
        response = await chat_manager.get_response(
            message=chat_message.message,
            session_id=session_id
        )
        
        return ChatResponse(
            response=response,
            session_id=session_id,
            type="text"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract_topic")
async def extract_topic_endpoint(topic_request: TopicRequest, request: Request):
    """Extract topic from chat history"""
    try:
        # Authentication disabled for demo/development
        # user_email = getattr(request.state, 'user_email', None)
        # if not user_email:
        #     raise HTTPException(status_code=401, detail="User not authenticated")
        
        result = await chat_manager.extract_topic_from_chat(topic_request.session_id)
        
        if result["success"]:
            return {
                "topic": result["topic"],
                "confidence": result["confidence"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/mcq")
async def mcq_endpoint(mcq_request: MCQRequest, request: Request):
    """Generate MCQ based on chat context"""
    try:
        # Authentication disabled for demo/development
        # user_email = getattr(request.state, 'user_email', None)
        # if not user_email:
        #     raise HTTPException(status_code=401, detail="User not authenticated")
        
        mcq_result = await chat_manager.generate_mcq(mcq_request.session_id)
        
        if mcq_result["success"]:
            return {
                "response": mcq_result["mcq"]["question"],
                "data": mcq_result["mcq"]
            }
        else:
            raise HTTPException(status_code=400, detail=mcq_result["message"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/diagram")
async def diagram_endpoint(diagram_request: DiagramRequest, request: Request):
    """Get relevant diagram based on user query + chat context"""
    try:
        # Authentication disabled for demo/development
        # user_email = getattr(request.state, 'user_email', None)
        # if not user_email:
        #     raise HTTPException(status_code=401, detail="User not authenticated")
        
        result = await chat_manager.get_relevant_diagram(
            session_id=diagram_request.session_id
        )
        print(f"Result: {result}")
        
        if result["success"]:
            return {
                "response": result["diagram"]["description"],
                "data": result["diagram"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/video")
async def video_endpoint(topic_request: TopicRequest, request: Request):
    """Get relevant videos based on chat context"""
    try:
        # Authentication disabled for demo/development
        # user_email = getattr(request.state, 'user_email', None)
        # if not user_email:
        #     raise HTTPException(status_code=401, detail="User not authenticated")
        
        result = await chat_manager.get_relevant_videos(topic_request.session_id)
        
        if result["success"]:
            # Create a user-friendly message
            message = f"Found videos for {result['topic']}:"
            if result["videos"]["urdu"]:
                message += "\nUrdu videos available"
            if result["videos"]["english"]:
                message += "\nEnglish videos available"
            
            return {
                "response": message,
                "data": result["videos"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["message"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/chats")
async def get_user_chats_endpoint(request: Request):
    # Authentication disabled for demo/development
    # user_email = getattr(request.state, 'user_email', None)
    # if not user_email:
    #     raise HTTPException(status_code=401, detail="User not authenticated")
    
    user_email = "demo@example.com"  # Use demo email for development
    chats = await chat_manager.get_user_chats(user_email)
    return {"chats": chats}

@app.get("/chats/{chatId}/messages")
async def get_chat_messages_endpoint(chatId: str, request: Request):
    # Authentication disabled for demo/development
    # user_email = getattr(request.state, 'user_email', None)
    # if not user_email:
    #     raise HTTPException(status_code=401, detail="User not authenticated")
    
    messages = await chat_manager.get_chat_messages(chatId)
    return {"messages": messages}

@app.post("/chats/{chatId}/messages")
async def post_message_endpoint(chatId: str, req: NewMessageRequest, request: Request):
    # Authentication disabled for demo/development
    # user_email = getattr(request.state, 'user_email', None)
    # if not user_email:
    #     raise HTTPException(status_code=401, detail="User not authenticated")
    
    user_email = "demo@example.com"  # Use demo email for development
    message = {
        "role": req.role,
        "content": req.content,
        "attachmentType": req.attachmentType,
        "attachmentData": req.attachmentData
    }
    await chat_manager.save_message(chatId, message, user_email)
    return {"status": "ok"}

@app.post("/chats/{chatId}/delete")
async def delete_chat_endpoint(chatId: str, request: Request):
    # Authentication disabled for demo/development
    # user_email = getattr(request.state, 'user_email', None)
    # if not user_email:
    #     raise HTTPException(status_code=401, detail="User not authenticated")
    
    user_email = "demo@example.com"  # Use demo email for development
    # Update the chat's isDeleted field to true
    result = await chat_manager.soft_delete_chat(chatId, user_email)
    if result:
        return {"status": "ok"}
    else:
        raise HTTPException(status_code=404, detail="Chat not found or not authorized")
@app.get("/chats/{chatId}/load_recent_context")
async def load_recent_context(chatId: str, sessionId: str, request: Request):
    """
    Whenever user switches to a new chat, load last 6 messages into self.chat_histories.
    """
    # Authentication disabled for demo/development
    # user_email = getattr(request.state, 'user_email', None)
    # if not user_email:
    #     raise HTTPException(status_code=401, detail="User not authenticated")
    
    # Possibly verify user owns chatId if needed
    await chat_manager.load_recent_context_for_chat(chatId, sessionId)
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8007, reload=True)
