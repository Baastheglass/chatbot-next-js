# constants.py
CHUNK_SIZE = 250  # Words per chunk
PAGE_SIZE = 1200  # Words per page
VECTOR_SIZE = 3072  # OpenAI embedding dimension

COLLECTION_NAME = "medical_content"

TOPICS = {
    "tuberculosis": {
        "folder_path": "Data/Tuberculosis",
    },
    "colorectal_cancer": {
        "folder_path": "Data/Colorectal cancer",
    },
    "lumbar_disc_herniation": {
        "folder_path": "Data/Lumber disc herniation",
    },
    "trigeminal_neuralgia": {
        "folder_path": "Data/Trigeminal Neuralgia",
    },
    "turner_syndrome": {
        "folder_path": "Data/Turner syndrome",
    }
}

VALID_TOPICS = {
        "tuberculosis": "tuberculosis",
        "turner_syndrome": "turner syndrome",
        "trigeminal_neuralgia": "trigeminal neuralgia",
        "colorectal_cancer": "colorectal cancer",
        "lumbar_disc_herniation": "lumbar disc herniation"
        
    }