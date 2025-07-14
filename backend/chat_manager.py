# chat_manager.py
from dotenv import load_dotenv
from openai import AsyncOpenAI
import httpx
from typing import List, Dict, Optional
from vectordb_manager import VectorDBManager
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
import os
from utils import log_info, log_error
import uuid
import json
from constants import VALID_TOPICS, DEFAULT_SYSTEM_PROMPT
MCQ_STORE_PATH = "mcq_store.json"
load_dotenv()

# Create OpenAI client for fallback
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ChatManager:
    def __init__(self, vectordb: VectorDBManager):
        self.vectordb = vectordb
        self.chat_histories = {}  # Dictionary to store chat histories by session_id
        self.CHAT_MODEL = "gpt-4o-mini"  # OpenAI fallback model
        self.VALID_TOPICS = VALID_TOPICS
        self.generated_mcqs = {}
        self.db = AsyncIOMotorClient(os.getenv("MONGODB_URI"))["test"]
        # OpenRouter configuration
        self.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
        self.DEFAULT_OPENROUTER_MODEL = "anthropic/claude-3-haiku"
        
    
    async def create_chat(self, user_email: str,chat_title:str) -> str:
        """Create a new chat for user"""
        chat_id = str(uuid.uuid4())
        
        await self.db.chats.insert_one({
            "chatId": chat_id,
            "userId": user_email,
            "title": chat_title,  
            "lastActive": datetime.utcnow(),
            "createdAt": datetime.utcnow(),
            "currentTopic": None,
            "isDeleted": False
        })
        
        return chat_id

    async def save_message(self, chat_id: str, message: dict, user_email: str):
        """Save message to MongoDB"""
        try:
            # If this is an MCQ answer update
            if (message.get("attachmentType") == "mcq" and 
                message.get("attachmentData", {}).get("isAnswered")):
                
                # Update existing MCQ instead of creating new record
                result = await self.db.chat_messages.update_one(
                    {
                        "chatId": chat_id,
                        "attachments.type": "mcq",
                        "attachments.data.question": message["attachmentData"]["question"]
                    },
                    {"$set": {
                        "attachments.data.isAnswered": True,
                        "attachments.data.userAnswer": message["attachmentData"]["userAnswer"],
                        "attachments.data.isCorrect": message["attachmentData"]["isCorrect"]
                    }}
                )
                
                if result.modified_count > 0:
                    # Update successful
                    return None
                
            # For new messages or if update failed
            message_doc = {
                "messageId": str(uuid.uuid4()),
                "chatId": chat_id,
                "userId": user_email,
                "type": message["role"],
                "content": message["content"],
                "timestamp": datetime.utcnow()
            }

            if message.get("attachmentType") and "attachmentData" in message:
                if message["attachmentType"] == "mcq":
                    message_doc["attachments"] = {
                        "type": "mcq",
                        "data": {
                            "question": message["attachmentData"]["question"],
                            "options": message["attachmentData"]["options"],
                            "correct_answer": message["attachmentData"]["correct_answer"],
                            "explanation": message["attachmentData"]["explanation"],
                            "isAnswered": message["attachmentData"].get("isAnswered", False),
                            "userAnswer": message["attachmentData"].get("userAnswer"),
                            "isCorrect": message["attachmentData"].get("isCorrect")
                        }
                    }
                elif message["attachmentType"] == "diagram":
                    message_doc["attachments"] = {
                        "type": "diagram",
                        "data": message["attachmentData"]
                    }
                elif message["attachmentType"] == "video":
                    # Video handling
                    message_doc["attachments"] = {
                        "type": "video",
                        "data": {
                            "english": message["attachmentData"]["english"],
                            "urdu": message["attachmentData"]["urdu"]
                        }
                    }

            # Insert new message
            await self.db.chat_messages.insert_one(message_doc)
            
            # Update chat's lastActive
            await self.db.chats.update_one(
                {"chatId": chat_id},
                {"$set": {"lastActive": datetime.utcnow()}}
            )
            
            return message_doc
            
        except Exception as e:
            log_error(f"Error saving message: {e}")
            raise e
    async def get_chat_messages(self, chat_id: str, limit: int = 50) -> List[dict]:
        """Get messages for a chat"""
        messages = []
        async for msg in self.db.chat_messages.find(
            {"chatId": chat_id}
        ).sort("timestamp", 1).limit(limit):
            # Convert to format expected by get_response
            message = {
                "role": msg["type"],
                "content": msg["content"]
            }
            
                    # Add any attachments
            if "attachments" in msg:
                        message["attachmentType"] = msg["attachments"]["type"]
                        message["attachmentData"] = msg["attachments"]["data"]
            messages.append(message)
            
        return messages

    async def get_user_chats(self, user_email: str) -> List[dict]:
        """Get all chats for a user"""
        chats = []
        async for chat in self.db.chats.find(
            {"userId": user_email, "isDeleted": False}
        ).sort("lastActive", -1):
            chats.append({
                "chatId": chat["chatId"],
                "title": chat["title"],
                "lastActive": chat["lastActive"],
                "currentTopic": chat["currentTopic"]
            })
        return chats
    def _save_mcqs_to_disk(self):
        """Append the current in-memory MCQs to disk."""
        try:
            # Read existing MCQs from disk
            try:
                with open(MCQ_STORE_PATH, "r", encoding="utf-8") as f:
                    existing_mcqs = json.load(f)
            except FileNotFoundError:
                existing_mcqs = []

            # Append new MCQs to existing ones
            if isinstance(self.generated_mcqs, dict):
                updated_mcqs = existing_mcqs + [self.generated_mcqs]
            else:
                updated_mcqs = existing_mcqs + self.generated_mcqs

            # Write updated MCQs back to disk
            with open(MCQ_STORE_PATH, "w", encoding="utf-8") as f:
                json.dump(updated_mcqs, f, ensure_ascii=False, indent=2)
            
        except Exception as e:
            log_error(f"Failed to write {MCQ_STORE_PATH}: {e}")
   # -------------------------------------------------
    # 1) NEW METHOD: Directly extract topic from the user query alone.
    # -------------------------------------------------
    async def extract_topic_from_query(self, user_query: str) -> Dict:
        """
        1) If user_query explicitly references exactly one VALID topic => return that topic.
        2) If user_query references a topic not in VALID_TOPICS => return "none" but mark `explicit_invalid=True`.
        3) If user_query does not mention any topic => return "none" + `explicit_invalid=False`.
        """
        try:
            # Prepare system prompt
            # We will instruct GPT to tell us:
            #   - "topic" is one of {your list} or "none"
            #   - Also, if it is an invalid topic, "invalid"=true; if no topic, "invalid"=false
            # That way we can differentiate "facial nerve" vs. user said nothing.
            valid_list_str = ", ".join(self.VALID_TOPICS.values())

            system_prompt = f"""
            You are a business advisor for ai powered applications/tools.
            Overview:
            I want to build an ai-powered SAAS targeted towards businesses that want to understand how ai can help solve the businesses challenges. The SAAS will be in the form of an online browser based application. The aim of the SAAS is simple, it's a tool that businesses owners, directors and managers can use to gain an understanding of the possibilities of ai within their business, and consequently, helping generate leads for stratos ai.
            Target market
            The target market is business owners. In stratos ai's experience, talking with hundreds of business owners, the key challenge that they face is that they are unaware of the capabilities of ai. During discover calls with these business owners, I showcase to them the power of ai (no code and code tools), and how powerful it really is, and every single call ends in the business owners mind expanding to the possibilities. Some of the features I showcase is how AI admin, voice and chat assistants can be deployed in the business to alleviate bottlenecks, challenges and help the business become more productive.
            The rough idea:
            The saas will act as a virtual AI consultant, essentially replicating everything that I manually do with businesses - undertaking a discovery, identifying challenges, planning out an AI solution to solve the challenges, and put together a solution architecture for them. The SAAS will guide the business owner through a series of questions which will help in discovering existing challenges/inefficiencies in the business which AI can assist with. Below is an example of what kind of questions will be asked to the business owner:
            - What is the name of the company
            - What industry is the company in
            - Describe the company in one paragraph
            - What are the companies core products or services
            - What are the companies goals for this year? (operational, revenue)
            - What CRM does the company use?
            - Are there any other tools that are used? (E.g. Xero for accounting, Slack for communication, etc)
            - What are the major challenges in the business that have a digital footprint?
            - If you have a magic wand, which top 3 challenges would you want AI to solve?
            - Have you used any AI tools before?
            There will potentially be more questions that we'll add later, but for now that provides context of what the SAAS is attempting to understand from the customer. Once SAAS has this information, AI will work to form an understanding of the business, it's challenges, softwares used and provide a viable solution. The solution is just an idea for them, and it isn't implemented for them. The purpose of showcasing the solutions is two-fold: one to show them the real power of how ai can help their business, and two for stratos ai to engage the lead via email or call and work to secure the business as a paying client.
            The solution would be provided to them on the next web page, and give them a report, alongside a graphic and a voice option where AI assistant explains the solution. A rough example of a solution would be "the challenge that exists in your customer service department of leads not being instantly engaged by the sales team can be solved via AI by deploying an ai voice and chat assistant which operates via a phone call and SMS. As soon as a lead enters into your CRM Monday.com, the AI assistant will recognise this new lead and will first call them to qualify them, and if the lead doesn't answer it'll send them an SMS. The AI assistant will work to qualify the lead via the mentioned communication channels. The status of the lead, all details and conversations transcripts will automatically sync into your CRM monday.com, and appear under the leads contact profile."
            Commercials
            I haven't quite planned this out yet, but a rough idea is that businesses would pay a one-time fee to access the SAAS tool. It could also be a monthly subscription but I'm not sure if it's valuable to a business to pay monthly for such as tool as they will generally use it once or twice to generate ideas for solutions and then cancel.
            Given the above idea, I want you to:
            Give me feedback on the overall idea
            Highlight my blindspots and what I have overlooked
            Provide with simple stress tests for the idea
            Provide me with 3 routes to market """

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ]

            response = await openai_client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=messages,
                temperature=0.1
            )

            raw_content = response.choices[0].message.content
            print(f"[extract_topic_from_query] raw LLM response: {raw_content}")

            # Parse JSON
            result_json = json.loads(raw_content)
            raw_topic = result_json.get("topic", "none")
            invalid_flag = result_json.get("invalid", False)  # True or False

            # Convert raw_topic → normalized_topic
            normalized_topic = None
            for key, val in self.VALID_TOPICS.items():
                if raw_topic == val:  # exact match
                    normalized_topic = key
                    break

            if normalized_topic:
                # user explicitly referenced a valid topic
                return {
                    "success": True,
                    "topic": normalized_topic,
                    "confidence": 1.0,
                    "explicit_invalid": False
                }
            else:
                # either "none" because no mention, or "none" because invalid
                return {
                    "success": True,
                    "topic": None,
                    "confidence": 0.0,
                    "explicit_invalid": bool(invalid_flag)
                }

        except Exception as e:
            log_error(f"Error extracting topic from query: {e}")
            return {
                "success": False,
                "topic": None,
                "confidence": 0.0,
                "explicit_invalid": False,
                "message": str(e)
            }


    # -------------------------------------------------
    # 2) Existing method: fallback to chat history
    # -------------------------------------------------
    async def extract_topic_from_chat(self, session_id: str) -> Dict:
        """
        Extract the business topic being discussed from chat history,
        using only first 50 words from each message to save tokens.
        """
        try:
            if session_id not in self.chat_histories:
                return {
                    "success": False,
                    "message": "No chat history found",
                    "topic": None,
                    "confidence": 0.0
                }

            # Get recent messages and truncate each to 50 words
            truncated_messages = []
            for msg in self.chat_histories[session_id][-2:]:  # Last 2 messages
                # Split into words and take first 50
                words = msg["content"].split()
                truncated_text = " ".join(words[:50])
                if len(words) > 50:
                    truncated_text += "..."  # Add ellipsis if truncated
                truncated_messages.append(truncated_text)

            # Join truncated messages
            recent_context = " ".join(truncated_messages)

            # Prepare prompt for GPT
            system_prompt = f""" You are a business advisor for ai powered applications/tools.
Overview:
I want to build an ai-powered SAAS targeted towards businesses that want to understand how ai can help solve the businesses challenges. The SAAS will be in the form of an online browser based application. The aim of the SAAS is simple, it's a tool that businesses owners, directors and managers can use to gain an understanding of the possibilities of ai within their business, and consequently, helping generate leads for stratos ai.
Target market
The target market is business owners. In stratos ai's experience, talking with hundreds of business owners, the key challenge that they face is that they are unaware of the capabilities of ai. During discover calls with these business owners, I showcase to them the power of ai (no code and code tools), and how powerful it really is, and every single call ends in the business owners mind expanding to the possibilities. Some of the features I showcase is how AI admin, voice and chat assistants can be deployed in the business to alleviate bottlenecks, challenges and help the business become more productive.
The rough idea:
The saas will act as a virtual AI consultant, essentially replicating everything that I manually do with businesses - undertaking a discovery, identifying challenges, planning out an AI solution to solve the challenges, and put together a solution architecture for them. The SAAS will guide the business owner through a series of questions which will help in discovering existing challenges/inefficiencies in the business which AI can assist with. Below is an example of what kind of questions will be asked to the business owner:
- What is the name of the company
- What industry is the company in
- Describe the company in one paragraph
- What are the companies core products or services
- What are the companies goals for this year? (operational, revenue)
- What CRM does the company use?
- Are there any other tools that are used? (E.g. Xero for accounting, Slack for communication, etc)
- What are the major challenges in the business that have a digital footprint?
- If you have a magic wand, which top 3 challenges would you want AI to solve?
- Have you used any AI tools before?
There will potentially be more questions that we'll add later, but for now that provides context of what the SAAS is attempting to understand from the customer. Once SAAS has this information, AI will work to form an understanding of the business, it's challenges, softwares used and provide a viable solution. The solution is just an idea for them, and it isn't implemented for them. The purpose of showcasing the solutions is two-fold: one to show them the real power of how ai can help their business, and two for stratos ai to engage the lead via email or call and work to secure the business as a paying client.
The solution would be provided to them on the next web page, and give them a report, alongside a graphic and a voice option where AI assistant explains the solution. A rough example of a solution would be "the challenge that exists in your customer service department of leads not being instantly engaged by the sales team can be solved via AI by deploying an ai voice and chat assistant which operates via a phone call and SMS. As soon as a lead enters into your CRM Monday.com, the AI assistant will recognise this new lead and will first call them to qualify them, and if the lead doesn't answer it'll send them an SMS. The AI assistant will work to qualify the lead via the mentioned communication channels. The status of the lead, all details and conversations transcripts will automatically sync into your CRM monday.com, and appear under the leads contact profile."
Commercials
I haven't quite planned this out yet, but a rough idea is that businesses would pay a one-time fee to access the SAAS tool. It could also be a monthly subscription but I'm not sure if it's valuable to a business to pay monthly for such as tool as they will generally use it once or twice to generate ideas for solutions and then cancel.
Given the above idea, I want you to:
Give me feedback on the overall idea
Highlight my blindspots and what I have overlooked
Provide with simple stress tests for the idea
Provide me with 3 routes to market """

            user_content = (
    f"Chat context:\nPrevious message: {truncated_messages[0] if len(truncated_messages) > 1 else ''}\n"
    f"Latest message: {truncated_messages[-1]}\n\n"
    "Determine the topic being discussed, prioritizing the topic from the latest message."
)


            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_content
                }
            ]

            response = await openai_client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=messages,
                temperature=0.1
            )

            raw_content = response.choices[0].message.content
            print(f"[extract_topic_from_chat] raw LLM response: {raw_content}")

            # Parse response
            try:
                parsed = json.loads(raw_content)
                topic = parsed.get("topic", "none").lower()
                confidence = float(parsed.get("confidence", 0.0))

                # Normalize topic name
                normalized_topic = None
                for key, value in self.VALID_TOPICS.items():
                    if value in topic:
                        normalized_topic = key
                        break

                return {
                    "success": True,
                    "topic": normalized_topic,
                    "confidence": confidence,
                    "message": None
                }

            except (json.JSONDecodeError, ValueError) as e:
                return {
                    "success": False,
                    "message": "Failed to parse topic analysis",
                    "topic": None,
                    "confidence": 0.0
                }

        except Exception as e:
            log_error(f"Error extracting topic from chat: {e}")
            return {
                "success": False,
                "message": str(e),
                "topic": None,
                "confidence": 0.0
            }
    # -------------------------------------------------
    # 3) Example usage: new "resolve_current_topic" method 
    #    that tries the direct query first, then fallback
    # -------------------------------------------------
    async def resolve_current_topic(self, user_query: Optional[str], session_id: str) -> Dict:
        """
        If user_query is provided:
        1) First pass: extract_topic_from_query(user_query)
            - If recognized => return
            - If invalid => return none => skip older chat
            - If none => second pass
        If user_query is empty/None:
        => directly do second pass using chat history
        """
        if user_query and user_query.strip():
            # --- FIRST PASS ---
            direct_check = await self.extract_topic_from_query(user_query)
            if not direct_check["success"]:
                return {
                    "success": False,
                    "topic": None,
                    "confidence": 0.0,
                    "message": direct_check.get("message", "extract_topic_from_query error")
                }

            # If recognized a valid topic
            if direct_check["topic"] is not None:
                return direct_check

            # If it's explicitly invalid => skip fallback => return none
            if direct_check.get("explicit_invalid") is True:
                return {
                    "success": True,
                    "topic": None,
                    "confidence": 0.0,
                    "message": "User explicitly mentioned an unrecognized topic, skipping fallback"
                }
            # Otherwise => user typed no topic => fallback to chat
            # --- SECOND PASS ---
            fallback_check = await self.extract_topic_from_chat(session_id)
            return fallback_check
        else:
            # If user_query is empty or None => skip first pass entirely
            # go straight to fallback
            fallback_check = await self.extract_topic_from_chat(session_id)
            return fallback_check


    def _generate_session_id(self):
        """Generate unique session ID"""
        return str(uuid.uuid4())

    def create_session(self) -> str:
        """Create new chat session"""
        session_id = self._generate_session_id()
        self.chat_histories[session_id] = []
        return session_id

    def add_message(self, session_id: str, message: dict):
        """Add message to chat history"""
        if session_id not in self.chat_histories:
            self.chat_histories[session_id] = []
        self.chat_histories[session_id].append(message)



    async def classify_message_intent(self, message: str) -> Dict:
        """Classify user message to detect if they want MCQ/video/diagram"""
        
        # Prepare classification prompt
        messages = [
            {
                "role": "system",
                "content": """Analyze the user message and determine if they are requesting any of these:
                1. Multiple Choice Question (MCQ)
                2. Video
                3. Diagram

                Return response in EXACT format:
                {
                    "intent": "mcq/video/diagram/none",
                    "confidence": confidence_score_between_0_and_1
                }

                Examples of intents:
                MCQ:
                - "Give me a practice question"
                - "Can I have an MCQ"
                - "Test my knowledge"
                - "Quiz me about this"
                
                Video:
                - "Show me a video"
                - "Is there a video about this"
                - "Can I watch something about this"
                
                Diagram:
                - "Show me a diagram"
                - "Can I see an illustration"
                - "Is there a picture explaining this"
                
                Return "none" if no clear intent is detected."""
            },
            {
                "role": "user",
                "content": f"User message: {message}"
            }
        ]

        try:
            # Get classification from GPT
            response = await openai_client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=messages,
                temperature=0.1
            )

            result = json.loads(response.choices[0].message.content)
            return {
                "success": True,
                "intent": result["intent"],
                "confidence": float(result["confidence"])
            }
        except Exception as e:
            log_error(f"Error classifying message: {e}")
            return {
                "success": False,
                "intent": "none",
                "confidence": 0.0
            }


    def get_context_from_db(self, query: str,chunk_limit: int = 3) -> str:
        """Get relevant context from vector DB"""
        results = self.vectordb.search_content(query, chunk_limit=chunk_limit)
        
        if not results:
            return ""
        
        # Format context from results
        context = ""
        for result in results:
            # Include the main content and its context
            context += f"\nContent: {result['content']}\n"
            if result['context']['previous_chunk']:
                context += f"Previous context: {result['context']['previous_chunk']}\n"
            if result['context']['next_chunk']:
                context += f"Following context: {result['context']['next_chunk']}\n"
            context += f"(Relevance: {result['score']:.2f})\n"
            
        return context

    async def get_response(self, message: str, session_id: str, openrouter_api_key: str = None, openrouter_model: str = None, system_prompt: str = None) -> str:
        try:
            # Add user message to history
            self.add_message(session_id, {
                "role": "user",
                "content": message
            })

            # Get recent messages including diagram context
            diagram_context = None
            mcq_context = None
            chat_history = self.chat_histories[session_id][-6:]
            for msg in chat_history:
                if "diagram_context" in msg:
                    diagram_context = msg["diagram_context"]
                if "mcq_context" in msg:
                    mcq_context = msg["mcq_context"]

            # Use custom system prompt if provided, otherwise use default business advisor prompt
            if system_prompt and system_prompt.strip():
                system_content = system_prompt.strip()
                log_info(f"Using custom system prompt: {system_content[:100]}...")
            else:
                system_content = DEFAULT_SYSTEM_PROMPT
                log_info("Using default business advisor system prompt")
            
            # Add context enhancements for diagrams and MCQs
            if diagram_context:
                system_content += f"\n\nThere is a diagram being discussed that shows: {diagram_context['description']}"
            if mcq_context and mcq_context.get("isAnswered"):
                system_content += f"\n\nWe were discussing an MCQ question: {mcq_context['question']}"
                system_content += f"\nThe correct answer was: {mcq_context['correct_answer']}"
            elif mcq_context:
                system_content += f"\n\nWe are discussing an MCQ question: {mcq_context['question']}"

            messages = [
                {
                    "role": "system",
                    "content": system_content
                }
            ]
            # Add relevant chat history
            for msg in chat_history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"],
                    **({"diagram_context": msg.get("diagram_context")} if "diagram_context" in msg else {}),
                    **({"mcq_context": msg.get("mcq_context")} if "mcq_context" in msg else {})
                })

            try:
                if openrouter_api_key and openrouter_model:
                    # Use OpenRouter (preferred)
                    log_info(f"Using OpenRouter with model: {openrouter_model}")
                    assistant_response = await self._get_openrouter_response(
                        messages, 
                        openrouter_api_key, 
                        openrouter_model
                    )
                elif openrouter_api_key:
                    # Use OpenRouter with default model
                    log_info(f"Using OpenRouter with default model: {self.DEFAULT_OPENROUTER_MODEL}")
                    assistant_response = await self._get_openrouter_response(
                        messages, 
                        openrouter_api_key, 
                        self.DEFAULT_OPENROUTER_MODEL
                    )
                else:
                    # Fallback to OpenAI
                    log_info("Using OpenAI (fallback) - no OpenRouter API key provided")
                    assistant_response = await self._get_openai_response(messages)
                
                # Add assistant response with preserved contexts
                self.add_message(session_id, {
                    "role": "assistant",
                    "content": assistant_response,
                    **({"diagram_context": diagram_context} if diagram_context else {}),
                    **({"mcq_context": mcq_context} if mcq_context else {})
                })

                return assistant_response

            except Exception as e:
                log_error(f"Error getting completion: {e}")
                return "I encountered an error while processing your request. Please try again."

        except Exception as e:
            log_error(f"Error getting response: {e}")
            return "I encountered an error while processing your request. Please try again."

    async def _get_openrouter_response(self, messages: list, api_key: str, model: str) -> str:
        """Get response from OpenRouter API using OpenAI SDK"""
        log_info(f"Making request to OpenRouter API with model: {model}")
        
        try:
            # Create OpenRouter client using OpenAI SDK with custom base URL
            openrouter_client = AsyncOpenAI(
                api_key=api_key,
                base_url=self.OPENROUTER_BASE_URL
            )
            
            response = await openrouter_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3
            )
            
            log_info(f"OpenRouter API response successful for model: {model}")
            return response.choices[0].message.content
            
        except Exception as e:
            log_error(f"OpenRouter API error: {e}")
            raise Exception(f"OpenRouter API error: {e}")

    async def _get_openai_response(self, messages: list) -> str:
        """Get response from OpenAI API (fallback) using OpenAI SDK"""
        try:
            response = await openai_client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=messages,
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as e:
            log_error(f"Error getting OpenAI response: {e}")
            raise Exception(f"Error getting OpenAI response: {e}")
            
    async def generate_mcq(self, session_id: str) -> Dict:
        """
        MCQ Generation Flow:
        1) Identify the topic from chat.
        2) Get context for that topic (chunk_limit=10 or 15).
        3) Combine that context with last 2 chat messages + previously generated MCQs.
        4) Generate a new MCQ via GPT, store it, and save to disk.
        """
        try:
            if session_id not in self.chat_histories:
                return {
                    "success": False,
                    "message": "No chat history found"
                }

            # --------------------------
            # Step 1) Identify topic
            # --------------------------
            topic_result = await self.extract_topic_from_chat(session_id)
            if not topic_result["success"] or not topic_result["topic"]:
                return {
                    "success": False,
                    "message": "Couldn't determine the topic of discussion for MCQ."
                }
            recognized_topic = topic_result["topic"]
            print(f"[generate_mcq] Identified topic: {recognized_topic}")

            # --------------------------
            # Step 2) Fetch context from DB for that topic
      
            context_for_topic = self.get_context_from_db(recognized_topic, chunk_limit=15)
            if not context_for_topic.strip():
                return {
                    "success": False,
                    "message": "No relevant context found in DB for MCQ generation."
                }

            # --------------------------
            # Also include last 2 chat messages if you want them
            # We'll just append them to the context
            # --------------------------
            last_two_msgs = self.chat_histories[session_id][-2:]
            recent_user_text = "\n\nLast 2 chat messages:\n"
            for msg in last_two_msgs:
                recent_user_text += f"- {msg['content']}\n"

            # The final combined context
            combined_context = f"Context for topic:\n{context_for_topic}\n\nRecent user text:\n{recent_user_text}"

            # --------------------------
            # Step 3) Combine older MCQs to avoid duplication
            # --------------------------
            if session_id not in self.generated_mcqs:
                self.generated_mcqs[session_id] = []
            previously_generated = self.generated_mcqs[session_id]

            old_questions_text = ""
            if previously_generated:
                old_questions_text = "\nPreviously generated MCQs:\n"
                for old_q in previously_generated:
                    # We only append the question statement
                    old_questions_text += f"- {old_q['question']}\n"


            # --------------------------
            # Now build the final GPT prompt
            # --------------------------
            messages = [
                {
                    "role": "system",
                    "content": """Generate one multiple choice question based on the provided medical context.
                    The question should test understanding of key concepts discussed.
                    The MCQ should be unique and not repeated from previous questions.
                    Always provide exactly FIVE options (A through E).
                    Avoid duplicating any old questions listed below if possible.
                    Format the response as:
                    {
                        "question": "question text",
                        "options": ["A) option1", "B) option2", "C) option3", "D) option4", "E) option5"],
                        "correct_answer": "A/B/C/D/E",
                        "explanation": "explanation of correct answer"
                    }"""
                },
                {
                    "role": "user",
                    "content": f"Context:\n{combined_context}\n\n{old_questions_text}\n\nGenerate an MCQ based on this context."
                }
            ]

            # Call GPT
            response = await openai_client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=messages,
                temperature=0.3
            )

            mcq_response = response.choices[0].message.content
            try:
                mcq_dict = json.loads(mcq_response)

                # Format the MCQ for display
                formatted_mcq = (
                    f"**MCQ**\n\n"
                    f"**Question**: {mcq_dict['question']}\n\n"
                    f"**Options**:\n" + "\n".join(mcq_dict['options']) + "\n\n"
                    f"**Answer**: {mcq_dict['correct_answer']}\n"
                    f"**Explanation**: {mcq_dict['explanation']}"
                )

                # Store in chat history
                self.add_message(session_id, {
                    "role": "assistant",
                    "content": formatted_mcq
                })

                # Save MCQ in memory + on disk
                self.generated_mcqs[session_id].append(mcq_dict)  # store entire MCQ, or just question if you prefer
                self._save_mcqs_to_disk()

                return {
                    "success": True,
                    "mcq": mcq_dict
                }
            except json.JSONDecodeError:
                return {
                    "success": False,
                    "message": "Failed to parse MCQ response"
                }

        except Exception as e:
            log_error(f"Error generating MCQ: {e}")
            return {
                "success": False,
                "message": "Error generating MCQ"
            }

    async def get_relevant_diagram(self, session_id: str, user_query: Optional[str] = None) -> Dict:
        """
        Step 1) Summarize the last AI (or user) message to get a short chunk
        Step 2) Use that short summary to embed & search diagrams
        Step 3) Return the relevant diagram
        """
        try:
            topic_result = await self.resolve_current_topic(user_query, session_id)
            if not topic_result["success"] or not topic_result["topic"]:
                return {
                    "success": False,
                    "message": "Couldn't determine a valid topic from user or chat."
                }

            recognized_topic = topic_result["topic"]

            last_ai_message = None
            for msg in reversed(self.chat_histories[session_id]):
                if msg["role"] == "assistant":
                    last_ai_message = msg["content"]
                    break

            if not last_ai_message:
                # fallback to user query or something
                last_ai_message = user_query or "diagram"

          # Summarize that message to keep it short
            short_summary = await self.summarize_for_diagram(last_ai_message)

            # 2) Combine with recognized topic and do search
            combined_query = f"{short_summary} {recognized_topic}"

            diagrams = await self.vectordb.search_diagrams(
                query=combined_query,
                topic=recognized_topic,
                limit=1
            )
            if not diagrams:
                return {
                    "success": False,
                    "message": f"No relevant diagrams found for {recognized_topic}"
                }

            diagram = diagrams[0]
            # 4) Build diagram context
            diagram_context = {
                "type": "diagram_context",
                "image_path": diagram["image_path"],
                "description": diagram["description"],
                "topic": recognized_topic,
                "diagram_type": diagram["diagram_type"]
            }

            # 5) System message
            system_message = (
                f"I am showing you a {diagram['diagram_type']} diagram related to {recognized_topic}. "
                f"The diagram shows: {diagram['description']}\n\n"
                "You can refer to this diagram in our conversation. When discussing it, be specific "
                "about what the diagram shows and how it relates to the topic."
            )
            self.add_message(session_id, {
                "role": "system",
                "content": system_message,
                "diagram_context": diagram_context
            })

            # 6) Assistant message
            self.add_message(session_id, {
                "role": "assistant",
                "content": f"Here's a relevant diagram about {recognized_topic}. What would you like to know about it?",
                "diagram_context": diagram_context
            })

            return {
                "success": True,
                "diagram": {
                    "image_path": diagram["image_path"],
                    "description": diagram["description"],
                    "topic": recognized_topic,
                    "type": diagram["diagram_type"],
                    "relevance_score": diagram["score"],
                    "context_id": str(uuid.uuid4())
                }
            }

        except Exception as e:
            log_error(f"Error getting diagram: {e}")
            return {
                "success": False,
                "message": str(e)
            }


    async def get_relevant_videos(self, session_id: str) -> Dict:
        """Get relevant videos based on chat context"""
        try:
            # First, determine the topic
            topic_result = await self.extract_topic_from_chat(session_id)
            if not topic_result["success"] or not topic_result["topic"]:
                return {
                    "success": False,
                    "message": "Couldn't determine the topic of discussion"
                }

            topic = topic_result["topic"]
            
            # Get recent context for relevance search
            recent_messages = self.chat_histories[session_id][-3:]
            context = " ".join([msg["content"] for msg in recent_messages])
            print(f"Context: {context}")
            print(f"Topic: {topic}")

            # Search for relevant videos (will get both languages if available)
            videos = await self.vectordb.search_videos(
                query=context,
                topic=topic
            )

            if not videos:
                return {
                    "success": False,
                    "message": f"No relevant videos found for {topic}"
                }

            # Organize videos by language
            organized_videos = {
                "english": [],
                "urdu": []
            }

            for video in videos:
                language = video["language"]
                if language in organized_videos:
                    organized_videos[language].append({
                        "url": video["url"],
                        "description": video["description"],
                        "relevance_score": video["relevance_score"]
                    })

            return {
                "success": True,
                "videos": organized_videos,
                "topic": topic
            }

        except Exception as e:
            log_error(f"Error getting videos: {e}")
            return {
                "success": False,
                "message": str(e)
            }
    async def summarize_for_diagram(self, text: str) -> str:
        """
        Use GPT to summarize 'text' into a short chunk (~50 words max)
        suitable for finding relevant diagrams.
        """
        try:
            # Build a system prompt that instructs GPT to do a short summary
            system_prompt = """Summarize the following text to ~50 words or fewer.
    Only include key medical terms or important concepts that would help retrieve a relevant diagram in a RAG Application.
    Omit extraneous details. Return just the summary text, with no extra formatting."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ]

            # Call GPT with low temperature for consistent summarization
            response = await openai_client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=messages,
                temperature=0.2
            )
            summary = response.choices[0].message.content.strip()

            return summary
        except Exception as e:
            log_error(f"Error in summarize_for_diagram: {e}")
            # If it fails, fallback to the original text or empty
            return text[:200]  # or just return text
    async def soft_delete_chat(self, chat_id: str, user_email: str) -> bool:
        """Soft delete a chat by setting isDeleted to True"""
        result = await self.db.chats.update_one(
            {"chatId": chat_id, "userId": user_email},
            {"$set": {"isDeleted": True}}
        )
        return result.modified_count > 0
    async def load_recent_context_for_chat(self, chat_id: str, session_id: str, limit: int = 6):
        """Load the last N messages and preserve MCQ context properly"""
        try:
            self.chat_histories[session_id] = []
            recent_msgs = []
            
            cursor = self.db.chat_messages.find({"chatId": chat_id}).sort("timestamp", -1).limit(limit)
            async for msg in cursor:
                entry = {
                    "role": msg["type"],
                    "content": msg["content"]
                }
                
                # For MCQ messages, preserve the core MCQ data only
                if "attachments" in msg and msg["attachments"]["type"] == "mcq":
                    mcq_data = msg["attachments"]["data"]
                    entry["mcq_context"] = {
                        "question": mcq_data["question"],
                        "options": mcq_data["options"],
                        "correct_answer": mcq_data["correct_answer"],
                        "explanation": mcq_data["explanation"]
                    }
                
                # For diagram messages
                elif "attachments" in msg and msg["attachments"]["type"] == "diagram":
                    entry["diagram_context"] = msg["attachments"]["data"]
                elif "attachments" in msg and msg["attachments"]["type"] == "diagram":
                    entry["video_context"] = msg["attachments"]["data"]
                    
                recent_msgs.append(entry)

            # Reverse so oldest is first
            recent_msgs.reverse()
            self.chat_histories[session_id] = recent_msgs

        except Exception as e:
            log_error(f"Error loading context for chat {chat_id}: {e}")
            self.chat_histories[session_id] = []
            raise e
