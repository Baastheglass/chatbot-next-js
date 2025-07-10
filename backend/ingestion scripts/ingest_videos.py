# ingest_videos.py
import os
from pathlib import Path
from typing import Dict, List, Optional
from tqdm import tqdm
from vectordb_manager import VectorDBManager
from utils import log_info, log_error
from dotenv import load_dotenv
from typing import Any

load_dotenv()

class VideoIngester:
    def __init__(self):
        self.vectordb = VectorDBManager(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        # Update base_path to point to Data in root directory
        self.base_path = Path(__file__).parent.parent / "Data"  # This will go up one level from backend to root

    async def process_topic_videos(self, topic: str):
        """Process videos for a topic"""
        topic_path = self.base_path / topic
        video_file = topic_path / "Video.txt"
        
        # Debug print
        print(f"Looking for video file at: {video_file}")
        
        if not video_file.exists():
            log_info(f"No video file found for topic: {topic} at path: {video_file}")
            return

        video_data = self.parse_video_file(str(video_file))
        if not video_data:
            return

        # Create embeddings for each language version if available
        try:
            description = video_data["description"]
            if video_data["urdu_url"]:
                await self.vectordb.add_video(
                    url=video_data["urdu_url"],
                    description=description,
                    topic=topic,
                    language="urdu"
                )
                print(f"Added Urdu video for {topic}")

            if video_data["english_url"]:
                await self.vectordb.add_video(
                    url=video_data["english_url"],
                    description=description,
                    topic=topic,
                    language="english"
                )
                print(f"Added English video for {topic}")

            log_info(f"Processed videos for topic: {topic}")
        except Exception as e:
            log_error(f"Error processing videos for topic {topic}: {e}")

    def parse_video_file(self, file_path: str) -> Dict[str, Any]:
        """Parse video.txt file to extract description and URLs"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read().strip()
            
            video_data = {
                "description": "",
                "urdu_url": None,
                "english_url": None
            }

            lines = content.split('\n')
            current_section = None

            for line in lines:
                line = line.strip()
                if line.startswith('Description:'):
                    video_data["description"] = line.replace('Description:', '').strip()
                elif line.startswith('Urdu:'):
                    current_section = "urdu"
                elif line.startswith('English:'):
                    current_section = "english"
                elif line.startswith('Link:') and current_section:
                    url = line.replace('Link:', '').strip()
                    if current_section == "urdu":
                        video_data["urdu_url"] = url
                    else:
                        video_data["english_url"] = url

            return video_data

        except Exception as e:
            log_error(f"Error parsing video file {file_path}: {e}")
            return None

    

async def main():
    ingester = VideoIngester()
    
    topics = [
        "tuberculosis",
        "turner_syndrome",
        "trigeminal_neuralgia",
        "colorectal_cancer",
        "lumbar_disc_herniation"
    ]

    for topic in tqdm(topics):
        try:
            await ingester.process_topic_videos(topic)
        except Exception as e:
            log_error(f"Error processing topic {topic}: {e}")
            continue

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())