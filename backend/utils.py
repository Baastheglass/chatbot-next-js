# utils.py
import logging
from pathlib import Path
from typing import Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_info(msg: str):
    logger.info(msg)

def log_error(msg: str):
    logger.error(msg)

def get_topic_path(topic: str) -> str:
    """Get the full path for a topic's folder"""
    from constants import TOPICS
    return TOPICS.get(topic, {}).get("folder_path", "")

def get_file_paths(topic: str) -> Dict[str, Path]:
    """Get paths for different file types in a topic folder"""
    base_path = get_topic_path(topic)
    if not base_path:
        return {}
    
    return {
        "content": Path(base_path) / f"{topic}.pdf",
        "diagrams_folder": Path(base_path)
    }