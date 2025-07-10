# backend/ingest_diagrams.py
import os
from pathlib import Path
from typing import Dict, List
from tqdm import tqdm
from vectordb_manager import VectorDBManager
from utils import log_info, log_error
from dotenv import load_dotenv
import shutil

load_dotenv()

class DiagramIngester:
    def __init__(self):
        self.vectordb = VectorDBManager(
            url=os.getenv("QDRANT_URL"),
            api_key=os.getenv("QDRANT_API_KEY")
        )
        # Update paths to match your structure
        self.root_dir = Path(__file__).parent.parent  # Gets CHATBOT-APP root
        self.data_path = self.root_dir / "Data"
        self.public_path = self.root_dir / "public"
        self.VALID_PREFIXES = ['Box', 'Fig', 'Table', 'Summary box']

    def read_description_file(self, desc_path: str) -> str:
        """Read description from text file"""
        try:
            with open(desc_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except Exception as e:
            log_error(f"Error reading description file {desc_path}: {e}")
            return ""

    def get_diagram_type(self, filename: str) -> str:
        """Get type of diagram from filename"""
        for prefix in self.VALID_PREFIXES:
            if filename.startswith(prefix):
                return prefix.lower().replace(' ', '_')
        return "unknown"

    async def process_topic_diagrams(self, topic: str):
        """Process all diagrams for a topic"""
        topic_path = self.data_path / topic
        
        if not topic_path.exists():
            log_error(f"Topic path not found: {topic_path}")
            return

        log_info(f"Processing diagrams for topic: {topic}")
        
        # Create public diagrams directory if it doesn't exist
        public_diagrams_path = self.public_path / "diagrams" / topic
        public_diagrams_path.mkdir(parents=True, exist_ok=True)
        
        # Get all PNG files
        png_files = list(topic_path.glob("*.png"))
        
        for png_file in tqdm(png_files, desc=f"Processing {topic} diagrams"):
            # Check if it's a diagram file
            if not any(png_file.name.startswith(prefix) for prefix in self.VALID_PREFIXES):
                continue

            # Get corresponding description file
            desc_file = png_file.with_suffix('.txt')
            if not desc_file.exists():
                log_error(f"Description file not found for {png_file}")
                continue

            # Read description
            description = self.read_description_file(str(desc_file))
            if not description:
                continue

            # Prepare paths
            relative_path = f"/diagrams/{topic}/{png_file.name}"
            target_path = public_diagrams_path / png_file.name

            # Copy image to public folder
            try:
                shutil.copy2(png_file, target_path)
                log_info(f"Copied {png_file.name} to public folder")
            except Exception as e:
                log_error(f"Error copying file: {e}")
                continue

            # Store in vector database
            try:
                await self.vectordb.add_diagram(
                    image_path=relative_path,
                    description=description,
                    topic=topic,
                    diagram_type=self.get_diagram_type(png_file.name)
                )
                log_info(f"Added diagram {png_file.name} to vector database")
            except Exception as e:
                log_error(f"Error adding diagram to vector database: {e}")

async def main():
    ingester = DiagramIngester()
    
    topics = [
        "tuberculosis",
        "turner_syndrome",
        "trigeminal_neuralgia",
        "colorectal_cancer",
        "lumbar_disc_herniation"
    ]

    for topic in topics:
        try:
            await ingester.process_topic_diagrams(topic)
        except Exception as e:
            log_error(f"Error processing topic {topic}: {e}")
            continue

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())