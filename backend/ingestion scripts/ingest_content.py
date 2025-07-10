# ingest.py
import os
from pathlib import Path
import PyPDF2
from typing import List
from tqdm import tqdm
from vectordb_manager import VectorDBManager
from utils import get_file_paths, log_info, log_error
from constants import TOPICS

def read_pdf_content(pdf_path: str) -> str:
    """Read and extract text from PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        log_error(f"Error reading PDF {pdf_path}: {e}")
        return ""

def ingest_topic_content(db_manager: VectorDBManager, topic: str):
    """Process and ingest content for a topic"""
    log_info(f"\nProcessing topic: {topic}")
    
    # Get paths
    paths = get_file_paths(topic)
    
    # Read PDF content
    content = read_pdf_content(paths["content"])
    if not content:
        log_error(f"No content found for topic: {topic}")
        return
    
    # Add to vector database
    db_manager.add_medical_content(content, topic)
    log_info(f"Completed processing topic: {topic}")

def main():
    # Initialize VectorDB
    db_manager = VectorDBManager(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY")
    )
    
    # Process each topic
    for topic in tqdm(TOPICS, desc="Processing topics"):
        try:
            ingest_topic_content(db_manager, topic)
        except Exception as e:
            log_error(f"Error processing topic {topic}: {e}")
            continue

if __name__ == "__main__":
    main()