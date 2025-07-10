# vectordb_manager.py
from typing import List, Dict, Any
import uuid
import os
from dotenv import load_dotenv
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from utils import log_info, log_error
from constants import CHUNK_SIZE, PAGE_SIZE, VECTOR_SIZE, COLLECTION_NAME
load_dotenv()
client = OpenAI()
# Setup OpenAI
client.api_key = os.getenv("OPENAI_API_KEY")
class VectorDBManager:
    def __init__(self, url: str, api_key: str):
        self.client = QdrantClient(url=url, api_key=api_key)
        self.EMBEDDING_MODEL = "text-embedding-3-large"
        
        # Initialize collection
        self.create_collection()

    def create_collection(self):
        """Create collection if it doesn't exist"""
        try:
            if not self.client.collection_exists(COLLECTION_NAME):
                self.client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=VECTOR_SIZE,
                        distance=Distance.COSINE
                    )
                )
                log_info(f"Collection {COLLECTION_NAME} created")
            else:
                log_info(f"Collection {COLLECTION_NAME} already exists")
        except Exception as e:
            log_error(f"Error creating collection: {e}")
            raise e

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI"""
        try:
            response = client.embeddings.create(
                input=text,
                model=self.EMBEDDING_MODEL
            )
            return response.data[0].embedding
        except Exception as e:
            log_error(f"Error generating embedding: {e}")
            raise e

    def _split_into_pages(self, content: str) -> List[str]:
        """Split content into pages based on word count"""
        words = content.split()
        pages = []
        
        for i in range(0, len(words), PAGE_SIZE):
            page = ' '.join(words[i:i + PAGE_SIZE])
            pages.append(page)
        
        return pages

    def _split_into_chunks(self, content: str) -> List[str]:
        """Split content into chunks based on word count"""
        words = content.split()
        chunks = []
        
        for i in range(0, len(words), CHUNK_SIZE):
            chunk = ' '.join(words[i:i + CHUNK_SIZE])
            chunks.append(chunk)
            
        return chunks

    def _get_sibling_chunks(self, chunks: List[str], chunk_index: int) -> Dict[str, str]:
        """Get previous and next chunks as context"""
        return {
            "previous_chunk": chunks[chunk_index - 1] if chunk_index > 0 else "",
            "current_chunk": chunks[chunk_index],
            "next_chunk": chunks[chunk_index + 1] if chunk_index < len(chunks) - 1 else ""
        }

    def add_medical_content(self, content: str, topic: str):
        """Add medical content with hierarchical structure"""
        try:
            # Level 1: Topic level
            topic_embedding = self.generate_embedding(topic)
            topic_point = PointStruct(
                id=int(uuid.uuid4().hex[:8], 16),
                vector=topic_embedding,
                payload={
                    "content": topic,
                    "topic": topic,
                    "level": 1
                }
            )
            self.client.upsert(collection_name=COLLECTION_NAME, points=[topic_point])
            log_info(f"Added topic level content for: {topic}")

            # Level 2: Page level
            pages = self._split_into_pages(content)
            for page_num, page_content in enumerate(pages, 1):
                page_embedding = self.generate_embedding(page_content)
                page_point = PointStruct(
                    id=int(uuid.uuid4().hex[:8], 16),
                    vector=page_embedding,
                    payload={
                        "content": page_content,
                        "topic": topic,
                        "level": 2,
                        "page_num": page_num
                    }
                )
                self.client.upsert(collection_name=COLLECTION_NAME, points=[page_point])
                log_info(f"Added page {page_num} for topic: {topic}")

                # Level 3: Chunk level
                chunks = self._split_into_chunks(page_content)
                for chunk_num, chunk_content in enumerate(chunks):
                    chunk_embedding = self.generate_embedding(chunk_content)
                    context = self._get_sibling_chunks(chunks, chunk_num)
                    
                    chunk_point = PointStruct(
                        id=int(uuid.uuid4().hex[:8], 16),
                        vector=chunk_embedding,
                        payload={
                            "content": chunk_content,
                            "topic": topic,
                            "level": 3,
                            "page_num": page_num,
                            "chunk_num": chunk_num,
                            "context": context
                        }
                    )
                    self.client.upsert(collection_name=COLLECTION_NAME, points=[chunk_point])
                    log_info(f"Added chunk {chunk_num} of page {page_num} for topic: {topic}")
                    
        except Exception as e:
            log_error(f"Error adding content for topic {topic}: {e}")
            raise e

    def search_content(self, query: str, topic: str = None, chunk_limit: int = None) -> List[Dict]:
        """Search content with optional topic filter"""
        try:
            query_vector = self.generate_embedding(query)
            
            # Prepare filter conditions
            filter_conditions = []
            if topic:
                filter_conditions.append(
                    FieldCondition(key="topic", match=MatchValue(value=topic))
                )
            # Always get chunk-level content (level 3)
            filter_conditions.append(
                FieldCondition(key="level", match=MatchValue(value=3))
            )
            
            results = self.client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                limit=chunk_limit,
                query_filter=Filter(must=filter_conditions) if filter_conditions else None
            )

            return [{
                "content": hit.payload["content"],
                "topic": hit.payload["topic"],
                "context": hit.payload["context"],
                "score": hit.score,
                "page_num": hit.payload["page_num"],
                "chunk_num": hit.payload["chunk_num"]
            } for hit in results]
            
        except Exception as e:
            log_error(f"Error searching content: {e}")
            return []
    async def add_diagram(self, image_path: str, description: str, topic: str, diagram_type: str):
        """Add diagram with description to vector DB"""
        try:
            embedding = self.generate_embedding(description)
            
            point = PointStruct(
                id=int(uuid.uuid4().hex[:8], 16),
                vector=embedding,
                payload={
                    "image_path": image_path,
                    "description": description,
                    "topic": topic,
                    "diagram_type": diagram_type,
                    "content_type": "diagram"  # Add this to identify diagrams
                }
            )
            
            self.client.upsert(
                collection_name=COLLECTION_NAME,  
                points=[point]
            )
            
            log_info(f"Added diagram for topic: {topic}")
            
        except Exception as e:
            log_error(f"Error adding diagram: {e}")
            raise e

    async def search_diagrams(self, query: str, topic: str = None, limit: int = 1) -> List[Dict]:
        """Search for relevant diagrams"""
        try:
            query_vector = self.generate_embedding(query)
            
            # Build filter conditions
            filter_conditions = [
                FieldCondition(key="content_type", match=MatchValue(value="diagram"))  # Matches your DB field name
            ]
            if topic:
                filter_conditions.append(
                    FieldCondition(key="topic", match=MatchValue(value=topic))
                )
            
            results = self.client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                limit=limit,
                query_filter=Filter(must=filter_conditions) if filter_conditions else None
            )
            print(f"Results: {results}")
            
            return [{
                "image_path": hit.payload.get("image_path"),
                "description": hit.payload.get("description"),
                "topic": hit.payload.get("topic"),
                "diagram_type": hit.payload.get("diagram_type"),  # Keep as type in return for frontend
                "score": hit.score
            } for hit in results]
            
        except Exception as e:
            log_error(f"Error searching diagrams: {e}")
            return []

    async def add_video(self, url: str, description: str, topic: str, language: str):
        """Add video with description to vector DB"""
        try:
            # Create embedding from description and topic
            embed_text = f"{description} {topic} video {language}"
            embedding = self.generate_embedding(embed_text)
            
            point = PointStruct(
                id=int(uuid.uuid4().hex[:8], 16),
                vector=embedding,
                payload={
                    "url": url,
                    "description": description,
                    "topic": topic,
                    "language": language,
                    "content_type": "video"
                }
            )
            
            self.client.upsert(
                collection_name=COLLECTION_NAME,
                points=[point]
            )
            
            log_info(f"Added {language} video for topic: {topic}")
            
        except Exception as e:
            log_error(f"Error adding video: {e}")
            raise e

    async def search_videos(self, query: str, topic: str = None, language: str = None) -> List[Dict]:
        """Search for relevant videos"""
        try:
            query_vector = self.generate_embedding(query)
            
            filter_conditions = [
                FieldCondition(key="content_type", match=MatchValue(value="video"))
            ]
            
            if topic:
                filter_conditions.append(
                    FieldCondition(key="topic", match=MatchValue(value=topic))
                )
            
            if language:
                filter_conditions.append(
                    FieldCondition(key="language", match=MatchValue(value=language))
                )
            
            results = self.client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                limit=2,  # Get more to have both languages if available
                query_filter=Filter(must=filter_conditions)
            )
            print(f"Results: {results}")
            
            return [{
                "url": hit.payload.get("url"),
                "description": hit.payload.get("description"),
                "topic": hit.payload.get("topic"),
                "language": hit.payload.get("language"),
                "relevance_score": hit.score
            } for hit in results]
            
        except Exception as e:
            log_error(f"Error searching videos: {e}")
            return []